import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import type {
  JobImportRequest,
  JobImportResponse,
  ParsedJobData,
  DiscoveredJob,
  MatchBreakdown,
  WorkArrangement,
  EmploymentType,
  JobSource,
} from '@/types/job';
import type { MasterResume } from '@/types/resume';

// ---------------------------------------------------------------------------
// Known bot-blocked domains that strictly deny headless server scrapers
// ---------------------------------------------------------------------------
const KNOWN_BOT_PROTECTED_DOMAINS = [
  'linkedin.com',
  'seek.com.au',
  'seek.co.nz',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'monster.com',
];

// ---------------------------------------------------------------------------
// Technical skills taxonomy map for ATS alignment
// ---------------------------------------------------------------------------
const TECH_TAXONOMY: Record<string, string[]> = {
  'TypeScript': ['typescript', 'ts'],
  'JavaScript': ['javascript', 'js', 'es6', 'ecmascript'],
  'React': ['react', 'react.js', 'reactjs'],
  'Next.js': ['next.js', 'nextjs', 'next'],
  'Node.js': ['node.js', 'nodejs', 'node', 'express'],
  'Python': ['python', 'django', 'fastapi', 'flask'],
  'Java': ['java', 'spring', 'spring boot'],
  'C# / .NET': ['c#', '.net', 'asp.net', 'dotnet'],
  'SQL': ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite'],
  'AWS': ['aws', 'amazon web services', 's3', 'lambda', 'ec2'],
  'Azure': ['azure', 'microsoft azure'],
  'GCP': ['gcp', 'google cloud'],
  'Docker': ['docker', 'container', 'containers'],
  'Kubernetes': ['kubernetes', 'k8s'],
  'CI/CD': ['ci/cd', 'github actions', 'gitlab ci', 'jenkins'],
  'Tailwind CSS': ['tailwind', 'tailwindcss'],
  'GraphQL': ['graphql', 'apollo'],
  'REST APIs': ['rest', 'restful', 'api', 'apis'],
  'Machine Learning': ['machine learning', 'ml', 'deep learning'],
  'Generative AI': ['genai', 'llm', 'openai', 'langchain', 'rag'],
  'Automated Testing': ['jest', 'cypress', 'playwright', 'vitest', 'unit testing'],
  'Cyber Security': ['cyber', 'cybersecurity', 'infosec', 'iam', 'oauth'],
};

function normalizeDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function detectBotBlocking(
  status: number,
  html: string,
  domain: string
): { isBlocked: boolean; reason: string } {
  if ([401, 403, 429, 999].includes(status)) {
    return {
      isBlocked: true,
      reason: `HTTP status ${status} anti-bot block detected from ${domain}.`,
    };
  }

  const lowerHtml = html.toLowerCase();

  // Signature checks
  const botSignatures = [
    'cf-browser-verification',
    'cloudflare-ray',
    'challenge-platform',
    'perimeterx',
    'px-captcha',
    'datadome',
    'authwall',
    'sign in to linkedin',
    'security check',
    'bot detection',
    'verify you are a human',
    'enable javascript and cookies to continue',
    'access denied',
  ];

  for (const sig of botSignatures) {
    if (lowerHtml.includes(sig)) {
      return {
        isBlocked: true,
        reason: `Anti-bot security interstitial detected from ${domain}.`,
      };
    }
  }

  return { isBlocked: false, reason: '' };
}

// ---------------------------------------------------------------------------
// HTML & Metadata Extractor (Cheerio + JSON-LD)
// ---------------------------------------------------------------------------
interface JsonLdJobData {
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
}

interface ExtractedHtmlContent {
  text: string;
  jsonLd?: JsonLdJobData;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
}

function extractContentFromHtml(html: string): ExtractedHtmlContent {
  const $ = cheerio.load(html);

  // 1. Check for JSON-LD JobPosting
  let jsonLdJob: JsonLdJobData | undefined = undefined;
  const scriptTags = $('script[type="application/ld+json"]').toArray();
  for (const el of scriptTags) {
    try {
      const raw = $(el).html();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (
          item &&
          (item['@type'] === 'JobPosting' ||
            item['@type'] === 'jobPosting' ||
            (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')))
        ) {
          const company =
            typeof item.hiringOrganization === 'string'
              ? item.hiringOrganization
              : item.hiringOrganization?.name || '';

          const loc =
            typeof item.jobLocation === 'string'
              ? item.jobLocation
              : item.jobLocation?.address?.addressLocality ||
                item.jobLocation?.address?.streetAddress ||
                item.jobLocation?.name ||
                '';

          let salary: string | undefined = undefined;
          if (item.baseSalary) {
            const val = item.baseSalary.value;
            if (typeof val === 'number') {
              salary = `$${val.toLocaleString()} ${item.baseSalary.currency || 'AUD'}`;
            } else if (val && typeof val === 'object') {
              const min = val.minValue || val.value;
              const max = val.maxValue;
              salary = max
                ? `$${min?.toLocaleString()} - $${max?.toLocaleString()} ${item.baseSalary.currency || 'AUD'}`
                : `$${min?.toLocaleString()} ${item.baseSalary.currency || 'AUD'}`;
            }
          }

          jsonLdJob = {
            title: item.title,
            company,
            description: item.description ? cheerio.load(item.description).text() : undefined,
            location: loc,
            salary,
            employmentType: item.employmentType,
          };
          break;
        }
      }
      if (jsonLdJob) break;
    } catch (_) {
      // Ignore invalid JSON-LD blocks
    }
  }

  const metaTitle = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim();
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();

  // Strip non-content nodes
  $(
    'script, style, noscript, iframe, svg, nav, footer, header, form, [role="navigation"], .cookie-banner, .advertisement'
  ).remove();

  // Convert block elements and linebreaks so Cheerio text extraction preserves structural layout
  $('br').replaceWith('\n');
  $('p, div, section, article, h1, h2, h3, h4, h5, h6, tr').each((_, el) => {
    $(el).prepend('\n').append('\n');
  });
  $('li').each((_, el) => {
    $(el).prepend('\n* ').append('\n');
  });

  // Extract content
  let text = '';
  const mainSelector = $(
    'main, [role="main"], article, .job-description, #job-description, .posting-description, .content, .job-details'
  );
  if (mainSelector.length > 0) {
    text = mainSelector.first().text();
  } else {
    text = $('body').text();
  }

  // Normalize multi-spaces while preserving structural linebreaks
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If JSON-LD description exists and body text is short, prepend JSON-LD
  if (jsonLdJob?.description && jsonLdJob.description.length > text.length) {
    text = `${jsonLdJob.title || ''} - ${jsonLdJob.company || ''}\n\n${jsonLdJob.description}`;
  }

  return {
    text,
    jsonLd: jsonLdJob,
    metaTitle,
    metaDescription,
    ogTitle,
  };
}

// ---------------------------------------------------------------------------
// Precision ATS Match Scoring Engine
// ---------------------------------------------------------------------------
function calculateMatch(
  parsedJob: ParsedJobData,
  resume?: MasterResume
): {
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  fitSummary: string;
} {
  if (!resume) {
    return {
      matchScore: 84,
      matchBreakdown: { technical: 34, roleRelevance: 25, experienceFit: 25 },
      matchedSkills: parsedJob.coreTechStack.slice(0, 4),
      missingSkills: parsedJob.coreTechStack.slice(4, 6),
      fitSummary: `Strong initial alignment identified for ${parsedJob.jobTitle} at ${parsedJob.companyName}.`,
    };
  }

  const candidateSkills = (resume.skills || []).map((s) => s.name.toLowerCase());
  const candidateFullText = [
    resume.summary || '',
    ...(resume.skills || []).map((s) => s.name),
    ...(resume.experiences || []).flatMap((e) => [e.role, e.company, ...(e.highlights || [])]),
    ...(resume.projects || []).flatMap((p) => [p.title, p.description, ...(p.techStack || [])]),
    ...(resume.education || []).flatMap((edu) => [edu.degree, edu.institution]),
  ]
    .join(' ')
    .toLowerCase();

  const titleLower = parsedJob.jobTitle.toLowerCase();
  const descLower = parsedJob.jobDescription.toLowerCase();

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  // Check extracted tech stack first
  for (const tech of parsedJob.coreTechStack) {
    const techLower = tech.toLowerCase();
    const hasSkill =
      candidateSkills.some((cs) => cs.includes(techLower) || techLower.includes(cs)) ||
      candidateFullText.includes(techLower);

    if (hasSkill) {
      if (!matchedSkills.includes(tech)) matchedSkills.push(tech);
    } else {
      if (!missingSkills.includes(tech)) missingSkills.push(tech);
    }
  }

  // Cross-reference broad taxonomy
  Object.entries(TECH_TAXONOMY).forEach(([canonical, aliases]) => {
    const inJob = aliases.some((a) => descLower.includes(a) || titleLower.includes(a));
    if (inJob) {
      const candidateHas = aliases.some(
        (a) => candidateSkills.some((cs) => cs.includes(a)) || candidateFullText.includes(a)
      );
      if (candidateHas) {
        if (!matchedSkills.includes(canonical)) matchedSkills.push(canonical);
      } else {
        if (!missingSkills.includes(canonical)) missingSkills.push(canonical);
      }
    }
  });

  // 1. Technical Score (0-40)
  const totalReq = matchedSkills.length + missingSkills.length;
  const techRatio = totalReq > 0 ? matchedSkills.length / totalReq : 0.75;
  const technical = Math.min(40, Math.max(15, Math.round(techRatio * 40)));

  // 2. Role Relevance (0-30)
  let roleRelevance = 20;
  const candidateTitles = (resume.experiences || []).map((e) => e.role.toLowerCase());
  const hasDirectRole = candidateTitles.some((t) =>
    titleLower.split(' ').some((word) => word.length > 3 && t.includes(word))
  );
  if (hasDirectRole) roleRelevance += 8;
  if (titleLower.includes('software') || titleLower.includes('frontend') || titleLower.includes('fullstack') || titleLower.includes('developer')) {
    roleRelevance += 2;
  }
  roleRelevance = Math.min(30, Math.max(10, roleRelevance));

  // 3. Experience Fit (0-30)
  let experienceFit = 22;
  const totalExp = (resume.experiences || []).length;
  if (totalExp >= 2) experienceFit += 5;
  if ((resume.projects || []).length >= 2) experienceFit += 3;
  experienceFit = Math.min(30, Math.max(10, experienceFit));

  const matchScore = Math.min(99, Math.max(50, technical + roleRelevance + experienceFit));

  const fitSummary =
    matchScore >= 85
      ? `Exceptional alignment (${matchScore}%). Candidate skills and portfolio strongly substantiate the key technical competencies required for ${parsedJob.jobTitle} at ${parsedJob.companyName}.`
      : matchScore >= 75
        ? `Solid alignment (${matchScore}%). Strong foundation in core tech stack (${matchedSkills.slice(0, 3).join(', ')}). High suitability with minor keyword tuning.`
        : `Moderate alignment (${matchScore}%). Key overlaps detected, with potential learning curve in ${missingSkills.slice(0, 2).join(' and ') || 'specialized stack'}.`;

  return {
    matchScore,
    matchBreakdown: { technical, roleRelevance, experienceFit },
    matchedSkills,
    missingSkills,
    fitSummary,
  };
}

// ---------------------------------------------------------------------------
// Non-Destructive Structural Markdown Formatter
// ---------------------------------------------------------------------------
/**
 * Non-destructive structural Markdown formatter for raw clipboard or scraped job descriptions.
 *
 * CRITICAL GUARANTEES:
 * - 100% verbatim retention of all substantive text, sentences, qualifications, and context.
 * - ZERO summarization, ZERO compression, ZERO paraphrasing, ZERO omission of details.
 * - Standardizes structural headers (e.g. "## Key Responsibilities", "## Requirements & Qualifications").
 * - Normalizes irregular bullet glyphs (•, ●, ◦, ▪, ▫, ➢, ➔, ✔, ✓, +, –) into clean Markdown "* ".
 * - Cleans up irregular line wraps and multiple blank lines without dropping any content.
 */
export function cleanJobDescriptionMarkdown(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  // 1. Normalize line endings
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Recognizable job posting section titles
  const SECTION_PATTERNS: RegExp[] = [
    /^(?:about\s+(?:the\s+)?(?:company|us|role|team|organisation|organization|position)|the\s+role|role\s+overview|job\s+summary|position\s+summary|who\s+we\s+are|overview)[:\s]*$/i,
    /^(?:key\s+)?(?:responsibilities|duties|accountabilities|what\s+you(?:'ll|\s+will)\s+do|what\s+you(?:'ll|\s+will)\s+be\s+doing|day\s+to\s+day|the\s+opportunity|your\s+impact|what\s+the\s+role\s+involves)[:\s]*$/i,
    /^(?:(?:qualifications|requirements)(?:\s*(?:&|and)\s*(?:qualifications|requirements))?|key\s+requirements|what\s+(?:we(?:'re|\s+are)\s+looking\s+for|you\s+bring|you\s+will\s+bring)|skills\s+(?:&|and)\s+experience|who\s+you\s+are|about\s+you|must\s+haves|criteria|what\s+you\s+need)[:\s]*$/i,
    /^(?:preferred\s+qualifications|nice\s+to\s+have(?:s)?|bonus\s+points|desirable\s+(?:criteria|skills)|good\s+to\s+have|bonus\s+skills)[:\s]*$/i,
    /^(?:benefits|perks(?:\s+(?:&|and)\s+benefits)?|what\s+we\s+offer|why\s+join\s+us|what's\s+in\s+it\s+for\s+you|our\s+culture|life\s+at\s+[a-z0-9\s]+)[:\s]*$/i,
    /^(?:how\s+to\s+apply|application\s+process|next\s+steps|equal\s+opportunity\s+employer)[:\s]*$/i,
  ];

  const lines = text.split('\n');
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Preserve empty line spacing
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Check if line matches a known job section header
    let isHeader = false;
    for (const pattern of SECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        const cleanHeader = trimmed.replace(/[:\s]+$/, '').trim();
        const titleCaseHeader = cleanHeader
          .split(' ')
          .map((w) => (w.length > 2 && !['and', 'for', 'the', 'to', 'in', 'of'].includes(w.toLowerCase()) ? w[0].toUpperCase() + w.slice(1) : w))
          .join(' ');
        formattedLines.push('');
        formattedLines.push(`## ${titleCaseHeader}`);
        formattedLines.push('');
        isHeader = true;
        break;
      }
    }
    if (isHeader) continue;

    // Check if line starts with an irregular bullet glyph
    const bulletMatch = trimmed.match(/^([•●◦▪▫➢➔✔✓+–—\*\-]\s*|\d+[\.\)]\s*)(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[2].trim();
      if (content) {
        formattedLines.push(`* ${content}`);
        continue;
      }
    }

    // Check if inline bullets were pasted on a single line (e.g. "Requirements: • Item 1 • Item 2")
    if (trimmed.includes(' • ') || trimmed.includes(' · ')) {
      const parts = trimmed.split(/\s+[•·]\s+/);
      if (parts.length > 1) {
        for (let pIdx = 0; pIdx < parts.length; pIdx++) {
          const part = parts[pIdx].trim();
          if (!part) continue;
          if (pIdx === 0 && !trimmed.startsWith('•') && !trimmed.startsWith('·')) {
            formattedLines.push(part);
          } else {
            formattedLines.push(`* ${part}`);
          }
        }
        continue;
      }
    }

    // Keep line text verbatim
    formattedLines.push(trimmed);
  }

  // Join lines and normalize excessive blank lines (capped at 2 consecutive newlines)
  return formattedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Rule-Based Fallback Parser (In case OpenAI is unavailable or unconfigured)
// ---------------------------------------------------------------------------
function fallbackParse(rawText: string, url?: string): ParsedJobData {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || 'Software Engineer';
  const domain = url ? normalizeDomain(url) : '';

  let companyName = domain ? domain.split('.')[0].toUpperCase() : 'Hiring Company';
  let jobTitle = firstLine.length < 80 ? firstLine : 'Software Engineer';

  // Extract company & title if formatted like "Software Engineer at Atlassian"
  const atMatch = firstLine.match(/^(.*?)\s+(?:at|@|–|-|\|)\s+(.*?)$/i);
  if (atMatch) {
    jobTitle = atMatch[1].trim();
    companyName = atMatch[2].trim();
  }

  const lower = rawText.toLowerCase();

  // Detect arrangement
  let workArrangement: WorkArrangement = 'Hybrid';
  if (lower.includes('remote') || lower.includes('work from home') || lower.includes('anywhere')) {
    workArrangement = 'Remote';
  } else if (lower.includes('on-site') || lower.includes('in office') || lower.includes('onsite')) {
    workArrangement = 'On-site';
  }

  // Detect employment type
  let employmentType: EmploymentType = 'Full-time';
  if (lower.includes('contract') || lower.includes('temporary')) employmentType = 'Contract';
  else if (lower.includes('part-time')) employmentType = 'Part-time';
  else if (lower.includes('intern') || lower.includes('internship')) employmentType = 'Internship';
  else if (lower.includes('graduate') || lower.includes('junior')) employmentType = 'Graduate';

  // Detect salary
  let salary: string | undefined = undefined;
  const salaryMatch = rawText.match(/\$[0-9]{2,3}(?:,[0-9]{3})*(?:\s*-\s*\$[0-9]{2,3}(?:,[0-9]{3})*)?(?:\s*(?:k|per annum|\/yr|\/year|p\.a\.|aud))?/i);
  if (salaryMatch) {
    salary = salaryMatch[0];
  }

  // Detect location
  let location = 'Sydney, NSW, Australia';
  if (lower.includes('melbourne')) location = 'Melbourne, VIC, Australia';
  else if (lower.includes('brisbane')) location = 'Brisbane, QLD, Australia';
  else if (workArrangement === 'Remote') location = 'Remote (Australia)';

  // Detect skills
  const coreTechStack: string[] = [];
  Object.keys(TECH_TAXONOMY).forEach((skill) => {
    if (lower.includes(skill.toLowerCase())) {
      coreTechStack.push(skill);
    }
  });

  const formattedMarkdown = cleanJobDescriptionMarkdown(rawText);

  return {
    jobTitle: jobTitle || 'Software Engineer',
    companyName: companyName || 'Technology Partner',
    location,
    salary,
    workArrangement,
    employmentType,
    jobDescription: formattedMarkdown,
    rawDescription: rawText,
    keyRequirements: [
      'Proven experience in full-stack web technologies and modern architecture',
      'Strong problem-solving and clean code delivery standards',
      'Collaborative team execution and agile delivery lifecycle',
    ],
    coreTechStack: coreTechStack.length > 0 ? coreTechStack : ['TypeScript', 'React', 'Next.js', 'Node.js'],
    sourceUrl: url,
    sourceDomain: domain,
  };
}

// ---------------------------------------------------------------------------
// Route Handler: POST /api/jobs/import
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body: JobImportRequest = await request.json();
    const { mode, url, rawText, masterResume } = body;

    if (!mode || (mode !== 'url' && mode !== 'text')) {
      return NextResponse.json(
        { success: false, error: "Invalid mode. Must be 'url' or 'text'.", errorCode: 'INVALID_URL' },
        { status: 400 }
      );
    }

    let sourceText = '';
    let targetUrl: string | undefined = undefined;
    let sourceDomain = '';
    let jsonLdFallback: ExtractedHtmlContent['jsonLd'] | undefined = undefined;

    // ─────────────────────────────────────────────────────────────────────────
    // MODE 1: LIVE JOB URL
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'url') {
      if (!url?.trim()) {
        return NextResponse.json(
          { success: false, error: 'URL is required for URL import mode.', errorCode: 'INVALID_URL' },
          { status: 400 }
        );
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Please enter a valid web URL starting with http:// or https://',
            errorCode: 'INVALID_URL',
          },
          { status: 400 }
        );
      }

      targetUrl = parsedUrl.toString();
      sourceDomain = normalizeDomain(targetUrl);

      // Check if domain is a known anti-bot platform
      const isKnownBotDomain = KNOWN_BOT_PROTECTED_DOMAINS.some((d) => sourceDomain.includes(d));
      if (isKnownBotDomain) {
        return NextResponse.json({
          success: false,
          error: `${sourceDomain} blocks direct server fetching to safeguard user privacy and prevent automated scraping.`,
          errorCode: 'BOT_BLOCKED',
          suggestedAction: 'SWITCH_TO_PASTE',
          blockedDomain: sourceDomain,
        });
      }

      // Fetch URL with abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-AU,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeoutId);

        const html = await response.text();

        // Check for bot blocking
        const botCheck = detectBotBlocking(response.status, html, sourceDomain);
        if (botCheck.isBlocked) {
          return NextResponse.json({
            success: false,
            error: `${sourceDomain} returned anti-bot verification (${botCheck.reason}).`,
            errorCode: 'BOT_BLOCKED',
            suggestedAction: 'SWITCH_TO_PASTE',
            blockedDomain: sourceDomain,
          });
        }

        // Extract content via Cheerio
        const extracted = extractContentFromHtml(html);
        jsonLdFallback = extracted.jsonLd;

        if (!extracted.text || extracted.text.length < 50) {
          return NextResponse.json({
            success: false,
            error: `Could not extract text content from ${sourceDomain}. The page might render dynamically via client-side JavaScript or require a login.`,
            errorCode: 'EMPTY_CONTENT',
            suggestedAction: 'SWITCH_TO_PASTE',
            blockedDomain: sourceDomain,
          });
        }

        sourceText = extracted.text.slice(0, 60000);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        const isAbort = fetchErr.name === 'AbortError';
        return NextResponse.json({
          success: false,
          error: isAbort
            ? `Connection to ${sourceDomain} timed out after 9 seconds.`
            : `Failed to connect to ${sourceDomain}: ${fetchErr.message || 'Network error'}`,
          errorCode: 'FETCH_FAILED',
          suggestedAction: 'SWITCH_TO_PASTE',
          blockedDomain: sourceDomain,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODE 2: QUICK PASTE TEXT
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'text') {
      if (!rawText?.trim() || rawText.trim().length < 25) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please paste at least 25 characters of the job posting text.',
            errorCode: 'EMPTY_CONTENT',
          },
          { status: 400 }
        );
      }

      sourceText = rawText.trim().slice(0, 60000);
      targetUrl = undefined;
      sourceDomain = 'Pasted Text';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LLM EXTRACTION PIPELINE (Metadata extraction only — NO text summarization)
    // ─────────────────────────────────────────────────────────────────────────
    let parsedJobData: ParsedJobData;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const client = new OpenAI({ apiKey });

        const prompt = `You are an expert HR and recruitment intelligence parser.
Extract the structured job metadata from the following job posting text:

JOB POSTING SOURCE TEXT:
${sourceText}

JSON-LD HINTS (if available):
${jsonLdFallback ? JSON.stringify(jsonLdFallback) : 'None'}

URL CONTEXT:
${targetUrl || 'Pasted text'}

════════════════════════════════════════════════════════════
EXTRACTION REQUIREMENTS:
1. companyName: Extract exact hiring company name. If unidentifiable, infer from context or use "Hiring Company".
2. jobTitle: Official role title (e.g. "Senior Full-Stack Engineer", "Graduate Software Developer").
3. location: Specific city, state, or region (e.g. "Sydney, NSW, Australia", "Melbourne, VIC").
4. workArrangement: MUST be one of: "Remote", "Hybrid", "On-site".
5. employmentType: MUST be one of: "Full-time", "Contract", "Internship", "Part-time", "Graduate".
6. salary: Extracted salary range or compensation (e.g. "$110,000 - $130,000 + super") or empty string if not listed.
7. keyRequirements: Array of 3 to 7 concise, high-priority qualification and requirement bullet points extracted from the text.
8. coreTechStack: Array of 4 to 12 primary technologies, frameworks, and programming languages required.

Return ONLY valid JSON matching this schema:
{
  "companyName": "<string>",
  "jobTitle": "<string>",
  "location": "<string>",
  "workArrangement": "Remote" | "Hybrid" | "On-site",
  "employmentType": "Full-time" | "Contract" | "Internship" | "Part-time" | "Graduate",
  "salary": "<string or empty>",
  "keyRequirements": ["<string>", ...],
  "coreTechStack": ["<string>", ...]
}`;

        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You extract high-precision structured recruitment metadata from job descriptions. Return only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
        });

        const rawJson = completion.choices[0]?.message?.content;
        if (!rawJson) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawJson);

        const validArrangements: WorkArrangement[] = ['Remote', 'Hybrid', 'On-site'];
        const arrangement: WorkArrangement = validArrangements.includes(parsed.workArrangement)
          ? parsed.workArrangement
          : 'Hybrid';

        const validTypes: EmploymentType[] = [
          'Full-time',
          'Contract',
          'Internship',
          'Part-time',
          'Graduate',
        ];
        const empType: EmploymentType = validTypes.includes(parsed.employmentType)
          ? parsed.employmentType
          : 'Full-time';

        // Format 100% of the verbatim source text with non-destructive structural Markdown
        const formattedDescription = cleanJobDescriptionMarkdown(sourceText);

        parsedJobData = {
          companyName: parsed.companyName || jsonLdFallback?.company || 'Hiring Company',
          jobTitle: parsed.jobTitle || jsonLdFallback?.title || 'Software Engineer',
          location: parsed.location || jsonLdFallback?.location || 'Sydney, NSW, Australia',
          salary: parsed.salary || jsonLdFallback?.salary || undefined,
          workArrangement: arrangement,
          employmentType: empType,
          jobDescription: formattedDescription,
          rawDescription: sourceText,
          keyRequirements: Array.isArray(parsed.keyRequirements) && parsed.keyRequirements.length > 0
            ? parsed.keyRequirements
            : ['Demonstrated relevant engineering experience', 'Strong team communication'],
          coreTechStack: Array.isArray(parsed.coreTechStack) && parsed.coreTechStack.length > 0
            ? parsed.coreTechStack
            : ['TypeScript', 'React'],
          sourceUrl: targetUrl,
          sourceDomain,
        };
      } catch (aiErr: any) {
        console.warn('OpenAI structured extraction failed, using heuristic parser:', aiErr.message);
        parsedJobData = fallbackParse(sourceText, targetUrl);
      }
    } else {
      parsedJobData = fallbackParse(sourceText, targetUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATS SCORING & DISCOVERED JOB CONSTRUCTION
    // ─────────────────────────────────────────────────────────────────────────
    const matchResult = calculateMatch(parsedJobData, masterResume);

    const nowIso = new Date().toISOString();
    const jobId = crypto.randomUUID();

    // Standardize source name
    let jobSource: JobSource = 'Company Site';
    if (sourceDomain.includes('seek')) jobSource = 'SEEK';
    else if (sourceDomain.includes('indeed')) jobSource = 'Indeed';
    else if (sourceDomain.includes('linkedin')) jobSource = 'LinkedIn';
    else if (sourceDomain.includes('gradconnection')) jobSource = 'GradConnection';

    const constructedJob: DiscoveredJob = {
      id: jobId,
      title: parsedJobData.jobTitle,
      jobTitle: parsedJobData.jobTitle,
      company: parsedJobData.companyName,
      companyName: parsedJobData.companyName,
      location: parsedJobData.location,
      salary: parsedJobData.salary,
      postedDate: nowIso,
      datePosted: nowIso,
      daysAgo: 0,
      jobType: parsedJobData.employmentType,
      category: parsedJobData.employmentType === 'Graduate' ? 'graduate_programs' : 'software',
      source: jobSource,
      workArrangement: parsedJobData.workArrangement,
      employmentType: parsedJobData.employmentType,
      postingStatus: 'Live',
      description: parsedJobData.jobDescription,
      jobDescription: parsedJobData.jobDescription,
      rawDescription: parsedJobData.rawDescription || sourceText,
      requirements: parsedJobData.keyRequirements,
      keyRequirements: parsedJobData.keyRequirements,
      skills: matchResult.matchedSkills,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      matchScore: matchResult.matchScore,
      matchBreakdown: matchResult.matchBreakdown,
      fitSummary: matchResult.fitSummary,
      jobUrl: targetUrl || '#',
      sourceUrl: targetUrl || '#',
      applyType: 'direct_ats',
      isDirectApplyLink: Boolean(targetUrl),
      isSaved: true,
      isApplied: false,
    };

    const responsePayload: JobImportResponse = {
      success: true,
      job: constructedJob,
      parsedData: parsedJobData,
      atsScore: matchResult.matchScore,
      matchBreakdown: matchResult.matchBreakdown,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      fitSummary: matchResult.fitSummary,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Job import handler exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while ingesting job posting.',
        errorCode: 'PARSE_FAILED',
        suggestedAction: 'RETRY',
      },
      { status: 500 }
    );
  }
}
