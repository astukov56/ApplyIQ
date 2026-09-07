import type { ResumeVersion } from './resume';

export interface CoverLetterResult {
  opening: string;   // "Dear [Company Name] Team,"
  body: string;      // 4-paragraph body text (350–450 words)
  closing: string;   // "Sincerely,\n[Name]"
  fullText: string;  // assembled complete letter
  wordCount?: number;
  targetRole?: string;
  targetCompany?: string;
  subject?: string;
}

export interface TailorResult {
  tailoredResume: ResumeVersion;
  coverLetter?: CoverLetterResult;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  changesSummary: string[];
  extractedCompany: string;
  extractedRole?: string;
  extraSkills: {
    languages: string[];
    frameworks: string[];
    cloudAndData: string[];
    tools: string[];
  };
}

export interface TailorRequest {
  jobDescription: string;
  currentResume: object;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  targetCompany?: string;
  targetRole?: string;
  generateCoverLetter?: boolean;
}

export type ResumeLayoutTheme = 'harvard' | 'modern' | 'minimal';

export interface AtsMatchResult {
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchBreakdown: {
    technical: number;
    roleRelevance: number;
    experienceFit: number;
  };
  fitSummary?: string;
}

export interface DiffItem {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

export interface SectionDiff {
  section: string; // 'Summary' | 'Experience' | 'Projects' | 'Skills' | 'Education' | 'Cover Letter'
  title?: string;
  diffs: DiffItem[];
}

export interface StagedModification {
  id: string;
  instruction: string;
  changeDescription: string;
  documentType?: 'resume' | 'cover_letter';
  originalResume?: ResumeVersion;
  proposedResume?: ResumeVersion;
  originalCoverLetter?: CoverLetterResult;
  proposedCoverLetter?: CoverLetterResult;
  sectionDiffs: SectionDiff[];
  timestamp: Date;
}
