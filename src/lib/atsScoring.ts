import type { ResumeVersion } from '@/types/resume';
import type { AtsMatchResult } from '@/types/tailor';

/**
 * Standard comprehensive taxonomy of tech stacks, frameworks, cloud,
 * tools, and engineering methodologies for client-side ATS analysis.
 */
export const TECH_TAXONOMY: Record<string, string[]> = {
  // Languages
  TypeScript: ['typescript', 'ts'],
  JavaScript: ['javascript', 'js', 'es6', 'ecmascript'],
  Python: ['python', 'py'],
  Java: ['java', 'jvm'],
  'C#': ['c#', 'csharp', '.net', 'dotnet'],
  'C++': ['c++', 'cpp'],
  Go: ['golang', 'go lang', '\\bgo\\b'],
  Rust: ['rust'],
  Ruby: ['ruby', 'rails'],
  PHP: ['php'],
  SQL: ['sql', 'postgres', 'postgresql', 'mysql', 'sqlite'],

  // Frontend & UI
  React: ['react', 'react.js', 'reactjs'],
  'Next.js': ['next.js', 'nextjs', 'next js'],
  Vue: ['vue', 'vue.js', 'vuejs'],
  Angular: ['angular'],
  Svelte: ['svelte'],
  HTML5: ['html', 'html5', 'semantic html'],
  CSS3: ['css', 'css3', 'scss', 'sass'],
  'Tailwind CSS': ['tailwind', 'tailwindcss'],
  Redux: ['redux', 'zustand', 'recoil'],
  GraphQL: ['graphql', 'apollo'],
  Webpack: ['webpack', 'vite', 'turbopack'],

  // Backend & APIs
  'Node.js': ['node.js', 'nodejs', 'node js'],
  Express: ['express', 'express.js'],
  NestJS: ['nestjs', 'nest.js'],
  FastAPI: ['fastapi'],
  Django: ['django'],
  'Spring Boot': ['spring boot', 'spring framework'],
  'RESTful APIs': ['rest api', 'restful', 'rest apis', 'web api'],
  Microservices: ['microservices', 'micro-services', 'distributed systems'],
  gRPC: ['grpc', 'protobuf'],
  WebSockets: ['websocket', 'websockets', 'socket.io'],

  // Cloud & Infrastructure
  AWS: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'],
  Azure: ['azure', 'azure devops'],
  GCP: ['gcp', 'google cloud', 'bigquery', 'cloud run'],
  Docker: ['docker', 'containerization', 'containers'],
  Kubernetes: ['kubernetes', 'k8s'],
  Terraform: ['terraform', 'infrastructure as code', 'iac'],
  Linux: ['linux', 'bash', 'unix', 'shell scripting'],

  // Databases & Caching
  PostgreSQL: ['postgresql', 'postgres'],
  MongoDB: ['mongodb', 'mongo'],
  Redis: ['redis', 'caching'],
  Supabase: ['supabase'],
  Prisma: ['prisma', 'orm', 'drizzle'],
  Kafka: ['kafka', 'event-driven', 'message queue', 'rabbitmq'],

  // Quality, Testing & DevOps
  'CI/CD': ['ci/cd', 'github actions', 'gitlab ci', 'jenkins', 'continuous integration'],
  Jest: ['jest', 'vitest', 'unit testing'],
  Cypress: ['cypress', 'playwright', 'e2e testing'],
  Git: ['git', 'github', 'version control'],
  'Agile / Scrum': ['agile', 'scrum', 'kanban', 'sprints'],
  'System Design': ['system design', 'software architecture', 'scalability', 'high availability'],
  Accessibility: ['wcag', 'a11y', 'accessibility'],
  'Performance Optimization': ['performance optimization', 'latency', 'core web vitals'],
};

/**
 * Normalizes string for fast token matching.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s#+./-]/g, ' ');
}

/**
 * Extracts searchable text representation of the entire resume.
 */
export function extractResumeFullText(resume: ResumeVersion): string {
  const parts: string[] = [
    resume.summary || '',
    ...(resume.skills || []).map((s) => s.name),
    ...(resume.experiences || []).flatMap((e) => [
      e.role || '',
      e.company || '',
      ...(e.highlights || []),
    ]),
    ...(resume.projects || []).flatMap((p) => [
      p.title || '',
      p.description || '',
      ...(p.techStack || []),
    ]),
    ...(resume.education || []).flatMap((edu) => [
      edu.degree || '',
      edu.fieldOfStudy || '',
      edu.institution || '',
      edu.details || '',
    ]),
  ];
  return normalizeText(parts.join(' '));
}

/**
 * Fast, pure, client-side ATS scoring engine.
 * Computes match score and matched vs. missing keywords in < 5ms.
 */
export function calculateReactiveAtsScore(
  jobDescription: string,
  resume: ResumeVersion,
  targetJobTitle?: string
): AtsMatchResult {
  if (!jobDescription || !jobDescription.trim()) {
    // If no JD provided yet, return default baseline from resume richness
    const skillCount = resume.skills?.length || 0;
    const expCount = resume.experiences?.length || 0;
    const baseline = Math.min(85, Math.max(60, 50 + skillCount * 2 + expCount * 5));
    return {
      atsScore: baseline,
      matchedKeywords: (resume.skills || []).slice(0, 8).map((s) => s.name),
      missingKeywords: [],
      matchBreakdown: { technical: 30, roleRelevance: 25, experienceFit: 20 },
      fitSummary: 'Baseline score based on current resume profile.',
    };
  }

  const jdNormalized = normalizeText(jobDescription);
  const titleNormalized = targetJobTitle ? normalizeText(targetJobTitle) : '';
  const resumeNormalized = extractResumeFullText(resume);
  const resumeSkillNames = new Set(
    (resume.skills || []).map((s) => s.name.toLowerCase().trim())
  );

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  // 1. Cross-reference taxonomy against Job Description
  Object.entries(TECH_TAXONOMY).forEach(([canonical, aliases]) => {
    // Check if keyword is mentioned in the job description or target title
    const inJob = aliases.some((pattern) => {
      if (pattern.startsWith('\\b') && pattern.endsWith('\\b')) {
        const regex = new RegExp(pattern, 'i');
        return regex.test(jdNormalized) || regex.test(titleNormalized);
      }
      return jdNormalized.includes(pattern) || titleNormalized.includes(pattern);
    });

    if (inJob) {
      // Check if candidate resume has this keyword
      const canonicalLower = canonical.toLowerCase();
      const hasSkill =
        resumeSkillNames.has(canonicalLower) ||
        aliases.some((pattern) => {
          if (pattern.startsWith('\\b') && pattern.endsWith('\\b')) {
            const regex = new RegExp(pattern, 'i');
            return regex.test(resumeNormalized);
          }
          return (
            resumeNormalized.includes(pattern) ||
            resumeSkillNames.has(pattern)
          );
        });

      if (hasSkill) {
        if (!matchedKeywords.includes(canonical)) {
          matchedKeywords.push(canonical);
        }
      } else {
        if (!missingKeywords.includes(canonical)) {
          missingKeywords.push(canonical);
        }
      }
    }
  });

  // 2. Also check if any existing candidate skills are in the JD
  for (const skill of resume.skills || []) {
    const sLower = skill.name.toLowerCase().trim();
    if (sLower.length >= 2 && jdNormalized.includes(sLower)) {
      if (!matchedKeywords.some((k) => k.toLowerCase() === sLower)) {
        matchedKeywords.push(skill.name);
      }
    }
  }

  // 3. Score Breakdown Calculation
  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  const matchRatio = totalKeywords > 0 ? matchedKeywords.length / totalKeywords : 0.7;

  // Technical Score (0 - 45 points)
  // Base of 10 points + up to 35 points scaled by matched ratio and volume
  const volumeBonus = Math.min(10, matchedKeywords.length * 1.2);
  const technical = Math.min(
    45,
    Math.round(matchRatio * 35 + volumeBonus)
  );

  // Role Relevance (0 - 30 points)
  let roleRelevance = 18;
  const candidateRoles = (resume.experiences || []).map((e) =>
    (e.role || '').toLowerCase()
  );
  const summaryLower = (resume.summary || '').toLowerCase();

  // Role terms matching
  const roleKeywords = ['engineer', 'developer', 'frontend', 'backend', 'fullstack', 'architect', 'lead', 'consultant', 'analyst'];
  for (const rk of roleKeywords) {
    if ((jdNormalized.includes(rk) || titleNormalized.includes(rk)) && (candidateRoles.some((r) => r.includes(rk)) || summaryLower.includes(rk))) {
      roleRelevance += 3;
    }
  }
  roleRelevance = Math.min(30, Math.max(12, roleRelevance));

  // Experience Fit & Accomplishment Depth (0 - 25 points)
  let experienceFit = 14;
  const totalExperiences = (resume.experiences || []).length;
  const totalProjects = (resume.projects || []).length;
  const totalBullets = (resume.experiences || []).reduce(
    (acc, e) => acc + (e.highlights?.length || 0),
    0
  );

  if (totalExperiences >= 2) experienceFit += 4;
  if (totalProjects >= 2) experienceFit += 3;
  if (totalBullets >= 6) experienceFit += 4;
  experienceFit = Math.min(25, Math.max(10, experienceFit));

  // Total Score (0 - 100)
  const atsScore = Math.min(100, Math.max(25, technical + roleRelevance + experienceFit));

  const fitSummary =
    atsScore >= 80
      ? `Exceptional alignment (${matchedKeywords.length} matched core skills). Ready for immediate submission.`
      : atsScore >= 65
      ? `Strong foundation with ${matchedKeywords.length} matches. Adding missing skills can boost score above 85%.`
      : `Moderate fit (${matchedKeywords.length} matches). Consider bridging key missing requirements to improve ranking.`;

  return {
    atsScore,
    matchedKeywords,
    missingKeywords,
    matchBreakdown: {
      technical,
      roleRelevance,
      experienceFit,
    },
    fitSummary,
  };
}
