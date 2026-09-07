import type {
  CandidateProfile,
  MasterResume,
  TailoredResume,
  CoverLetterItem,
  JobApplication,
  DiscoveredJob,
  SkillItem,
  WorkExperience,
  Education,
  Project,
} from './index';

// ---------------------------------------------------------------------------
// Supabase Database Row Definitions
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string; // UUID references auth.users(id)
  email: string;
  full_name: string;
  name: string;
  title: string;
  avatar_url: string | null;
  phone: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  website_url: string | null;
  summary: string;
  skills: SkillItem[];
  experiences: WorkExperience[];
  education: Education[];
  projects: Project[];
  created_at: string;
  updated_at: string;
}

export interface MasterResumeRow {
  id: string;
  user_id: string;
  version_name: string;
  summary: string;
  skills: SkillItem[];
  experiences: WorkExperience[];
  education: Education[];
  projects: Project[];
  links: Array<{ label: string; url: string }>;
  created_at: string;
  updated_at: string;
}

export interface TailoredResumeRow {
  id: string;
  user_id: string;
  master_resume_id: string | null;
  job_title: string;
  company_name: string;
  job_description: string;
  resume_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CoverLetterRow {
  id: string;
  user_id: string;
  tailored_resume_id: string | null;
  job_title: string;
  company_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRow {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_url: string;
  job_description: string;
  location: string;
  salary: string | null;
  status: string;
  tailored_resume_id: string | null;
  cover_letter_id: string | null;
  notes: string;
  match_score: number;
  ai_analysis: Record<string, any> | null;
  application_date: string;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredJobRow {
  id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  location: string;
  work_arrangement: string;
  employment_type: string;
  salary: string | null;
  source: string;
  source_url: string;
  date_posted: string;
  posting_status: string;
  archived_date: string | null;
  job_description: string;
  match_score: number;
  fit_summary: string;
  matched_skills: string[];
  missing_skills: string[];
  key_requirements: string[];
  department: string | null;
  is_saved: boolean;
  is_applied: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; email: string };
        Update: Partial<ProfileRow>;
      };
      master_resumes: {
        Row: MasterResumeRow;
        Insert: Partial<MasterResumeRow> & { user_id: string };
        Update: Partial<MasterResumeRow>;
      };
      tailored_resumes: {
        Row: TailoredResumeRow;
        Insert: Partial<TailoredResumeRow> & { user_id: string; job_title: string; company_name: string };
        Update: Partial<TailoredResumeRow>;
      };
      cover_letters: {
        Row: CoverLetterRow;
        Insert: Partial<CoverLetterRow> & { user_id: string; content: string };
        Update: Partial<CoverLetterRow>;
      };
      applications: {
        Row: ApplicationRow;
        Insert: Partial<ApplicationRow> & { user_id: string; company_name: string; job_title: string };
        Update: Partial<ApplicationRow>;
      };
      discovered_jobs: {
        Row: DiscoveredJobRow;
        Insert: Partial<DiscoveredJobRow> & { user_id: string; company_name: string; job_title: string };
        Update: Partial<DiscoveredJobRow>;
      };
    };
  };
}
