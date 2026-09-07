/**
 * Mappers: Supabase DB rows (snake_case) ↔ TypeScript types (camelCase)
 *
 * All date fields from PostgreSQL:
 *  - `date` columns return "YYYY-MM-DD" strings
 *  - `timestamptz` columns return ISO 8601 strings (e.g. "2026-08-27T02:11:28+00:00")
 *
 * JSONB columns return already-parsed JS values (arrays / objects) from the
 * Supabase JS client — no JSON.parse needed.
 */

import {
  toDiscoveredJob,
  type JobApplication,
  type AIAnalysis,
  type DiscoveredJob,
  type CandidateProfile,
  MasterResume,
  TailoredResume,
  TailoredResumeExperience,
  TailoredResumeProject,
  CoverLetterItem,
  SkillItem,
  WorkExperience,
  Education,
  Project,
  ApplicationStatus,
  WorkArrangement,
  EmploymentType,
  JobSource,
  PostingStatus,
} from '@/types';

/** Raw row returned by Supabase .select() when the client has no DB generic. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

// =============================================================================
// JobApplication
// =============================================================================

export function dbRowToApplication(row: DbRow): JobApplication {
  return {
    id: row.id as string,
    companyName: row.company_name as string,
    jobTitle: row.job_title as string,
    jobDescription: (row.job_description as string) ?? '',
    jobUrl: (row.job_url as string) ?? '',
    applicationDate: row.application_date as string, // "YYYY-MM-DD" from PostgreSQL date
    status: row.status as ApplicationStatus,
    notes: (row.notes as string) ?? '',
    location: (row.location as string) ?? undefined,
    workType: (row.work_type as WorkArrangement) ?? undefined,
    salary: (row.salary as string) ?? undefined,
    tailoredResumeId: (row.tailored_resume_id as string) ?? undefined,
    coverLetterId: (row.cover_letter_id as string) ?? undefined,
    orderIndex: typeof row.order_index === 'number' ? row.order_index : undefined,
    aiAnalysis: (row.ai_analysis as AIAnalysis) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function applicationToInsertRow(
  app: Omit<JobApplication, 'createdAt' | 'updatedAt'>,
  userId: string
): DbRow {
  return {
    id: app.id,
    user_id: userId,
    company_name: app.companyName,
    job_title: app.jobTitle,
    job_description: app.jobDescription,
    job_url: app.jobUrl,
    application_date: app.applicationDate,
    status: app.status,
    notes: app.notes,
    location: app.location ?? null,
    work_type: app.workType ?? null,
    salary: app.salary ?? null,
    tailored_resume_id: app.tailoredResumeId ?? null,
    cover_letter_id: app.coverLetterId ?? null,
    order_index: app.orderIndex ?? null,
    ai_analysis: app.aiAnalysis ?? null,
  };
}

export function applicationPartialToUpdateRow(fields: Partial<JobApplication>): DbRow {
  const row: DbRow = { updated_at: new Date().toISOString() };
  if (fields.companyName !== undefined) row.company_name = fields.companyName;
  if (fields.jobTitle !== undefined) row.job_title = fields.jobTitle;
  if (fields.jobDescription !== undefined) row.job_description = fields.jobDescription;
  if (fields.jobUrl !== undefined) row.job_url = fields.jobUrl;
  if (fields.applicationDate !== undefined) row.application_date = fields.applicationDate;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.notes !== undefined) row.notes = fields.notes;
  if (fields.location !== undefined) row.location = fields.location;
  if (fields.workType !== undefined) row.work_type = fields.workType;
  if (fields.salary !== undefined) row.salary = fields.salary;
  if (fields.tailoredResumeId !== undefined) row.tailored_resume_id = fields.tailoredResumeId ?? null;
  if (fields.coverLetterId !== undefined) row.cover_letter_id = fields.coverLetterId ?? null;
  if (fields.orderIndex !== undefined) row.order_index = fields.orderIndex ?? null;
  if (fields.aiAnalysis !== undefined) row.ai_analysis = fields.aiAnalysis;
  return row;
}

// =============================================================================
// DiscoveredJob
// =============================================================================

export function dbRowToDiscoveredJob(row: DbRow): DiscoveredJob {
  return toDiscoveredJob({
    id: row.id as string,
    jobTitle: row.job_title as string,
    companyName: row.company_name as string,
    location: (row.location as string) ?? 'Sydney, NSW, Australia',
    workArrangement: row.work_arrangement as WorkArrangement,
    employmentType: row.employment_type as EmploymentType,
    salary: (row.salary as string) ?? undefined,
    source: row.source as JobSource,
    sourceUrl: (row.source_url as string) ?? '',
    jobUrl: (row.source_url as string) ?? '',
    datePosted: row.date_posted as string,
    postedDate: row.date_posted as string,
    postingStatus: row.posting_status as PostingStatus,
    archivedDate: (row.archived_date as string) ?? undefined,
    jobDescription: (row.job_description as string) ?? '',
    description: (row.job_description as string) ?? '',
    matchScore: (row.match_score as number) ?? 80,
    fitSummary: (row.fit_summary as string) ?? '',
    matchedSkills: (row.matched_skills as string[]) ?? [],
    skills: (row.matched_skills as string[]) ?? [],
    missingSkills: (row.missing_skills as string[]) ?? [],
    keyRequirements: (row.key_requirements as string[]) ?? [],
    requirements: (row.key_requirements as string[]) ?? [],
    department: (row.department as string) ?? undefined,
    isSaved: (row.is_saved as boolean) ?? false,
    isApplied: (row.is_applied as boolean) ?? false,
  });
}

export function discoveredJobToInsertRow(job: DiscoveredJob, userId: string): DbRow {
  return {
    id: job.id,
    user_id: userId,
    job_title: job.jobTitle,
    company_name: job.companyName,
    location: job.location,
    work_arrangement: job.workArrangement,
    employment_type: job.employmentType,
    salary: job.salary ?? null,
    source: job.source,
    source_url: job.sourceUrl,
    date_posted: job.datePosted,
    posting_status: job.postingStatus,
    archived_date: job.archivedDate ?? null,
    job_description: job.jobDescription,
    match_score: job.matchScore,
    fit_summary: job.fitSummary,
    matched_skills: job.matchedSkills,
    missing_skills: job.missingSkills,
    key_requirements: job.keyRequirements,
    department: job.department ?? null,
    is_saved: job.isSaved ?? false,
    is_applied: job.isApplied ?? false,
  };
}

// =============================================================================
// CandidateProfile
// =============================================================================

export function dbRowToProfile(row: DbRow): CandidateProfile {
  return {
    name: (row.name as string) ?? '',
    title: (row.title as string) ?? '',
    email: (row.email as string) ?? '',
    phone: (row.phone as string) ?? '',
    location: (row.location as string) ?? '',
    linkedinUrl: (row.linkedin_url as string) ?? '',
    githubUrl: (row.github_url as string) ?? '',
    websiteUrl: (row.website_url as string) ?? undefined,
    summary: (row.summary as string) ?? '',
    skills: (row.skills as SkillItem[]) ?? [],
    experiences: (row.experiences as WorkExperience[]) ?? [],
    education: (row.education as Education[]) ?? [],
    projects: (row.projects as Project[]) ?? [],
  };
}

export function profileToUpsertRow(profile: CandidateProfile, userId: string): DbRow {
  return {
    id: userId,
    name: profile.name,
    title: profile.title,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin_url: profile.linkedinUrl,
    github_url: profile.githubUrl,
    website_url: profile.websiteUrl ?? null,
    summary: profile.summary,
    skills: profile.skills,
    experiences: profile.experiences,
    education: profile.education,
    projects: profile.projects,
  };
}

// =============================================================================
// MasterResume
// =============================================================================

export function dbRowToMasterResume(row: DbRow): MasterResume {
  return {
    id: row.id as string,
    versionName: (row.version_name as string) ?? 'Master Resume',
    lastUpdated: row.last_updated as string, // "YYYY-MM-DD"
    summary: (row.summary as string) ?? '',
    skills: (row.skills as SkillItem[]) ?? [],
    experiences: (row.experiences as WorkExperience[]) ?? [],
    education: (row.education as Education[]) ?? [],
    projects: (row.projects as Project[]) ?? [],
  };
}

export function masterResumeToUpsertRow(resume: MasterResume, userId: string): DbRow {
  return {
    id: resume.id,
    user_id: userId,
    version_name: resume.versionName,
    last_updated: resume.lastUpdated,
    summary: resume.summary,
    skills: resume.skills,
    experiences: resume.experiences,
    education: resume.education,
    projects: resume.projects,
  };
}

// =============================================================================
// TailoredResume
// =============================================================================

export function dbRowToTailoredResume(row: DbRow): TailoredResume {
  return {
    id: row.id as string,
    jobId: (row.job_id as string) ?? '',
    targetCompany: (row.target_company as string) ?? '',
    targetPosition: (row.target_position as string) ?? '',
    versionName: (row.version_name as string) ?? '',
    dateGenerated: row.date_generated as string, // "YYYY-MM-DD"
    matchScore: (row.match_score as number) ?? 0,
    changesMade: (row.changes_made as TailoredResume['changesMade']) ?? [],
    tailoredSummary: (row.tailored_summary as string) ?? '',
    tailoredSkills: (row.tailored_skills as string[]) ?? [],
    tailoredExperiences: (row.tailored_experiences as TailoredResumeExperience[]) ?? [],
    tailoredProjects: (row.tailored_projects as TailoredResumeProject[]) ?? [],
    tailoredEducation: (row.tailored_education as Education[]) ?? [],
  };
}

export function tailoredResumeToInsertRow(resume: TailoredResume, userId: string): DbRow {
  return {
    id: resume.id,
    user_id: userId,
    job_id: resume.jobId || null,
    target_company: resume.targetCompany,
    target_position: resume.targetPosition,
    version_name: resume.versionName,
    date_generated: resume.dateGenerated,
    match_score: resume.matchScore,
    changes_made: resume.changesMade,
    tailored_summary: resume.tailoredSummary,
    tailored_skills: resume.tailoredSkills,
    tailored_experiences: resume.tailoredExperiences,
    tailored_projects: resume.tailoredProjects,
    tailored_education: resume.tailoredEducation,
  };
}

export function tailoredResumePartialToUpdateRow(updates: Partial<TailoredResume>): DbRow {
  const row: DbRow = { updated_at: new Date().toISOString() };
  if (updates.versionName !== undefined) row.version_name = updates.versionName;
  if (updates.matchScore !== undefined) row.match_score = updates.matchScore;
  if (updates.changesMade !== undefined) row.changes_made = updates.changesMade;
  if (updates.tailoredSummary !== undefined) row.tailored_summary = updates.tailoredSummary;
  if (updates.tailoredSkills !== undefined) row.tailored_skills = updates.tailoredSkills;
  if (updates.tailoredExperiences !== undefined) row.tailored_experiences = updates.tailoredExperiences;
  if (updates.tailoredProjects !== undefined) row.tailored_projects = updates.tailoredProjects;
  if (updates.tailoredEducation !== undefined) row.tailored_education = updates.tailoredEducation;
  return row;
}

// =============================================================================
// CoverLetterItem
// =============================================================================

export function dbRowToCoverLetter(row: DbRow): CoverLetterItem {
  return {
    id: row.id as string,
    jobId: (row.job_id as string) ?? '',
    targetCompany: (row.target_company as string) ?? '',
    targetPosition: (row.target_position as string) ?? '',
    dateGenerated: row.date_generated as string, // "YYYY-MM-DD"
    recipientName: (row.recipient_name as string) ?? undefined,
    bodyText: (row.body_text as string) ?? '',
  };
}

export function coverLetterToInsertRow(letter: CoverLetterItem, userId: string): DbRow {
  return {
    id: letter.id,
    user_id: userId,
    job_id: letter.jobId || null,
    target_company: letter.targetCompany,
    target_position: letter.targetPosition,
    date_generated: letter.dateGenerated,
    recipient_name: letter.recipientName ?? null,
    body_text: letter.bodyText,
  };
}
