import { WorkExperience, Education, Project, SkillItem } from './profile';

export interface MasterResume {
  id: string;
  versionName: string;
  lastUpdated: string; // ISO 8601 date string (YYYY-MM-DD)
  summary: string;
  skills: SkillItem[];
  experiences: WorkExperience[];
  education: Education[];
  projects: Project[];
}

export interface ResumeChangeItem {
  category: 'Summary' | 'Skill Reordering' | 'Project Emphasis' | 'Experience Phrasing';
  description: string;
  rationale: string;
}

export interface TailoredResumeExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  period: string;
  isEmphasized?: boolean;
  highlights: string[];
}

export interface TailoredResumeProject {
  id: string;
  title: string;
  techStack: string[];
  description: string;
  isEmphasized?: boolean;
  githubUrl?: string;
  liveUrl?: string;
}

export interface TailoredResume {
  id: string;
  jobId: string;
  targetCompany: string;
  targetPosition: string;
  versionName: string;
  dateGenerated: string; // ISO 8601 date string (YYYY-MM-DD)
  matchScore: number;
  changesMade: ResumeChangeItem[];
  tailoredSummary: string;
  tailoredSkills: string[];
  tailoredExperiences: TailoredResumeExperience[];
  tailoredProjects: TailoredResumeProject[];
  tailoredEducation: Education[];
}

export interface CoverLetterItem {
  id: string;
  jobId: string;
  targetCompany: string;
  targetPosition: string;
  dateGenerated: string; // ISO 8601 date string (YYYY-MM-DD)
  recipientName?: string;
  bodyText: string;
}

/**
 * A self-contained resume snapshot.
 * isMaster === true  → the canonical "source of truth" resume.
 * isMaster === false → an AI-tailored version saved via the Tailor page.
 */
export interface ResumeVersion {
  id: string;
  title: string;              // e.g. "Toyota Graduate Application – Tailored"
  isMaster: boolean;
  targetJobTitle?: string;    // role this version was tailored for
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  matchScore?: number;        // ATS score from tailor run (non-master only)
  // Contact URLs — kept in sync with profile for accurate exports
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  // Core resume fields
  summary: string;
  skills: import('./profile').SkillItem[];
  experiences: import('./profile').WorkExperience[];
  education: import('./profile').Education[];
  projects: import('./profile').Project[];
  // Structured tailoring output (non-master only)
  tailoredSkills?: {
    languages: string[];
    frameworks: string[];
    cloudAndData: string[];
    tools: string[];
  };
  tailoredProjects?: Array<{ name: string; bullets: string[] }>;
  recommendations?: string[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
}

/**
 * Payload representing local guest state stored in browser storage
 * ready to be migrated to Supabase upon successful authentication.
 */
export interface GuestSessionPayload {
  profile?: import('./profile').CandidateProfile;
  masterResume?: MasterResume;
  tailoredResumes?: TailoredResume[];
  applications?: import('./application').JobApplication[];
  coverLetters?: CoverLetterItem[];
  resumes?: ResumeVersion[];
}

/**
 * Status summary returned after executing a guest-to-account migration.
 */
export interface MigrationResult {
  success: boolean;
  migratedCounts: {
    masterResume: boolean;
    profile: boolean;
    tailoredResumes: number;
    applications: number;
    coverLetters: number;
  };
  error?: string;
}

/**
 * Determines whether a given master resume or candidate profile is an empty clean slate
 * versus a populated resume that contains user data.
 */
export function isResumeEmpty(
  master?: Partial<MasterResume> | null,
  prof?: Partial<import('./profile').CandidateProfile> | null
): boolean {
  if (!master && !prof) return true;

  const hasProfileName = Boolean(prof?.name && prof.name.trim().length > 0);
  const hasSummary = Boolean(
    (master?.summary && master.summary.trim().length > 0) ||
    (prof?.summary && prof.summary.trim().length > 0)
  );
  const hasSkills = Boolean(
    (master?.skills && master.skills.length > 0) ||
    (prof?.skills && prof.skills.length > 0)
  );
  const hasExperiences = Boolean(
    (master?.experiences && master.experiences.length > 0) ||
    (prof?.experiences && prof.experiences.length > 0)
  );
  const hasEducation = Boolean(
    (master?.education && master.education.length > 0) ||
    (prof?.education && prof.education.length > 0)
  );
  const hasProjects = Boolean(
    (master?.projects && master.projects.length > 0) ||
    (prof?.projects && prof.projects.length > 0)
  );

  return !(hasProfileName || hasSummary || hasSkills || hasExperiences || hasEducation || hasProjects);
}
