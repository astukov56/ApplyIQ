import type { MasterResume } from './resume';

export type JobSource =
  | 'LinkedIn'
  | 'SEEK'
  | 'Indeed'
  | 'Company Site'
  | 'GradConnection';

export type PostingStatus = 'Live' | 'Expired' | 'Unavailable' | 'Archived';

export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site';

export type EmploymentType =
  | 'Full-time'
  | 'Contract'
  | 'Internship'
  | 'Part-time'
  | 'Graduate';

export type JobCategory =
  | 'all_tech'
  | 'software'
  | 'ai_ml'
  | 'data_analytics'
  | 'cloud_devops'
  | 'cyber_it'
  | 'graduate_programs';

export type ApplyType = 'direct_ats' | 'google_jobs_deep_link' | 'seek_verified';

export interface MatchBreakdown {
  technical: number;      // 0 - 40
  roleRelevance: number;  // 0 - 30
  experienceFit: number;  // 0 - 30
}

export interface DiscoveredJob {
  id: string;

  // Dual-accessible title & company
  title: string;
  jobTitle: string;
  company: string;
  companyName: string;
  location: string;
  salary?: string;

  // Dual-accessible dates & freshness
  postedDate: string;
  datePosted: string;     // ISO 8601 datetime string
  daysAgo: number;        // 0 to 14

  // Types & categories
  jobType: string;
  category: JobCategory | string;
  source: JobSource;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  postingStatus: PostingStatus;
  archivedDate?: string;
  department?: string;

  // Dual-accessible description & requirements
  description: string;
  jobDescription: string;
  rawDescription?: string;
  requirements: string[];
  keyRequirements: string[];
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];

  // ATS Scoring & Breakdown
  matchScore: number;     // 0 to 100
  matchBreakdown: MatchBreakdown;
  fitSummary: string;

  // URL & Apply attributes
  jobUrl: string;
  sourceUrl: string;
  applyType: ApplyType;
  isDirectApplyLink?: boolean;

  // User state
  isSaved?: boolean;
  isApplied?: boolean;
}

export function toDiscoveredJob(raw: any): DiscoveredJob {
  const title = raw.title || raw.jobTitle || 'Software Engineer';
  const company = raw.company || raw.companyName || 'Hiring Company';
  const description = raw.description || raw.jobDescription || '';
  const rawDescription = raw.rawDescription || description;
  const postedDate = raw.postedDate || raw.datePosted || new Date().toISOString();
  const location = raw.location || 'Sydney, NSW, Australia';
  const url = raw.jobUrl || raw.sourceUrl || '#';
  const source = raw.source || 'Company Site';
  const employmentType = raw.employmentType || raw.jobType || 'Full-time';
  const category = raw.category || (employmentType === 'Graduate' ? 'graduate_programs' : 'software');
  const matchedSkills = raw.skills || raw.matchedSkills || ['TypeScript', 'React'];
  const missingSkills = raw.missingSkills || [];
  const keyRequirements = raw.requirements || raw.keyRequirements || [];
  const daysAgo = typeof raw.daysAgo === 'number' ? raw.daysAgo : 2;
  const matchScore = typeof raw.matchScore === 'number' ? raw.matchScore : 80;
  const matchBreakdown = raw.matchBreakdown || { technical: 30, roleRelevance: 25, experienceFit: 25 };
  const applyType = raw.applyType || (raw.isDirectApplyLink ? 'direct_ats' : source === 'SEEK' ? 'seek_verified' : 'google_jobs_deep_link');

  return {
    id: raw.id,
    title,
    jobTitle: title,
    company,
    companyName: company,
    location,
    salary: raw.salary,
    postedDate,
    datePosted: postedDate,
    daysAgo,
    jobType: employmentType,
    category,
    source,
    workArrangement: raw.workArrangement || (location.includes('Remote') ? 'Remote' : 'Hybrid'),
    employmentType,
    postingStatus: raw.postingStatus || 'Live',
    archivedDate: raw.archivedDate,
    department: raw.department,
    description,
    jobDescription: description,
    rawDescription,
    requirements: keyRequirements,
    keyRequirements,
    skills: matchedSkills,
    matchedSkills,
    missingSkills,
    matchScore,
    matchBreakdown,
    fitSummary: raw.fitSummary || '',
    jobUrl: url,
    sourceUrl: url,
    applyType,
    isDirectApplyLink: applyType === 'direct_ats',
    isSaved: Boolean(raw.isSaved),
    isApplied: Boolean(raw.isApplied),
  };
}

export interface DiscoverJobsRequest {
  masterResume?: MasterResume;
  targetRole?: string;
  location?: string;
  maxAgeDays?: number;
  category?: JobCategory;
  page?: number;
  pageSize?: number;
  seed?: string;
}

export interface DiscoverJobsResponse {
  jobs: DiscoveredJob[];
  total: number;
  page: number;
  hasMore: boolean;
  detectedDate: string; // ISO string from runtime new Date()
  provider?: string;
}

// ---------------------------------------------------------------------------
// Smart Job Ingestion Contracts (Phase 1)
// ---------------------------------------------------------------------------

export type JobImportMode = 'url' | 'text';

export type JobImportErrorCode =
  | 'BOT_BLOCKED'
  | 'INVALID_URL'
  | 'FETCH_FAILED'
  | 'EMPTY_CONTENT'
  | 'PARSE_FAILED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR';

export interface JobImportRequest {
  mode: JobImportMode;
  url?: string;
  rawText?: string;
  masterResume?: MasterResume;
}

export interface ParsedJobData {
  jobTitle: string;
  companyName: string;
  location: string;
  salary?: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  jobDescription: string;
  rawDescription?: string;
  keyRequirements: string[];
  coreTechStack: string[];
  sourceUrl?: string;
  sourceDomain?: string;
}

export interface JobImportResponse {
  success: boolean;
  job?: DiscoveredJob;
  parsedData?: ParsedJobData;
  atsScore?: number;
  matchBreakdown?: MatchBreakdown;
  matchedSkills?: string[];
  missingSkills?: string[];
  fitSummary?: string;
  error?: string;
  errorCode?: JobImportErrorCode;
  suggestedAction?: 'SWITCH_TO_PASTE' | 'RETRY';
  blockedDomain?: string;
}

