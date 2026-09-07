-- =============================================================================
-- ApplyIQ — Supabase Database Migration (20260901_init_schema.sql)
-- =============================================================================
-- Multi-tenant schema with strict Row-Level Security (RLS) policies.
-- Run in Supabase SQL Editor or via Supabase CLI: supabase db push
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================================================
-- TABLE: profiles
-- Stores candidate profile information linked 1:1 to auth.users.
-- =============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null default '',
  full_name       text not null default '',
  name            text not null default '',
  title           text not null default '',
  avatar_url      text,
  phone           text not null default '',
  location        text not null default 'Sydney, NSW, Australia',
  linkedin_url    text not null default '',
  github_url      text not null default '',
  website_url     text,
  summary         text not null default '',
  skills          jsonb not null default '[]'::jsonb,
  experiences     jsonb not null default '[]'::jsonb,
  education       jsonb not null default '[]'::jsonb,
  projects        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- =============================================================================
-- TABLE: master_resumes
-- Master Resume profile for candidate tailoring and ATS scoring.
-- =============================================================================
create table if not exists public.master_resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  version_name  text not null default 'Master Resume',
  summary       text not null default '',
  skills        jsonb not null default '[]'::jsonb,
  experiences   jsonb not null default '[]'::jsonb,
  education     jsonb not null default '[]'::jsonb,
  projects      jsonb not null default '[]'::jsonb,
  links         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_master_resumes_user_id on public.master_resumes(user_id);
alter table public.master_resumes enable row level security;

create policy "Users can view own master resumes"
  on public.master_resumes for select
  using (auth.uid() = user_id);

create policy "Users can insert own master resumes"
  on public.master_resumes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own master resumes"
  on public.master_resumes for update
  using (auth.uid() = user_id);

create policy "Users can delete own master resumes"
  on public.master_resumes for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- TABLE: tailored_resumes
-- Tailored resume snapshots generated for specific job postings.
-- =============================================================================
create table if not exists public.tailored_resumes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  master_resume_id  uuid references public.master_resumes(id) on delete set null,
  job_title         text not null,
  company_name      text not null,
  job_description   text not null default '',
  resume_data       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_tailored_resumes_user_id on public.tailored_resumes(user_id);
alter table public.tailored_resumes enable row level security;

create policy "Users can view own tailored resumes"
  on public.tailored_resumes for select
  using (auth.uid() = user_id);

create policy "Users can insert own tailored resumes"
  on public.tailored_resumes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tailored resumes"
  on public.tailored_resumes for update
  using (auth.uid() = user_id);

create policy "Users can delete own tailored resumes"
  on public.tailored_resumes for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- TABLE: cover_letters
-- Generated cover letters linked to tailored resumes.
-- =============================================================================
create table if not exists public.cover_letters (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  tailored_resume_id  uuid references public.tailored_resumes(id) on delete set null,
  job_title           text not null default '',
  company_name        text not null default '',
  content             text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_cover_letters_user_id on public.cover_letters(user_id);
alter table public.cover_letters enable row level security;

create policy "Users can view own cover letters"
  on public.cover_letters for select
  using (auth.uid() = user_id);

create policy "Users can insert own cover letters"
  on public.cover_letters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cover letters"
  on public.cover_letters for update
  using (auth.uid() = user_id);

create policy "Users can delete own cover letters"
  on public.cover_letters for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- TABLE: applications
-- Kanban application tracker records.
-- =============================================================================
create table if not exists public.applications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  company_name        text not null,
  job_title           text not null,
  job_url             text not null default '',
  job_description     text not null default '',
  location            text not null default 'Sydney, NSW',
  salary              text,
  status              text not null default 'applied'
                        check (status in ('wishlist','applied','interviewing','offer','rejected','Saved','Applied','Assessment','Interview','Offer','Rejected')),
  tailored_resume_id  uuid references public.tailored_resumes(id) on delete set null,
  cover_letter_id     uuid references public.cover_letters(id) on delete set null,
  notes               text not null default '',
  match_score         integer not null default 0 check (match_score between 0 and 100),
  ai_analysis         jsonb,
  application_date    date not null default current_date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_applications_user_id on public.applications(user_id);
alter table public.applications enable row level security;

create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- TABLE: discovered_jobs
-- Discovered job recommendation records per user.
-- =============================================================================
create table if not exists public.discovered_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  job_title         text not null,
  company_name      text not null,
  location          text not null default '',
  work_arrangement  text not null default 'Hybrid',
  employment_type   text not null default 'Full-time',
  salary            text,
  source            text not null default 'Company Site',
  source_url        text not null default '',
  date_posted       timestamptz not null default now(),
  posting_status    text not null default 'Live',
  archived_date     date,
  job_description   text not null default '',
  match_score       integer not null default 0,
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

create index if not exists idx_discovered_jobs_user_id on public.discovered_jobs(user_id);
alter table public.discovered_jobs enable row level security;

create policy "Users can view own discovered jobs"
  on public.discovered_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own discovered jobs"
  on public.discovered_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own discovered jobs"
  on public.discovered_jobs for update
  using (auth.uid() = user_id);

create policy "Users can delete own discovered jobs"
  on public.discovered_jobs for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- TRIGGER: Auto-provision profile on auth.users sign-up
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_name text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, name, title)
  values (
    new.id,
    coalesce(new.email, ''),
    user_name,
    user_name,
    'Software Engineer'
  )
  on conflict (id) do nothing;

  -- Create initial default master resume
  insert into public.master_resumes (user_id, version_name, summary)
  values (
    new.id,
    'Master Resume',
    'Full stack engineer focused on scalable web applications and cloud architecture.'
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
