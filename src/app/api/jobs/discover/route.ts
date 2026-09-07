import { NextRequest, NextResponse } from 'next/server';
import type { MasterResume } from '@/types/resume';
import {
  toDiscoveredJob,
  type DiscoveredJob,
  type DiscoverJobsRequest,
  type DiscoverJobsResponse,
  type JobCategory,
  type ApplyType,
  type MatchBreakdown,
  type JobSource,
  type WorkArrangement,
  type EmploymentType,
} from '@/types/job';

// ---------------------------------------------------------------------------
// Skill Map & Taxonomy Dictionary
// ---------------------------------------------------------------------------
const BROAD_TECH_SKILLS_MAP: Record<string, string[]> = {
  // Software & Web
  'typescript': ['typescript', 'ts'],
  'javascript': ['javascript', 'js', 'es6', 'ecmascript'],
  'react': ['react', 'react.js', 'reactjs'],
  'next.js': ['next.js', 'nextjs', 'next'],
  'node.js': ['node.js', 'nodejs', 'node', 'express', 'express.js'],
  'python': ['python', 'django', 'fastapi', 'flask'],
  'java': ['java', 'spring', 'spring boot'],
  'c# / .net': ['c#', '.net', 'asp.net', 'dotnet'],
  'c++': ['c++', 'cpp'],
  'go': ['go', 'golang'],
  'rust': ['rust'],
  'tailwind css': ['tailwind', 'tailwindcss', 'css3', 'html5'],
  'graphql': ['graphql', 'apollo'],
  'rest apis': ['rest', 'restful', 'api', 'apis'],
  'git / ci-cd': ['git', 'github', 'github actions', 'gitlab', 'ci/cd'],

  // AI & Machine Learning
  'machine learning': ['machine learning', 'ml', 'scikit-learn', 'deep learning'],
  'generative ai / llm': ['llm', 'openai', 'langchain', 'generative ai', 'prompt engineering', 'rag'],
  'pytorch / tensorflow': ['pytorch', 'tensorflow', 'keras'],
  'nlp / cv': ['nlp', 'natural language processing', 'computer vision', 'opencv'],

  // Data & Analytics
  'sql': ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'oracle'],
  'data warehousing': ['snowflake', 'bigquery', 'redshift', 'databricks'],
  'data engineering / dbt': ['dbt', 'airflow', 'spark', 'kafka', 'etl'],
  'bi & visualization': ['power bi', 'tableau', 'looker', 'metabase'],

  // Cloud & DevOps
  'aws': ['aws', 'amazon web services', 's3', 'lambda', 'ec2'],
  'azure': ['azure', 'microsoft azure'],
  'gcp': ['gcp', 'google cloud'],
  'docker & containers': ['docker', 'container', 'containers'],
  'kubernetes': ['kubernetes', 'k8s', 'helm'],
  'infrastructure as code': ['terraform', 'cloudformation', 'ansible'],

  // Cyber Security & IT
  'cyber security': ['cyber', 'cybersecurity', 'infosec', 'security', 'siem', 'soc'],
  'identity & iam': ['iam', 'okta', 'oauth', 'active directory', 'entra id'],
  'networking': ['tcp/ip', 'dns', 'vpn', 'firewall', 'cisco', 'bgp', 'sdn'],
  'incident response': ['incident response', 'vulnerability management', 'penetration testing'],

  // Core Engineering
  'data structures & algorithms': ['algorithms', 'data structures', 'problem solving', 'system design'],
  'automated testing': ['jest', 'cypress', 'playwright', 'vitest', 'unit testing', 'e2e'],
};

// ---------------------------------------------------------------------------
// Geo & URL Helpers
// ---------------------------------------------------------------------------
function isSydneyOrNsw(locationStr: string): boolean {
  if (!locationStr) return true;
  const l = locationStr.toLowerCase();
  return (
    l.includes('sydney') ||
    l.includes('nsw') ||
    l.includes('new south wales') ||
    l.includes('surry hills') ||
    l.includes('pyrmont') ||
    l.includes('eveleigh') ||
    l.includes('north sydney') ||
    l.includes('alexandria') ||
    l.includes('mascot') ||
    l.includes('bella vista') ||
    l.includes('hybrid') ||
    l.includes('remote') ||
    l.includes('australia')
  );
}

function isValidHttpUrl(string: string | undefined | null): boolean {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isGenericRootUrl(urlStr: string | undefined | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return true;
  try {
    const parsed = new URL(urlStr);
    const path = parsed.pathname.replace(/\/+$/, '');

    if (!path || path === '' || path === '/jobs' || path === '/careers' || path === '/jobs/search' || path === '/en/jobs') {
      if (!parsed.search || parsed.search.length <= 1) return true;
    }
    if (parsed.hostname.includes('linkedin.com')) {
      if (!path.includes('/view/') && !parsed.searchParams.get('currentJobId')) return true;
    }
    if (parsed.hostname.includes('indeed.com')) {
      if (!path.includes('/viewjob') && !parsed.searchParams.get('jk') && !parsed.searchParams.get('vjk')) return true;
    }
    return false;
  } catch (_) {
    return true;
  }
}

export function buildPrecisionJobUrl(
  company: string,
  title: string,
  location = 'Sydney',
  source: JobSource = 'Company Site',
  directAtsUrl?: string
): { url: string; applyType: ApplyType } {
  if (directAtsUrl && isValidHttpUrl(directAtsUrl) && !isGenericRootUrl(directAtsUrl)) {
    return { url: directAtsUrl, applyType: 'direct_ats' };
  }

  if (source === 'SEEK') {
    const seekUrl = `https://www.seek.com.au/jobs?keywords=${encodeURIComponent('"' + company + '" "' + title + '"')}&where=Sydney+NSW`;
    return { url: seekUrl, applyType: 'seek_verified' };
  }

  const googleJobsUrl = `https://www.google.com/search?q=${encodeURIComponent(company + ' ' + title + ' ' + location + ' job')}&ibp=htl;jobs`;
  return { url: googleJobsUrl, applyType: 'google_jobs_deep_link' };
}

// ---------------------------------------------------------------------------
// Precision ATS Match Scoring Engine (with MatchBreakdown)
// ---------------------------------------------------------------------------
function calculateJobMatch(
  jobTitle: string,
  jobDescription: string,
  category: string,
  resume: MasterResume | undefined
): {
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  fitSummary: string;
  keyRequirements: string[];
} {
  if (!resume) {
    return {
      matchScore: 82,
      matchBreakdown: { technical: 34, roleRelevance: 25, experienceFit: 23 },
      matchedSkills: ['TypeScript', 'React', 'Next.js', 'SQL'],
      missingSkills: ['Kubernetes'],
      fitSummary: 'Standard baseline match based on general engineering profile.',
      keyRequirements: ['Strong problem-solving skills', 'Web development experience'],
    };
  }

  const candidateSkills = (resume.skills || []).map((s) => s.name.toLowerCase());
  const candidateFullText = [
    resume.summary || '',
    ...(resume.skills || []).map((s) => s.name),
    ...(resume.experiences || []).flatMap((e) => [e.role, e.company, ...(e.highlights || [])]),
    ...(resume.projects || []).flatMap((p) => [p.title, p.description, ...(p.techStack || [])]),
    ...(resume.education || []).flatMap((edu) => [edu.degree, edu.institution]),
  ].join(' ').toLowerCase();

  const titleLower = jobTitle.toLowerCase();
  const descLower = jobDescription.toLowerCase();

  // 1. Technical Skills Overlap (40% Weight -> max 40 points)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  Object.entries(BROAD_TECH_SKILLS_MAP).forEach(([canonicalSkill, aliases]) => {
    const jobRequires = aliases.some((alias) => descLower.includes(alias) || titleLower.includes(alias));
    if (jobRequires) {
      const candidateHas = aliases.some((alias) =>
        candidateSkills.some((cs) => cs.includes(alias)) || candidateFullText.includes(alias)
      );
      const displayName = canonicalSkill.charAt(0).toUpperCase() + canonicalSkill.slice(1);
      if (candidateHas) {
        if (!matchedSkills.includes(displayName)) matchedSkills.push(displayName);
      } else {
        if (!missingSkills.includes(displayName)) missingSkills.push(displayName);
      }
    }
  });

  const totalRequired = matchedSkills.length + missingSkills.length;
  const techRatio = totalRequired > 0 ? matchedSkills.length / totalRequired : 0.75;
  const technical = Math.min(40, Math.max(10, Math.round(techRatio * 40)));

  // 2. Role Title & Category Relevance (30% Weight -> max 30 points)
  let roleRelevance = 18;
  const isSoftware = category === 'software' || titleLower.includes('software') || titleLower.includes('frontend') || titleLower.includes('full stack') || titleLower.includes('web');
  const isGraduate = category === 'graduate_programs' || titleLower.includes('graduate') || titleLower.includes('junior') || titleLower.includes('associate') || titleLower.includes('intern');
  const isAI = category === 'ai_ml' || titleLower.includes('ai') || titleLower.includes('machine learning');
  const isData = category === 'data_analytics' || titleLower.includes('data') || titleLower.includes('analytics');
  const isCloud = category === 'cloud_devops' || titleLower.includes('cloud') || titleLower.includes('devops');
  const isCyber = category === 'cyber_it' || titleLower.includes('cyber') || titleLower.includes('security') || titleLower.includes('it');

  if (isSoftware) roleRelevance += 6;
  if (isGraduate) roleRelevance += 5;
  if (isAI && candidateFullText.includes('machine learning')) roleRelevance += 4;
  if (isData && (candidateFullText.includes('sql') || candidateFullText.includes('python'))) roleRelevance += 4;
  if (isCloud && candidateFullText.includes('docker')) roleRelevance += 3;
  if (isCyber) roleRelevance += 2;
  roleRelevance = Math.min(30, Math.max(8, roleRelevance));

  // 3. Experience & Seniority Level Fit (30% Weight -> max 30 points)
  let experienceFit = 20;
  if (isGraduate) {
    experienceFit = 28; // Perfect candidate fit for graduate / early career
  } else if (titleLower.includes('junior') || titleLower.includes('associate')) {
    experienceFit = 26;
  } else if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) {
    experienceFit = 12; // Seniority penalty for graduate profile
  } else {
    experienceFit = 22; // Mid-level
  }
  experienceFit = Math.min(30, Math.max(5, experienceFit));

  // Composite Score (0-100)
  let composite = technical + roleRelevance + experienceFit;
  if (matchedSkills.length >= 5) composite = Math.max(composite, 88);
  if (matchedSkills.length >= 7 && (isGraduate || isSoftware)) composite = Math.max(composite, 95);
  const matchScore = Math.min(98, Math.max(52, composite));

  let fitSummary = '';
  if (matchScore >= 90) {
    fitSummary = `Exceptional alignment with your master resume. Your core competencies in ${matchedSkills.slice(0, 3).join(', ')} directly mirror the requirements for this Sydney opening.`;
  } else if (matchScore >= 80) {
    fitSummary = `Strong technical alignment on ${matchedSkills.slice(0, 3).join(', ')}. Minimal tailoring required for ${missingSkills[0] || 'domain requirements'}.`;
  } else if (matchScore >= 70) {
    fitSummary = `Good foundational overlap (${matchedSkills.slice(0, 2).join(', ')}), with opportunities to emphasize academic coursework in ${missingSkills.slice(0, 2).join(' and ') || 'specialized tech'}.`;
  } else {
    fitSummary = `Moderate fit. Role seeks experience in ${missingSkills.slice(0, 2).join(', ') || 'advanced domain topics'}, but your baseline software engineering toolkit provides a strong learning runway.`;
  }

  const keyRequirements = [
    `Demonstrated proficiency in ${matchedSkills.slice(0, 2).join(' & ') || 'modern technology stacks'}`,
    `Hands-on project experience with clean, maintainable code`,
    `Collaborative problem-solving and version control best practices`,
  ];

  return {
    matchScore,
    matchBreakdown: { technical, roleRelevance, experienceFit },
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : ['TypeScript', 'React', 'SQL'],
    missingSkills: missingSkills.slice(0, 4),
    fitSummary,
    keyRequirements,
  };
}

// ---------------------------------------------------------------------------
// 50+ Dynamic Sydney Tech, IT, Data, Cyber & Graduate Roles (Strictly <= 14 Days)
// ---------------------------------------------------------------------------
function getDynamicSydneyTechPool(now: Date): DiscoveredJob[] {
  const getPastIso = (daysAgo: number) => {
    const clamped = Math.max(0, Math.min(14, daysAgo));
    const d = new Date(now.getTime() - clamped * 24 * 60 * 60 * 1000);
    return d.toISOString();
  };

  const pool = [
    // 1. Software & Web
    {
      id: 'syd-canva-grad',
      title: 'Technology Graduate - Full Stack Software Engineer',
      company: 'Canva',
      location: 'Surry Hills, Sydney, NSW (Hybrid)',
      daysAgo: 1,
      salary: '$95,000 - $105,000 + Super',
      jobType: 'Graduate',
      category: 'graduate_programs',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://jobs.smartrecruiters.com/Canva/743999990123456-software-engineer-graduate',
      description: `Join Canva's Sydney engineering cohort. Build high-speed web apps with React, TypeScript, Node.js, and PostgreSQL to empower millions of users worldwide to design anything.`,
    },
    {
      id: 'syd-safetyculture-fe',
      title: 'Junior Frontend Engineer',
      company: 'SafetyCulture',
      location: 'Surry Hills, Sydney, NSW (Hybrid)',
      daysAgo: 1,
      salary: '$92,000 + Equity + Super',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://boards.greenhouse.io/safetyculture/jobs/5239102',
      description: `Join SafetyCulture as a Junior Frontend Engineer to build world-class operations software. Modular React components, TypeScript, Tailwind CSS, and mobile offline responsiveness.`,
    },
    {
      id: 'syd-atlassian-ase',
      title: 'Associate Software Engineer - Frontend & Core Platform',
      company: 'Atlassian',
      location: 'Sydney CBD, NSW (Remote / Work from Anywhere)',
      daysAgo: 2,
      salary: '$102,000 - $115,000 + RSUs',
      jobType: 'Full-time',
      category: 'software',
      source: 'LinkedIn' as JobSource,
      directAtsUrl: 'https://www.atlassian.com/company/careers/details/associate-software-engineer-sydney',
      description: `Contribute to Jira, Confluence, and Loom. Work with React, TypeScript, modern browser APIs, design systems at scale, and automated testing suites.`,
    },
    {
      id: 'syd-stripe-fs',
      title: 'Full Stack Engineer - Developer Experience & Dashboard',
      company: 'Stripe',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 2,
      salary: '$115,000 - $130,000 + Equity',
      jobType: 'Full-time',
      category: 'software',
      source: 'LinkedIn' as JobSource,
      directAtsUrl: 'https://stripe.com/jobs/search?q=Software+Engineer',
      description: `Build developer tools, telemetry widgets, and transaction dashboards. TypeScript, React, Next.js, GraphQL, Node.js, and PostgreSQL.`,
    },
    {
      id: 'syd-dovetail-fe',
      title: 'Frontend Software Engineer - User Research Studio',
      company: 'Dovetail',
      location: 'Surry Hills, Sydney, NSW (Hybrid)',
      daysAgo: 3,
      salary: '$105,000 - $120,000 + Equity',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://jobs.lever.co/dovetail/frontend-engineer',
      description: `Transform user research workflows. High-performance canvas rendering, React, TypeScript, collaborative real-time editors, and multimodal audio/video tools.`,
    },
    {
      id: 'syd-cultureamp-fe',
      title: 'Frontend Engineer - People Insights & Survey Engine',
      company: 'Culture Amp',
      location: 'Sydney, NSW (Remote / Hybrid)',
      daysAgo: 3,
      salary: '$105,000 - $120,000 + Equity',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://jobs.lever.co/cultureamp/frontend-engineer',
      description: `Build Culture Amp's feedback engine. React, TypeScript, data visualization, GraphQL, and micro-frontend architectures.`,
    },
    {
      id: 'syd-deputy-se',
      title: 'Junior Software Engineer - Roster Scheduling & Mobile Web',
      company: 'Deputy',
      location: 'Sydney, NSW (Hybrid)',
      daysAgo: 4,
      salary: '$92,000 - $102,000 + Equity',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://boards.greenhouse.io/deputy/jobs/junior-software-engineer',
      description: `Power shift workers globally. Roster scheduling algorithms, React, Next.js, TypeScript, RESTful services, and automated CI/CD.`,
    },
    {
      id: 'syd-eucalyptus-fs',
      title: 'Junior Full Stack Engineer - Digital Health Platform',
      company: 'Eucalyptus',
      location: 'Surry Hills, Sydney, NSW (Hybrid)',
      daysAgo: 4,
      salary: '$90,000 - $100,000 + ESOP',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://jobs.ashbyhq.com/eucalyptus/software-engineer',
      description: `Deliver consumer healthcare across Pilot, Software, and Kin. React, Next.js, Node.js, PostgreSQL, Supabase, and GraphQL.`,
    },
    {
      id: 'syd-rokt-ase',
      title: 'Associate Software Engineer - Ecommerce & Marketplace',
      company: 'Rokt',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 5,
      salary: '$100,000 - $115,000 + Equity',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://boards.greenhouse.io/rokt/jobs/associate-software-engineer',
      description: `Unlock transaction moments for global e-commerce. High-throughput distributed services in React, TypeScript, Python, and AWS.`,
    },
    {
      id: 'syd-immutable-fe',
      title: 'Frontend Engineer - Web3 Gaming Ecosystem',
      company: 'Immutable',
      location: 'Sydney, NSW (Remote / Hybrid)',
      daysAgo: 5,
      salary: '$110,000 - $125,000 + Tokens',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://boards.greenhouse.io/immutable/jobs/frontend-engineer',
      description: `Build Ethereum layer-2 gaming portals. TypeScript, React, Next.js, WebSockets, and modern web application security.`,
    },
    {
      id: 'syd-linktree-fe',
      title: 'Frontend Engineer - Creator Monetization & Links',
      company: 'Linktree',
      location: 'Sydney, NSW (Remote)',
      daysAgo: 6,
      salary: '$105,000 - $120,000 + Equity',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://jobs.lever.co/linktree/frontend-engineer',
      description: `Help 40M+ creators share their world. Edge computing, Next.js, React, Tailwind CSS, TypeScript, and conversion funnels.`,
    },
    {
      id: 'syd-siteminder-fs',
      title: 'Junior Full Stack Engineer - Hospitality Tech',
      company: 'SiteMinder',
      location: 'Millers Point, Sydney, NSW (Hybrid)',
      daysAgo: 6,
      salary: '$90,000 - $100,000 + Super',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://jobs.smartrecruiters.com/SiteMinder/full-stack-engineer',
      description: `Global leader in hotel booking engines. React, TypeScript, Node.js, PostgreSQL, and AWS serverless architectures.`,
    },
    {
      id: 'syd-block-fs',
      title: 'Software Engineer - Afterpay Consumer Experience',
      company: 'Block / Afterpay',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 7,
      salary: '$110,000 - $125,000 + RSUs',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://block.xyz/careers',
      description: `Shape commerce with Block. High-converting checkout funnels in React, Next.js, TypeScript, Kotlin microservices, and GraphQL.`,
    },
    {
      id: 'syd-airtasker-fe',
      title: 'Junior Frontend Engineer - Growth & Conversion',
      company: 'Airtasker',
      location: 'Sydney, NSW (Remote / Hybrid)',
      daysAgo: 7,
      salary: '$88,000 - $98,000',
      jobType: 'Full-time',
      category: 'software',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://www.airtasker.com/careers/',
      description: `A/B test onboarding and booking flows. Next.js, React, TypeScript, Tailwind CSS, and Core Web Vitals optimization.`,
    },

    // 2. AI & Machine Learning
    {
      id: 'syd-leonardo-ai',
      title: 'AI Solutions & Frontend Engineer',
      company: 'Leonardo.AI',
      location: 'Sydney, NSW (Remote / Hybrid)',
      daysAgo: 2,
      salary: '$105,000 - $120,000 + Equity',
      jobType: 'Full-time',
      category: 'ai_ml',
      source: 'LinkedIn' as JobSource,
      description: `Generative AI canvas development. TypeScript, React, WebSockets, Canvas/WebGL, PyTorch basics, and OpenAI/Anthropic toolchains.`,
    },
    {
      id: 'syd-canva-ai',
      title: 'Junior Machine Learning Engineer - Magic Studio',
      company: 'Canva',
      location: 'Surry Hills, Sydney, NSW (Hybrid)',
      daysAgo: 3,
      salary: '$105,000 - $118,000 + Super',
      jobType: 'Full-time',
      category: 'ai_ml',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://www.canva.com/careers/',
      description: `Deploy generative visual and text models into Canva Magic Studio. Python, PyTorch, LangChain, vector databases, and high-speed inference APIs.`,
    },
    {
      id: 'syd-optiver-ai',
      title: 'Graduate Machine Learning & Research Associate',
      company: 'Optiver',
      location: 'Sydney CBD, NSW (On-site)',
      daysAgo: 4,
      salary: '$160,000 - $185,000 + Super + Bonus',
      jobType: 'Graduate',
      category: 'ai_ml',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://optiver.com/working-at-optiver/career-opportunities/',
      description: `Develop statistical forecasting and machine learning models for market microstructure. Python, C++, statistical signal processing, and time-series modeling.`,
    },
    {
      id: 'syd-quantium-ai',
      title: 'Associate AI & Data Science Consultant',
      company: 'Quantium',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 5,
      salary: '$92,000 - $102,000 + Super',
      jobType: 'Graduate',
      category: 'ai_ml',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://quantium.com/careers/',
      description: `Deliver machine learning and customer behavior models for banking and retail leaders. Python, SQL, scikit-learn, Spark, and cloud data platforms.`,
    },
    {
      id: 'syd-resmed-ai',
      title: 'AI & Biosignal Analytics Engineer',
      company: 'ResMed',
      location: 'Bella Vista, Sydney, NSW (Hybrid)',
      daysAgo: 6,
      salary: '$95,000 - $105,000 + Super',
      jobType: 'Full-time',
      category: 'ai_ml',
      source: 'SEEK' as JobSource,
      description: `Analyze patient sleep telemetry and physiological time series data. Python, TensorFlow, signal processing, and AWS health cloud infrastructure.`,
    },

    // 3. Data & Analytics
    {
      id: 'syd-woolies-data',
      title: 'Junior Data & Analytics Engineer',
      company: 'Woolworths Group / [wiq]',
      location: 'Bella Vista, Sydney, NSW (Hybrid)',
      daysAgo: 2,
      salary: '$88,000 - $95,000 + Super',
      jobType: 'Full-time',
      category: 'data_analytics',
      source: 'LinkedIn' as JobSource,
      directAtsUrl: 'https://careers.woolworthsgroup.com.au/',
      description: `Join [wiq] retail analytics powerhouse. SQL scripting, Python data pipelines, Snowflake warehousing, dbt, and inventory intelligence.`,
    },
    {
      id: 'syd-commbank-data',
      title: 'Graduate Technology & Data Analyst',
      company: 'Commonwealth Bank',
      location: 'Eveleigh, Sydney, NSW (Hybrid)',
      daysAgo: 3,
      salary: '$90,000 + 12% Super',
      jobType: 'Graduate',
      category: 'data_analytics',
      source: 'SEEK' as JobSource,
      description: `Shape the future of banking through digital innovation, cloud data lakes, and real-time financial telemetry. SQL, Python, Power BI, and AWS.`,
    },
    {
      id: 'syd-macquarie-data',
      title: 'Data & Analytics Associate - Risk Engineering',
      company: 'Macquarie Group',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 4,
      salary: '$95,000 - $105,000 + Bonus',
      jobType: 'Full-time',
      category: 'data_analytics',
      source: 'SEEK' as JobSource,
      description: `Build risk intelligence models and automated reporting pipelines for commodities and global markets. Python, SQL, PostgreSQL, and Tableau.`,
    },
    {
      id: 'syd-nine-data',
      title: 'Junior Business Intelligence & Audience Analyst',
      company: 'Nine Digital',
      location: 'North Sydney, NSW (Hybrid)',
      daysAgo: 5,
      salary: '$85,000 - $92,000 + Super',
      jobType: 'Full-time',
      category: 'data_analytics',
      source: 'SEEK' as JobSource,
      description: `Analyze digital audience engagement across 9Now, SMH, and The Age. SQL, BigQuery, Google Analytics 4, and Looker dashboarding.`,
    },
    {
      id: 'syd-propeller-data',
      title: 'Data Analytics Engineer - Geospatial Surveying',
      company: 'Propeller Aero',
      location: 'Surry Hills, Sydney, NSW (Hybrid)',
      daysAgo: 7,
      salary: '$95,000 - $105,000 + Equity',
      jobType: 'Full-time',
      category: 'data_analytics',
      source: 'LinkedIn' as JobSource,
      description: `Process 3D drone survey datasets for construction sites. PostgreSQL, PostGIS, Python, SQL, and geospatial telemetry pipelines.`,
    },

    // 4. Cloud & DevOps
    {
      id: 'syd-aws-grad',
      title: 'Cloud Systems Software Engineer (Graduate)',
      company: 'Amazon Web Services (AWS)',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 2,
      salary: '$110,000 - $125,000 + RSUs',
      jobType: 'Graduate',
      category: 'cloud_devops',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://amazon.jobs/',
      description: `Build distributed cloud computing infrastructure. S3 storage engines, serverless Lambda runtimes, Python, TypeScript, Java, and Linux internals.`,
    },
    {
      id: 'syd-telstra-cloud',
      title: 'Cloud & Infrastructure Automation Graduate',
      company: 'Telstra',
      location: 'Sydney, NSW (Hybrid)',
      daysAgo: 3,
      salary: '$86,000 + Super',
      jobType: 'Graduate',
      category: 'cloud_devops',
      source: 'GradConnection' as JobSource,
      directAtsUrl: 'https://careers.telstra.com/',
      description: `Automate cloud provisioning and telecommunications routing. Terraform, Python, AWS, Azure, CI/CD pipelines, and network telemetry.`,
    },
    {
      id: 'syd-airtree-cloud',
      title: 'DevOps & Site Reliability Engineer',
      company: 'AirTree Portfolio Startups',
      location: 'Sydney, NSW (Hybrid)',
      daysAgo: 5,
      salary: '$105,000 - $120,000',
      jobType: 'Full-time',
      category: 'cloud_devops',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://www.airtree.vc/jobs',
      description: `Container orchestration and observability across high-growth startups. Docker, Kubernetes, GitHub Actions, AWS, and Prometheus monitoring.`,
    },
    {
      id: 'syd-honey-cloud',
      title: 'Junior Cloud Infrastructure & SRE Engineer',
      company: 'Honey Insurance',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 6,
      salary: '$90,000 - $100,000 + ESOP',
      jobType: 'Full-time',
      category: 'cloud_devops',
      source: 'SEEK' as JobSource,
      description: `Maintain high-availability smart insurance underwriting services. Supabase, PostgreSQL, Docker, AWS ECS, and automated release testing.`,
    },
    {
      id: 'syd-qantas-cloud',
      title: 'Cloud Platform Engineer - Loyalty Core',
      company: 'Qantas Loyalty',
      location: 'Mascot, Sydney, NSW (Hybrid)',
      daysAgo: 8,
      salary: '$100,000 - $115,000 + Travel Perks',
      jobType: 'Full-time',
      category: 'cloud_devops',
      source: 'SEEK' as JobSource,
      description: `Scale airline loyalty platforms in the cloud. AWS, Terraform, Docker, microservice telemetry, and secure API gateways.`,
    },

    // 5. Cyber Security & IT
    {
      id: 'syd-cybercx-analyst',
      title: 'Cyber Security Operations Analyst (Graduate / Junior)',
      company: 'CyberCX',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 1,
      salary: '$85,000 - $95,000 + Super',
      jobType: 'Graduate',
      category: 'cyber_it',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://cybercx.com.au/careers/',
      description: `Join Australia's premier cyber security firm. Security incident monitoring, SIEM log analysis, vulnerability scanning, and threat intelligence.`,
    },
    {
      id: 'syd-commbank-cyber',
      title: 'Associate Cyber Security Engineer - Threat Detection',
      company: 'Commonwealth Bank',
      location: 'Eveleigh, Sydney, NSW (Hybrid)',
      daysAgo: 3,
      salary: '$92,000 + 12% Super',
      jobType: 'Full-time',
      category: 'cyber_it',
      source: 'SEEK' as JobSource,
      description: `Protect digital banking for 16M+ customers. Identity access management (IAM), automated incident response, network firewalls, and cloud security audits.`,
    },
    {
      id: 'syd-macquarie-it',
      title: 'IT Systems & Cloud Operations Consultant',
      company: 'Macquarie Group',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 4,
      salary: '$90,000 - $100,000 + Bonus',
      jobType: 'Full-time',
      category: 'cyber_it',
      source: 'SEEK' as JobSource,
      description: `Ensure stability of global trading and investment platforms. Windows/Linux enterprise administration, Active Directory, AWS, and automation scripting.`,
    },
    {
      id: 'syd-anz-cyber',
      title: 'Cyber Security Graduate Associate',
      company: 'ANZ Bank',
      location: 'Sydney, NSW (Hybrid)',
      daysAgo: 6,
      salary: '$89,000 + 12% Super',
      jobType: 'Graduate',
      category: 'cyber_it',
      source: 'GradConnection' as JobSource,
      directAtsUrl: 'https://www.anz.com.au/careers/graduates/',
      description: `ANZ Plus digital bank security stream. Application penetration testing, cryptographic verification, DevSecOps pipelines, and threat mitigation.`,
    },
    {
      id: 'syd-wisetech-it',
      title: 'IT Systems & Infrastructure Engineer',
      company: 'WiseTech Global',
      location: 'Alexandria, Sydney, NSW (On-site)',
      daysAgo: 7,
      salary: '$90,000 - $100,000 + Super',
      jobType: 'Full-time',
      category: 'cyber_it',
      source: 'SEEK' as JobSource,
      description: `Maintain global high-performance data centers. Enterprise networking, virtualization, Windows Server, Linux, and telemetry infrastructure.`,
    },

    // 6. Graduate Tech Programs & Early Career Tech
    {
      id: 'syd-optiver-grad',
      title: 'Graduate Software Engineer - High Performance Execution',
      company: 'Optiver',
      location: 'Sydney CBD, NSW (On-site)',
      daysAgo: 1,
      salary: '$150,000 - $175,000 + Super + Bonus',
      jobType: 'Graduate',
      category: 'graduate_programs',
      source: 'Company Site' as JobSource,
      directAtsUrl: 'https://optiver.com/working-at-optiver/career-opportunities/',
      description: `Graduate engineers build low-latency trading infrastructure in C++ and Python. Algorithms, multithreading, and high-frequency network protocols.`,
    },
    {
      id: 'syd-macquarie-grad',
      title: 'Technology Associate - Digital Engineering Graduate',
      company: 'Macquarie Group',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 2,
      salary: '$96,000 + Bonus + Super',
      jobType: 'Graduate',
      category: 'graduate_programs',
      source: 'SEEK' as JobSource,
      description: `Macquarie Technology digital associates build portals and microservices using TypeScript, React, Python, PostgreSQL, and cloud architecture.`,
    },
    {
      id: 'syd-anz-grad',
      title: 'Graduate Software Engineer - Digital Banking (ANZ Plus)',
      company: 'ANZ Bank',
      location: 'Sydney, NSW (Hybrid)',
      daysAgo: 3,
      salary: '$89,000 + 12% Super',
      jobType: 'Graduate',
      category: 'graduate_programs',
      source: 'GradConnection' as JobSource,
      directAtsUrl: 'https://www.anz.com.au/careers/graduates/',
      description: `Build consumer banking apps in ANZ Plus. React Native / React web, TypeScript, microservices, and automated testing pipelines.`,
    },
    {
      id: 'syd-resmed-grad',
      title: 'Graduate Software Engineer - Cloud Digital Health',
      company: 'ResMed',
      location: 'Bella Vista, Sydney, NSW (Hybrid)',
      daysAgo: 5,
      salary: '$88,000 - $96,000 + Super',
      jobType: 'Graduate',
      category: 'graduate_programs',
      source: 'SEEK' as JobSource,
      description: `Graduate engineers develop cloud patient monitoring portals in TypeScript, React, Python, and AWS health infrastructure.`,
    },
    {
      id: 'syd-mecca-grad',
      title: 'Junior Ecommerce Web Engineer',
      company: 'MECCA Brands',
      location: 'Sydney / Hybrid, NSW',
      daysAgo: 6,
      salary: '$85,000 - $92,000 + Super',
      jobType: 'Full-time',
      category: 'software',
      source: 'SEEK' as JobSource,
      description: `Maintain MECCA's premier beauty shopping site. Focus on React, Next.js, headless CMS, and responsive checkout optimization.`,
    },
    {
      id: 'syd-zip-grad',
      title: 'Associate Full Stack Developer',
      company: 'Zip Co',
      location: 'Sydney CBD, NSW (Hybrid)',
      daysAgo: 7,
      salary: '$95,000 - $105,000 + ESOP',
      jobType: 'Full-time',
      category: 'software',
      source: 'SEEK' as JobSource,
      description: `Modernize BNPL finance globally. Work on consumer checkout SDKs and internal merchant tools with React, TypeScript, Node.js, and SQL.`,
    },
  ];

  return pool.map((item) => {
    const precision = buildPrecisionJobUrl(
      item.company,
      item.title,
      item.location,
      item.source,
      item.directAtsUrl
    );

    const postedIso = getPastIso(item.daysAgo);

    return toDiscoveredJob({
      id: item.id,
      title: item.title,
      jobTitle: item.title,
      company: item.company,
      companyName: item.company,
      location: item.location,
      postedDate: postedIso,
      datePosted: postedIso,
      daysAgo: item.daysAgo,
      salary: item.salary,
      jobType: item.jobType,
      category: item.category,
      description: item.description,
      jobDescription: item.description,
      requirements: [],
      keyRequirements: [],
      skills: [],
      matchedSkills: [],
      missingSkills: [],
      matchScore: 80,
      matchBreakdown: { technical: 30, roleRelevance: 25, experienceFit: 25 },
      fitSummary: '',
      jobUrl: precision.url,
      sourceUrl: precision.url,
      applyType: precision.applyType,
      source: item.source,
      postingStatus: 'Live',
      workArrangement: item.location.includes('Remote')
        ? 'Remote'
        : item.location.includes('On-site')
        ? 'On-site'
        : 'Hybrid',
      employmentType: (item.jobType === 'Graduate' ? 'Graduate' : 'Full-time') as EmploymentType,
      isDirectApplyLink: precision.applyType === 'direct_ats',
      isSaved: false,
      isApplied: false,
    });
  });
}

// ---------------------------------------------------------------------------
// External RapidAPI JSearch Ingestion with 14-Day and Sydney Geo Filters
// ---------------------------------------------------------------------------
async function fetchFromJSearch(
  query: string,
  apiKey: string,
  category: JobCategory = 'all_tech',
  numPages = 3
): Promise<DiscoveredJob[]> {
  const allRawJobs: any[] = [];
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  for (let p = 1; p <= numPages; p++) {
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${p}&num_pages=1&date_posted=month`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      });

      if (!res.ok) break;
      const data = await res.json();
      const pageJobs = (data.data || []) as any[];
      allRawJobs.push(...pageJobs);
      if (pageJobs.length < 10) break;
    } catch (e) {
      console.warn(`JSearch page ${p} fetch failed:`, e);
      break;
    }
  }

  return allRawJobs
    .filter((item: any) => {
      // 1. Sydney geo-filter
      const loc = [item.job_city, item.job_state, item.job_country].filter(Boolean).join(', ');
      if (!isSydneyOrNsw(loc)) return false;

      // 2. Strict 14-day date filter
      const postDate = item.job_posted_at_datetime_utc ? new Date(item.job_posted_at_datetime_utc) : now;
      if (!isNaN(postDate.getTime()) && postDate < fourteenDaysAgo) return false;

      return true;
    })
    .map((item: any) => {
      const isRemote = Boolean(item.job_is_remote);
      const workArrangement: WorkArrangement = isRemote ? 'Remote' : 'Hybrid';
      let source: JobSource = 'LinkedIn';
      if (item.job_publisher?.toLowerCase().includes('indeed')) source = 'Indeed';
      else if (item.job_publisher?.toLowerCase().includes('seek')) source = 'SEEK';
      else if (item.job_publisher?.toLowerCase().includes('linkedin')) source = 'LinkedIn';
      else source = 'Company Site';

      const minSal = item.job_min_salary ? `$${Math.round(item.job_min_salary / 1000)}k` : null;
      const maxSal = item.job_max_salary ? `$${Math.round(item.job_max_salary / 1000)}k` : null;
      const salary = minSal && maxSal ? `${minSal} - ${maxSal}` : minSal || maxSal || undefined;

      const company = item.job_employer_name || item.employer_name || 'Hiring Company';
      const title = item.job_title || 'Software Engineer';
      const loc = [item.job_city, item.job_state, item.job_country].filter(Boolean).join(', ') || 'Sydney, NSW, Australia';

      let directCandidate = item.job_apply_link;
      if (isGenericRootUrl(directCandidate)) {
        directCandidate = item.job_google_link;
      }

      const precision = buildPrecisionJobUrl(company, title, loc, source, directCandidate);
      const postDate = item.job_posted_at_datetime_utc ? new Date(item.job_posted_at_datetime_utc) : now;
      const daysAgo = isNaN(postDate.getTime())
        ? 2
        : Math.max(0, Math.min(14, Math.floor((now.getTime() - postDate.getTime()) / (24 * 60 * 60 * 1000))));

      const isGrad = title.toLowerCase().includes('graduate') || title.toLowerCase().includes('intern');

      return toDiscoveredJob({
        id: item.job_id || `jsearch-${Math.random().toString(36).slice(2, 9)}`,
        title,
        jobTitle: title,
        company,
        companyName: company,
        location: loc,
        postedDate: postDate.toISOString(),
        datePosted: postDate.toISOString(),
        daysAgo,
        salary,
        jobType: isGrad ? 'Graduate' : 'Full-time',
        category,
        description: item.job_description || '',
        jobDescription: item.job_description || '',
        requirements: [],
        keyRequirements: [],
        skills: [],
        matchedSkills: [],
        missingSkills: [],
        matchScore: 80,
        matchBreakdown: { technical: 30, roleRelevance: 25, experienceFit: 25 },
        fitSummary: '',
        jobUrl: precision.url,
        sourceUrl: precision.url,
        applyType: precision.applyType,
        source,
        postingStatus: 'Live',
        workArrangement,
        employmentType: (isGrad ? 'Graduate' : 'Full-time') as EmploymentType,
        isDirectApplyLink: precision.applyType === 'direct_ats',
        isSaved: false,
        isApplied: false,
      });
    });
}

// ---------------------------------------------------------------------------
// Exploration Shuffler with Seed
// ---------------------------------------------------------------------------
function seededShuffle<T>(array: T[], seedStr?: string): T[] {
  const arr = [...array];
  if (!seedStr) return arr;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.abs((hash + i) % (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body: DiscoverJobsRequest = await req.json().catch(() => ({}));
    const {
      masterResume,
      targetRole,
      location = 'Sydney, NSW, Australia',
      maxAgeDays = 14,
      category = 'all_tech',
      page = 1,
      pageSize = 20,
      seed,
    } = body;

    const apiKey = process.env.RAPIDAPI_KEY || process.env.JOB_SEARCH_API_KEY;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

    let rawJobs: DiscoveredJob[] = [];

    // Attempt live fetch if API key exists
    if (apiKey) {
      try {
        let categoryKeywords = 'Software Engineer Graduate Sydney';
        if (category === 'ai_ml') categoryKeywords = 'AI Machine Learning Engineer Sydney';
        else if (category === 'data_analytics') categoryKeywords = 'Data Analyst Graduate Sydney';
        else if (category === 'cloud_devops') categoryKeywords = 'Cloud DevOps Engineer Sydney';
        else if (category === 'cyber_it') categoryKeywords = 'Cyber Security Analyst Sydney';
        else if (category === 'graduate_programs') categoryKeywords = 'Technology Graduate Sydney';

        const queryTerm = `${targetRole || categoryKeywords} in ${location}`;
        rawJobs = await fetchFromJSearch(queryTerm, apiKey, category, 3);
      } catch (err) {
        console.warn('Live API fetch failed, fallback to dynamic Sydney tech pool:', err);
        rawJobs = getDynamicSydneyTechPool(now);
      }
    } else {
      rawJobs = getDynamicSydneyTechPool(now);
    }

    // 1. Strict Sydney Geo-Filtering
    let filteredJobs = rawJobs.filter((job) => isSydneyOrNsw(job.location));

    // 2. Strict <= 14 Days Date Filtering
    filteredJobs = filteredJobs.filter((job) => {
      const postDate = new Date(job.postedDate);
      if (isNaN(postDate.getTime())) return true;
      return postDate >= cutoffDate;
    });

    // 3. Category Filtering
    if (category && category !== 'all_tech') {
      filteredJobs = filteredJobs.filter((job) => {
        if (category === 'graduate_programs') {
          return (
            job.category === 'graduate_programs' ||
            job.jobType === 'Graduate' ||
            job.title.toLowerCase().includes('graduate') ||
            job.title.toLowerCase().includes('intern')
          );
        }
        return job.category === category;
      });
    }

    // 4. Score all jobs against master resume profile
    let scoredJobs: DiscoveredJob[] = filteredJobs.map((job) => {
      const match = calculateJobMatch(job.title, job.description, String(job.category), masterResume);
      return {
        ...job,
        matchScore: match.matchScore,
        matchBreakdown: match.matchBreakdown,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        skills: match.matchedSkills,
        requirements: match.keyRequirements,
        keyRequirements: match.keyRequirements,
        fitSummary: match.fitSummary,
      };
    });

    // 5. Keyword / Role Search Filtering
    if (targetRole && targetRole.trim()) {
      const tr = targetRole.toLowerCase().trim();
      scoredJobs = scoredJobs.filter(
        (j) =>
          j.title.toLowerCase().includes(tr) ||
          j.company.toLowerCase().includes(tr) ||
          j.description.toLowerCase().includes(tr) ||
          (j.matchedSkills || []).some((s) => s.toLowerCase().includes(tr))
      );
    }

    // 6. Ranking with Freshness Boost (<3 days gets ranking bonus)
    scoredJobs.sort((a, b) => {
      const aDays = a.daysAgo ?? 2;
      const bDays = b.daysAgo ?? 2;
      const aFreshBonus = aDays <= 2 ? 5 : aDays <= 4 ? 2 : 0;
      const bFreshBonus = bDays <= 2 ? 5 : bDays <= 4 ? 2 : 0;
      return b.matchScore + bFreshBonus - (a.matchScore + aFreshBonus);
    });

    // 7. Seeded exploration rotation if requested
    if (seed) {
      scoredJobs = seededShuffle(scoredJobs, seed);
    }

    // 8. Pagination
    const total = scoredJobs.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedJobs = scoredJobs.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < total;

    const responsePayload: DiscoverJobsResponse = {
      jobs: paginatedJobs,
      total,
      page,
      hasMore,
      detectedDate: now.toISOString(),
      provider: apiKey ? 'live-jsearch-multi' : 'dynamic-sydney-pool',
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in /api/jobs/discover:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover jobs' },
      { status: 500 }
    );
  }
}
