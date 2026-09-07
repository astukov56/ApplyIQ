/**
 * Generic, completely empty initial resume structure.
 * Used as the clean baseline for unauthenticated guests and newly registered users.
 */
export const EMPTY_RESUME = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  },
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
};

export type EmptyResumeType = typeof EMPTY_RESUME;

/**
 * Check if a resume or profile object is an empty clean slate
 */
export function isResumeStateEmpty(resumeData: {
  personalInfo?: { fullName?: string };
  name?: string;
  experience?: any[];
  experiences?: any[];
  skills?: any[];
}): boolean {
  const fullName = resumeData.personalInfo?.fullName ?? resumeData.name ?? '';
  const exps = resumeData.experience ?? resumeData.experiences ?? [];
  return !fullName.trim() && exps.length === 0;
}
