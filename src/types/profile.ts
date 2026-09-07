export type SkillCategory = 'Languages' | 'Frameworks' | 'Cloud & DB' | 'Tools & Other';
export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: SkillProficiency;
}

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string; // e.g. "2023-01"
  endDate: string; // e.g. "Present" or "2024-02"
  isCurrent: boolean;
  highlights: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade?: string;
  details?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  highlights?: string[];
}

export interface CandidateProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl?: string;
  summary: string;
  skills: SkillItem[];
  experiences: WorkExperience[];
  education: Education[];
  projects: Project[];
}
