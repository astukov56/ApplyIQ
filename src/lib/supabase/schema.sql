-- =============================================================================
-- ApplyIQ — Supabase Database Schema
-- =============================================================================
-- Run this migration in the Supabase SQL Editor or via the Supabase CLI:
--   supabase db push
-- =============================================================================

-- Enable UUID generation (pgcrypto ships with every Supabase project)
-- gen_random_uuid() is available natively in PostgreSQL 13+.

-- =============================================================================
-- TABLE: profiles
-- Stores candidate profile data keyed to Supabase Auth user IDs.
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  title       text not null default '',
  email       text not null default '',
  phone       text not null default '',
  location    text not null default '',
  linkedin_url  text not null default '',
  github_url    text not null default '',
  website_url   text,
  summary     text not null default '',
  -- Skills, experiences, education, and projects are stored as JSONB arrays
  -- for MVP simplicity. These can be normalised into separate tables in future.
  skills        jsonb not null default '[]'::jsonb,
  experiences   jsonb not null default '[]'::jsonb,
  education     jsonb not null default '[]'::jsonb,
  projects      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: job_applications
-- One row per tracked job application per user.
-- =============================================================================
create table if not exists public.job_applications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  company_name      text not null,
  job_title         text not null,
  job_description   text not null default '',
  job_url           text not null default '',
  application_date  date not null default current_date,
  status            text not null default 'Applied'
                      check (status in ('Saved','Applied','Assessment','Interview','Offer','Rejected')),
  notes             text not null default '',
  location          text,
  work_type         text check (work_type in ('Remote','Hybrid','On-site')),
  salary            text,
  -- AI analysis stored as a JSONB blob matching the AIAnalysis TypeScript type
  ai_analysis       jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================================================
-- TABLE: discovered_jobs
-- AI-discovered job listings, optionally archived when postings expire.
-- =============================================================================
create table if not exists public.discovered_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  job_title         text not null,
  company_name      text not null,
  location          text not null default '',
  work_arrangement  text not null default 'Hybrid'
                      check (work_arrangement in ('Remote','Hybrid','On-site')),
  employment_type   text not null default 'Full-time'
                      check (employment_type in ('Full-time','Contract','Internship','Part-time','Graduate')),
  salary            text,
  source            text not null
                      check (source in ('LinkedIn','SEEK','Indeed','Company Site','GradConnection')),
  source_url        text not null default '',
  date_posted       timestamptz not null default now(),
  posting_status    text not null default 'Live'
                      check (posting_status in ('Live','Expired','Unavailable','Archived')),
  archived_date     date,
  job_description   text not null default '',
  match_score       integer not null default 0 check (match_score between 0 and 100),
  fit_summary       text not null default '',
  matched_skills    text[] not null default '{}',
  missing_skills    text[] not null default '{}',
  key_requirements  text[] not null default '{}',
  department        text,
  is_saved          boolean not null default false,
  is_applied        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================================================
-- TABLE: master_resumes
-- One master resume per user (synced with profile).
-- =============================================================================
create table if not exists public.master_resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  version_name  text not null default 'Master Resume',
  last_updated  date not null default current_date,
  summary       text not null default '',
  -- Mirrors profile JSONB structure for ease of syncing
  skills        jsonb not null default '[]'::jsonb,
  experiences   jsonb not null default '[]'::jsonb,
  education     jsonb not null default '[]'::jsonb,
  projects      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- TABLE: tailored_resumes
-- AI-tailored resume variants generated for specific discovered jobs.
-- =============================================================================
create table if not exists public.tailored_resumes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  job_id                uuid references public.discovered_jobs(id) on delete set null,
  target_company        text not null,
  target_position       text not null,
  version_name          text not null,
  date_generated        date not null default current_date,
  match_score           integer not null default 0 check (match_score between 0 and 100),
  changes_made          jsonb not null default '[]'::jsonb,
  tailored_summary      text not null default '',
  tailored_skills       text[] not null default '{}',
  tailored_experiences  jsonb not null default '[]'::jsonb,
  tailored_projects     jsonb not null default '[]'::jsonb,
  tailored_education    jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- =============================================================================
-- TABLE: cover_letters
-- Generated cover letters linked to discovered jobs.
-- =============================================================================
create table if not exists public.cover_letters (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  job_id           uuid references public.discovered_jobs(id) on delete set null,
  target_company   text not null,
  target_position  text not null,
  date_generated   date not null default current_date,
  recipient_name   text,
  body_text        text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- All tables enforce user-scoped access: each user can only see and mutate
-- their own rows.
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.job_applications enable row level security;
alter table public.discovered_jobs  enable row level security;
alter table public.master_resumes   enable row level security;
alter table public.tailored_resumes enable row level security;
alter table public.cover_letters    enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- job_applications
create policy "Users can manage own applications"
  on public.job_applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- discovered_jobs
create policy "Users can manage own discovered jobs"
  on public.discovered_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- master_resumes
create policy "Users can manage own master resume"
  on public.master_resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- tailored_resumes
create policy "Users can manage own tailored resumes"
  on public.tailored_resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- cover_letters
create policy "Users can manage own cover letters"
  on public.cover_letters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- INDEXES for performance on common query patterns
-- =============================================================================

create index if not exists idx_job_applications_user_id
  on public.job_applications(user_id);

create index if not exists idx_job_applications_status
  on public.job_applications(user_id, status);

create index if not exists idx_discovered_jobs_user_id
  on public.discovered_jobs(user_id);

create index if not exists idx_discovered_jobs_status
  on public.discovered_jobs(user_id, posting_status);

create index if not exists idx_tailored_resumes_user_id
  on public.tailored_resumes(user_id);

create index if not exists idx_tailored_resumes_job_id
  on public.tailored_resumes(job_id);

create index if not exists idx_cover_letters_user_id
  on public.cover_letters(user_id);

create index if not exists idx_cover_letters_job_id
  on public.cover_letters(job_id);

-- =============================================================================
-- TRIGGER: auto-update updated_at timestamps
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_job_applications_updated_at
  before update on public.job_applications
  for each row execute procedure public.handle_updated_at();

create or replace trigger trg_discovered_jobs_updated_at
  before update on public.discovered_jobs
  for each row execute procedure public.handle_updated_at();

create or replace trigger trg_tailored_resumes_updated_at
  before update on public.tailored_resumes
  for each row execute procedure public.handle_updated_at();

create or replace trigger trg_cover_letters_updated_at
  before update on public.cover_letters
  for each row execute procedure public.handle_updated_at();

create or replace trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
