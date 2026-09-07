import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type { ResumeVersion, SkillItem, SkillCategory, MasterResume } from '@/types';
import type { TailorRequest, CoverLetterResult, TailorResult } from '@/types/tailor';

export type { TailorRequest, CoverLetterResult, TailorResult };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of new skills that may be appended across all categories. */
const MAX_NEW_SKILLS = 4;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body: TailorRequest = await request.json();
    const {
      jobDescription,
      currentResume,
      candidateName = 'Candidate',
      candidateEmail = '',
      candidatePhone = '',
      targetCompany: userTargetCompany = '',
      targetRole: userTargetRole = '',
      generateCoverLetter = true,
    } = body;

    if (!jobDescription?.trim()) {
      return Response.json({ error: 'jobDescription is required' }, { status: 400 });
    }
    if (!currentResume) {
      return Response.json({ error: 'currentResume is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    // -----------------------------------------------------------------------
    // System prompt — conservative, high-precision tailoring rules
    // -----------------------------------------------------------------------
    const coverLetterSchema = generateCoverLetter
      ? `,
  "coverLetter": {
    "opening": "<string: MUST start with 'Dear [Company Name] Team,' — e.g. 'Dear Canva Team,' — use 'Dear Hiring Team,' ONLY if company is completely unidentifiable>",
    "body": "<string: EXACTLY 4 substantial, narrative paragraphs separated by double newlines (\\n\\n). TOTAL BODY WORD COUNT MUST BE BETWEEN 350 AND 450 WORDS (~85-110 words per paragraph):\\n\\nParagraph 1 (Hook & Alignment): Express genuine, informed motivation for the role at [Company Name]. Reference the company's product, mission, or technical challenges mentioned in the JD. Present candidate thesis: how their technical foundation aligns directly with team objectives.\\n\\nParagraph 2 (Technical & Execution Proof 1): Detail a concrete technical accomplishment from candidate's resume that maps directly to the JD's primary tech stack. Use STAR/XYZ framing (action taken, tools used, and quantified outcomes such as % performance boost, test coverage, or throughput).\\n\\nParagraph 3 (Domain & Product Impact 2): Highlight a second distinct accomplishment demonstrating end-to-end ownership, robust problem-solving, architectural design, or cross-functional delivery directly relevant to the role's responsibilities.\\n\\nParagraph 4 (Confident Close & Value Proposition): Synthesize candidate value proposition, express eagerness to contribute to upcoming team roadmaps, and provide a professional, proactive call to action inviting an interview conversation.>",
    "closing": "<string: 'Sincerely,\\n${candidateName}'>",
    "fullText": "<string: assembled full letter — opening + double newline + body + double newline + closing>"
  }`
      : '';

    const systemPrompt = `You are an elite career strategist and executive ATS resume and cover letter architect.
Your ONLY permitted modifications to the candidate's resume are listed below.
Everything else must be carried over COMPLETELY UNCHANGED.

════════════════════════════════════════════════════════════
STRICT IMMUTABILITY RULES FOR RESUME — VIOLATIONS NOT ACCEPTABLE
════════════════════════════════════════════════════════════
• DO NOT rewrite, shorten, paraphrase, or alter any Work Experience entry.
• DO NOT modify Job Titles, Company Names, Employment Dates, or Location fields.
• DO NOT rewrite, shorten, or alter any Project description or Project title.
• DO NOT remove, reorder, or modify any existing Skill.
• DO NOT add filler text, disclaimers, or commentary to any field.
• Carry over ALL Work Experience entries and ALL Projects 100% verbatim.

════════════════════════════════════════════════════════════
STRICT 1-PAGE A4 ATS LENGTH BUDGETING RULES
════════════════════════════════════════════════════════════
• The resume MUST fit completely on a single A4 page (210mm x 297mm) without spilling onto page two.
• PROFESSIONAL SUMMARY: Strictly capped to 3–4 lines maximum (40–60 words). Keep it punchy, metric-driven, and keyword-aligned.
• WORK EXPERIENCE BULLETS: Target maximum 3–4 high-impact, keyword-rich bullet points for recent roles; maximum 2 bullets for older roles.
• TECHNICAL SKILLS: Concise inline categories with maximum 2–4 high-impact additions.

════════════════════════════════════════════════════════════
ALLOWED RESUME TAILORING SCOPE (exhaustive — nothing else)
════════════════════════════════════════════════════════════
1. PROFESSIONAL SUMMARY (strictly max 3–4 sentences, 40–60 words):
   Re-align the existing summary to incorporate the most targeted keywords
   from the job description naturally. Stay entirely truthful to the
   candidate's actual background. Do not invent experience or achievements.

2. TECHNICAL SKILLS — APPEND ONLY (2–4 items total across ALL categories):
   Identify 2–4 high-relevance technical skills (languages, frameworks,
   cloud/databases, tools) that appear in the JD and are NOT already in
   the candidate's skill list. Return ONLY those additions; do NOT echo
   back existing skills in the extraSkills arrays.
   Respect the limit strictly — quality over quantity.

3. ATS ANALYSIS:
   Compute an accurate atsScore (0–100) reflecting how well the original
   resume aligns with the JD after the above edits.
   List matched keywords and missing keywords precisely.

════════════════════════════════════════════════════════════
COVER LETTER MANDATE (WHEN REQUESTED)
════════════════════════════════════════════════════════════
• LENGTH CONSTRAINT: Strictly 350 to 450 words total in the body (2/3 to 3/4 of an A4 page).
• STRUCTURE: Exactly 4 cohesive narrative paragraphs separated by \\n\\n:
  1. Hook & Alignment: Authentic motivation, company mission/product, role thesis.
  2. Technical Proof 1: Core tech stack mastery with quantified STAR/XYZ metrics.
  3. Domain Impact 2: Architecture, ownership, collaboration, problem-solving proof.
  4. Confident Close: Clear value proposition, immediate ramp-up promise, interview CTA.
• TONE: Professional, articulate, confident, and deeply grounded in real candidate achievements.

════════════════════════════════════════════════════════════
OUTPUT SCHEMA — return ONLY valid JSON, no markdown fences
════════════════════════════════════════════════════════════
{
  "extractedCompany": "<string: company name or empty string>",
  "extractedRole": "<string: exact job title/role extracted from JD, e.g. 'Data Analytics Graduate' or 'Senior Cloud Engineer'>",
  "atsScore": <integer 0–100>,
  "matchedKeywords": <string[] — JD keywords already present in the resume>,
  "missingKeywords": <string[] — important JD keywords absent from the resume>,
  "tailoredSummary": "<string: updated professional summary, 3–4 sentences max>",
  "extraSkills": {
    "languages":    <string[] — NEW languages only, not already in resume; empty array if none>,
    "frameworks":   <string[] — NEW frameworks/libraries only; empty array if none>,
    "cloudAndData": <string[] — NEW cloud/DB/data tools only; empty array if none>,
    "tools":        <string[] — NEW methodologies/platforms/tools only; empty array if none>
  },
  "changesSummary": <string[] — concise list of every modification made, e.g. ["Updated professional summary to incorporate React Native and CI/CD keywords", "Appended 2 technical skills: Kotlin, Terraform"]>${coverLetterSchema}
}`;

    // -----------------------------------------------------------------------
    // User prompt — pass full resume JSON as ground truth
    // -----------------------------------------------------------------------
    const userPrompt = `JOB DESCRIPTION:
${jobDescription}

CANDIDATE MASTER RESUME (JSON — treat as immutable ground truth):
${JSON.stringify(currentResume, null, 2)}

Candidate name: ${candidateName}
Candidate contact: ${[candidateEmail, candidatePhone].filter(Boolean).join(' | ')}
Target company (provided by user): ${userTargetCompany || '(extract from job description)'}
Target role (provided by user): ${userTargetRole || '(extract from job description)'}

Apply ONLY the permitted tailoring edits and return the complete JSON output.`;

    // -----------------------------------------------------------------------
    // AI call
    // -----------------------------------------------------------------------
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.15,          // Lower temperature → more conservative, deterministic output
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return Response.json({ error: 'Empty response from OpenAI' }, { status: 502 });
    }

    const parsed = JSON.parse(raw);

    // -----------------------------------------------------------------------
    // Resolve company name and target role
    // -----------------------------------------------------------------------
    const resolvedCompany =
      userTargetCompany.trim() ||
      (parsed.extractedCompany ? String(parsed.extractedCompany).trim() : '') ||
      'Company';

    const resolvedRole =
      userTargetRole.trim() ||
      (parsed.extractedRole ? String(parsed.extractedRole).trim() : '') ||
      'Target Position';

    // -----------------------------------------------------------------------
    // Enforce cover letter salutation & subject line — server-side override
    // -----------------------------------------------------------------------
    if (parsed.coverLetter) {
      const targetSalutation =
        resolvedCompany !== 'Company'
          ? `Dear ${resolvedCompany} Team,`
          : 'Dear Hiring Team,';
      parsed.coverLetter.opening = targetSalutation;
      parsed.coverLetter.fullText = `${targetSalutation}\n\n${parsed.coverLetter.body}\n\n${parsed.coverLetter.closing}`;
      parsed.coverLetter.wordCount = parsed.coverLetter.body.trim().split(/\s+/).filter(Boolean).length;
      parsed.coverLetter.targetCompany = resolvedCompany;
      parsed.coverLetter.targetRole = resolvedRole;
      parsed.coverLetter.subject = `Re: Application for ${resolvedRole} – ${resolvedCompany}`;
    }

    // -----------------------------------------------------------------------
    // Build extra skills — enforce MAX_NEW_SKILLS cap and de-duplicate
    // against the original resume.  This is the server-side safety net that
    // ensures the AI cannot sneak in more than the allowed number of skills
    // even if the prompt rule is ignored.
    // -----------------------------------------------------------------------
    const originalResume = currentResume as MasterResume;
    const existingSkillNames = new Set(
      (originalResume.skills || []).map((s) => s.name.toLowerCase()),
    );

    const candidateNewSkills: Array<{ name: string; category: SkillCategory }> = [
      ...(parsed.extraSkills?.languages || []).map((s: string) => ({
        name: s,
        category: 'Languages' as SkillCategory,
      })),
      ...(parsed.extraSkills?.frameworks || []).map((s: string) => ({
        name: s,
        category: 'Frameworks' as SkillCategory,
      })),
      ...(parsed.extraSkills?.cloudAndData || []).map((s: string) => ({
        name: s,
        category: 'Cloud & DB' as SkillCategory,
      })),
      ...(parsed.extraSkills?.tools || []).map((s: string) => ({
        name: s,
        category: 'Tools & Other' as SkillCategory,
      })),
    ];

    const newSkillItems: SkillItem[] = [];
    const approvedNewSkillNames = {
      languages: [] as string[],
      frameworks: [] as string[],
      cloudAndData: [] as string[],
      tools: [] as string[],
    };

    for (const { name, category } of candidateNewSkills) {
      if (newSkillItems.length >= MAX_NEW_SKILLS) break;

      const clean = String(name || '').trim();
      if (!clean || existingSkillNames.has(clean.toLowerCase())) continue;

      existingSkillNames.add(clean.toLowerCase());
      newSkillItems.push({
        id: `sk-extra-${crypto.randomUUID().slice(0, 8)}`,
        name: clean,
        category,
        proficiency: 'Intermediate',
      });

      // Track per-category for the extraSkills output field
      if (category === 'Languages') approvedNewSkillNames.languages.push(clean);
      else if (category === 'Frameworks') approvedNewSkillNames.frameworks.push(clean);
      else if (category === 'Cloud & DB') approvedNewSkillNames.cloudAndData.push(clean);
      else approvedNewSkillNames.tools.push(clean);
    }

    // -----------------------------------------------------------------------
    // Build the complete ResumeVersion — experiences, projects, education, and
    // all original skills are taken DIRECTLY from the original resume object,
    // guaranteeing 100% fidelity regardless of what the AI returned.
    // -----------------------------------------------------------------------
    const nowIso = new Date().toISOString();
    const atsScore = typeof parsed.atsScore === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.atsScore)))
      : 0;

    const completeTailoredResume: ResumeVersion = {
      id: crypto.randomUUID(),
      title:
        resolvedCompany !== 'Company'
          ? `${resolvedCompany} Application – Tailored Resume`
          : 'Tailored Resume',
      isMaster: false,
      targetJobTitle:
        resolvedCompany !== 'Company' ? `Role at ${resolvedCompany}` : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      matchScore: atsScore,

      // ── Modified fields (within allowed scope) ──────────────────────────
      summary: parsed.tailoredSummary || originalResume.summary || '',
      skills: [
        ...(originalResume.skills || []),   // ALL original skills, untouched
        ...newSkillItems,                    // ≤ MAX_NEW_SKILLS appended skills
      ],

      // ── Immutable fields — budgeted for 1-page A4 ATS compliance ──────────
      experiences: (originalResume.experiences || []).map((exp, idx) => ({
        ...exp,
        highlights:
          idx === 0
            ? (exp.highlights || []).slice(0, 4)
            : idx === 1
            ? (exp.highlights || []).slice(0, 3)
            : (exp.highlights || []).slice(0, 2),
      })),
      education:   originalResume.education   || [],
      projects:    originalResume.projects    || [],

      // ── Metadata fields ─────────────────────────────────────────────────
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
    };

    // -----------------------------------------------------------------------
    // Build changesSummary — fall back to a generated list if the AI omitted it
    // -----------------------------------------------------------------------
    let changesSummary: string[] = [];

    if (Array.isArray(parsed.changesSummary) && parsed.changesSummary.length > 0) {
      changesSummary = parsed.changesSummary.map(String);
    } else {
      // Generate a minimal summary from what we know was changed
      changesSummary.push('Updated professional summary to align with job description keywords');
      if (newSkillItems.length > 0) {
        changesSummary.push(
          `Appended ${newSkillItems.length} technical skill${newSkillItems.length > 1 ? 's' : ''}: ${newSkillItems.map((s) => s.name).join(', ')}`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // Assemble and return the final structured result
    // -----------------------------------------------------------------------
    const finalResult: TailorResult = {
      tailoredResume: completeTailoredResume,
      coverLetter: parsed.coverLetter,
      atsScore,
      matchedKeywords: completeTailoredResume.matchedKeywords ?? [],
      missingKeywords: completeTailoredResume.missingKeywords ?? [],
      changesSummary,
      extractedCompany: resolvedCompany,
      extractedRole: resolvedRole,
      extraSkills: approvedNewSkillNames,
    };

    return Response.json(finalResult);
  } catch (err: unknown) {
    console.error('[/api/tailor] error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
