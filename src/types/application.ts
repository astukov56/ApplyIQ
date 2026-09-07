export type KanbanStatus =
  | 'wishlist'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected';

export type ApplicationStatus =
  | 'Saved'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'wishlist'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected';

export interface KeyRequirement {
  requirement: string;
  candidateFit: 'Strong' | 'Moderate' | 'Missing';
  note: string;
}

export interface AIAnalysis {
  matchScore: number;
  fitSummary: string;
  matchedSkills: string[];
  missingSkills: string[];
  keyRequirements: KeyRequirement[];
  cvRecommendations: string[];
  coverLetterDraft: string;
  analyzedAt?: string; // ISO 8601 datetime string
}

export interface JobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  jobUrl: string;
  applicationDate: string; // ISO 8601 date string (YYYY-MM-DD)
  status: ApplicationStatus;
  notes: string;
  location?: string;
  workType?: 'Remote' | 'Hybrid' | 'On-site';
  salary?: string;
  tailoredResumeId?: string; // Link to generated resume snapshot
  coverLetterId?: string;    // Link to generated cover letter
  aiAnalysis?: AIAnalysis;
  orderIndex?: number;
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string; // ISO 8601 datetime string
}

/**
 * Standard ApplicationCard interface representing a Kanban board card item.
 */
export interface ApplicationCard {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  appliedDate: string;
  status: KanbanStatus;
  tailoredResumeId?: string;
  coverLetterId?: string;
  notes?: string;
  updatedAt: string;
  // Extended fields for rich features
  createdAt?: string;
  jobDescription?: string;
  workType?: 'Remote' | 'Hybrid' | 'On-site';
  aiAnalysis?: AIAnalysis;
  orderIndex?: number;
}

export interface ApplicationColumn {
  id: KanbanStatus;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  bgLight: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

export const KANBAN_COLUMNS: ApplicationColumn[] = [
  {
    id: 'wishlist',
    title: 'Wishlist',
    description: 'Saved opportunities to research or tailor for',
    color: 'slate',
    borderColor: 'border-slate-200 dark:border-slate-800',
    bgLight: 'bg-slate-50/80 dark:bg-slate-900/40',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'applied',
    title: 'Applied',
    description: 'Submitted applications awaiting initial response',
    color: 'blue',
    borderColor: 'border-blue-200/70 dark:border-blue-800/40',
    bgLight: 'bg-blue-50/40 dark:bg-blue-950/20',
    badgeBg: 'bg-blue-100/80 dark:bg-blue-900/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'interviewing',
    title: 'Interviewing',
    description: 'Online tests, recruiter screens & technical rounds',
    color: 'amber',
    borderColor: 'border-amber-200/70 dark:border-amber-800/40',
    bgLight: 'bg-amber-50/40 dark:bg-amber-950/20',
    badgeBg: 'bg-amber-100/80 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'offer',
    title: 'Offer',
    description: 'Received formal offers under negotiation or accepted',
    color: 'emerald',
    borderColor: 'border-emerald-200/70 dark:border-emerald-800/40',
    bgLight: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    badgeBg: 'bg-emerald-100/80 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'rejected',
    title: 'Rejected',
    description: 'Closed, declined, or not moving forward',
    color: 'rose',
    borderColor: 'border-rose-200/70 dark:border-rose-800/40',
    bgLight: 'bg-rose-50/40 dark:bg-rose-950/20',
    badgeBg: 'bg-rose-100/80 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    dotColor: 'bg-rose-500',
  },
];

/**
 * Normalizes any application status to the 5 canonical Kanban statuses.
 */
export function toKanbanStatus(status: ApplicationStatus | string | undefined | null): KanbanStatus {
  if (!status) return 'wishlist';
  const s = status.toLowerCase();
  if (s === 'wishlist' || s === 'saved') return 'wishlist';
  if (s === 'applied') return 'applied';
  if (s === 'interviewing' || s === 'interview' || s === 'assessment') return 'interviewing';
  if (s === 'offer') return 'offer';
  if (s === 'rejected') return 'rejected';
  return 'applied';
}

/**
 * Converts a KanbanStatus to the legacy display string format.
 */
export function fromKanbanStatus(status: KanbanStatus): ApplicationStatus {
  switch (status) {
    case 'wishlist':
      return 'Saved';
    case 'applied':
      return 'Applied';
    case 'interviewing':
      return 'Interview';
    case 'offer':
      return 'Offer';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Applied';
  }
}

/**
 * Converts a JobApplication model to an ApplicationCard.
 */
export function toApplicationCard(app: JobApplication): ApplicationCard {
  return {
    id: app.id,
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    jobUrl: app.jobUrl,
    location: app.location,
    salary: app.salary,
    appliedDate: app.applicationDate,
    status: toKanbanStatus(app.status),
    tailoredResumeId: app.tailoredResumeId,
    coverLetterId: app.coverLetterId,
    notes: app.notes,
    updatedAt: app.updatedAt,
    createdAt: app.createdAt,
    jobDescription: app.jobDescription,
    workType: app.workType,
    aiAnalysis: app.aiAnalysis,
    orderIndex: app.orderIndex,
  };
}
