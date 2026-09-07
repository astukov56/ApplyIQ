import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  CandidateProfile,
  JobApplication,
  MasterResume,
  TailoredResume,
  CoverLetterItem,
  ResumeVersion,
  GuestSessionPayload,
  MigrationResult,
  isResumeEmpty,
} from '@/types';
import {
  profileToUpsertRow,
  masterResumeToUpsertRow,
  tailoredResumeToInsertRow,
  applicationToInsertRow,
  coverLetterToInsertRow,
} from './mappers';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------
export const AUTH_STORAGE_KEYS = {
  APPLICATIONS: 'applyiq_applications_v2',
  PROFILE: 'applyiq_profile_v2',
  DISCOVERED_JOBS: 'applyiq_discovered_jobs_v2',
  MASTER_RESUME: 'applyiq_master_resume_v2',
  TAILORED_RESUMES: 'applyiq_tailored_resumes_v2',
  COVER_LETTERS: 'applyiq_cover_letters_v2',
  RESUMES: 'applyiq_resumes_v1',
  GUEST_MODE: 'applyiq_guest_mode',
  PENDING_MIGRATION: 'applyiq_pending_guest_migration',
  POST_AUTH_REDIRECT: 'applyiq_post_auth_redirect',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

/**
 * Reads any guest session data currently stored in localStorage.
 */
export function readGuestSessionPayload(): GuestSessionPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawMaster = localStorage.getItem(AUTH_STORAGE_KEYS.MASTER_RESUME);
    const rawProfile = localStorage.getItem(AUTH_STORAGE_KEYS.PROFILE);
    const rawApps = localStorage.getItem(AUTH_STORAGE_KEYS.APPLICATIONS);
    const rawTailored = localStorage.getItem(AUTH_STORAGE_KEYS.TAILORED_RESUMES);
    const rawLetters = localStorage.getItem(AUTH_STORAGE_KEYS.COVER_LETTERS);
    const rawResumes = localStorage.getItem(AUTH_STORAGE_KEYS.RESUMES);

    const masterResume: MasterResume | undefined = rawMaster ? JSON.parse(rawMaster) : undefined;
    const profile: CandidateProfile | undefined = rawProfile ? JSON.parse(rawProfile) : undefined;
    const applications: JobApplication[] | undefined = rawApps ? JSON.parse(rawApps) : undefined;
    const tailoredResumes: TailoredResume[] | undefined = rawTailored ? JSON.parse(rawTailored) : undefined;
    const coverLetters: CoverLetterItem[] | undefined = rawLetters ? JSON.parse(rawLetters) : undefined;
    const resumes: ResumeVersion[] | undefined = rawResumes ? JSON.parse(rawResumes) : undefined;

    // Check if there is any real guest work to migrate
    const hasWork =
      (masterResume && !isResumeEmpty(masterResume, profile)) ||
      (profile && !isResumeEmpty(undefined, profile)) ||
      (applications && applications.length > 0) ||
      (tailoredResumes && tailoredResumes.length > 0) ||
      (coverLetters && coverLetters.length > 0);

    if (!hasWork) return null;

    return {
      masterResume,
      profile,
      applications,
      tailoredResumes,
      coverLetters,
      resumes,
    };
  } catch (err) {
    console.warn('Failed to read guest session from localStorage:', err);
    return null;
  }
}

/**
 * Flags that guest data is ready to be migrated upon authentication.
 */
export function markPendingGuestMigration(returnUrl?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.PENDING_MIGRATION, 'true');
    if (returnUrl) {
      localStorage.setItem(AUTH_STORAGE_KEYS.POST_AUTH_REDIRECT, returnUrl);
    }
  } catch (_) {}
}

/**
 * Clears the pending guest migration flag.
 */
export function clearPendingGuestMigration(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.PENDING_MIGRATION);
    localStorage.removeItem(AUTH_STORAGE_KEYS.POST_AUTH_REDIRECT);
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Supabase Auth Actions
// ---------------------------------------------------------------------------

/**
 * Initiates OAuth Single Sign-On (Google or GitHub).
 * Preserves guest state in localStorage across the browser redirect cycle.
 */
export async function signInWithOAuth(
  sb: SupabaseClient,
  provider: 'google' | 'github',
  returnUrl: string = '/resume'
): Promise<{ error: any }> {
  markPendingGuestMigration(returnUrl);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`;

  const res = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : undefined,
    },
  });

  return { error: res.error };
}

/**
 * Sends a passwordless Magic Link (OTP) to the user's email.
 */
export async function signInWithOtp(
  sb: SupabaseClient,
  email: string,
  returnUrl: string = '/resume'
): Promise<{ error: any }> {
  markPendingGuestMigration(returnUrl);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`;

  const res = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  return { error: res.error };
}

/**
 * Signs in with email and password.
 */
export async function signInWithPassword(
  sb: SupabaseClient,
  email: string,
  password: string
): Promise<{ error: any }> {
  markPendingGuestMigration();
  const res = await sb.auth.signInWithPassword({ email, password });
  return { error: res.error };
}

/**
 * Signs up a new user with email, password, and full name.
 */
export async function signUpWithPassword(
  sb: SupabaseClient,
  email: string,
  password: string,
  fullName: string
): Promise<{ error: any }> {
  markPendingGuestMigration();
  const res = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        name: fullName,
      },
    },
  });
  return { error: res.error };
}

// ---------------------------------------------------------------------------
// Rezi-Style Guest-to-Supabase Data Migration Routine
// ---------------------------------------------------------------------------

/**
 * Migrates client-side guest session state (master resume, profile, tailored snapshots,
 * applications, cover letters) into Supabase PostgreSQL tables linked to user.id.
 */
export async function migrateGuestSessionToSupabase(
  sb: SupabaseClient,
  user: User,
  guestPayload: GuestSessionPayload
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCounts: {
      masterResume: false,
      profile: false,
      tailoredResumes: 0,
      applications: 0,
      coverLetters: 0,
    },
  };

  try {
    const userId = user.id;
    const userEmail = user.email || '';
    const userFullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      userEmail.split('@')[0] ||
      '';

    // 1. Migrate Candidate Profile
    if (guestPayload.profile && !isResumeEmpty(undefined, guestPayload.profile)) {
      const mergedProfile: CandidateProfile = {
        ...guestPayload.profile,
        name: guestPayload.profile.name || userFullName,
        email: guestPayload.profile.email || userEmail,
      };

      const { error: profileErr } = await sb
        .from('profiles')
        .upsert(profileToUpsertRow(mergedProfile, userId));

      if (!profileErr) {
        result.migratedCounts.profile = true;
      } else {
        console.warn('[Migration] Profile upsert warning:', profileErr.message);
      }
    }

    // 2. Migrate Master Resume
    let masterResumeId: string | null = null;

    if (guestPayload.masterResume && !isResumeEmpty(guestPayload.masterResume)) {
      // Check if user already has an existing master_resumes row in Supabase
      const { data: existingMaster } = await sb
        .from('master_resumes')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const validMasterId = existingMaster?.id || ensureUuid(guestPayload.masterResume.id);
      masterResumeId = validMasterId;

      const masterResumeToSave: MasterResume = {
        ...guestPayload.masterResume,
        id: validMasterId,
      };

      const masterRow = masterResumeToUpsertRow(masterResumeToSave, userId);
      masterRow.id = validMasterId;
      masterRow.user_id = userId;

      const { error: masterErr } = await sb.from('master_resumes').upsert(masterRow);

      if (!masterErr) {
        result.migratedCounts.masterResume = true;
      } else {
        console.warn('[Migration] Master resume upsert warning:', masterErr.message);
      }
    }

    // 3. Migrate Tailored Resumes
    if (guestPayload.tailoredResumes && guestPayload.tailoredResumes.length > 0) {
      for (const tailored of guestPayload.tailoredResumes) {
        const tailoredRow = tailoredResumeToInsertRow(tailored, userId);
        tailoredRow.id = ensureUuid(tailored.id);
        if (masterResumeId) {
          tailoredRow.master_resume_id = masterResumeId;
        }

        const { error: tailoredErr } = await sb
          .from('tailored_resumes')
          .upsert(tailoredRow);

        if (!tailoredErr) {
          result.migratedCounts.tailoredResumes += 1;
        } else {
          console.warn('[Migration] Tailored resume upsert warning:', tailoredErr.message);
        }
      }
    }

    // 4. Migrate Active Applications
    if (guestPayload.applications && guestPayload.applications.length > 0) {
      for (const app of guestPayload.applications) {
        const appRow = applicationToInsertRow(app, userId);
        appRow.id = ensureUuid(app.id);

        const { error: appErr } = await sb.from('applications').upsert(appRow);

        if (!appErr) {
          result.migratedCounts.applications += 1;
        } else {
          console.warn('[Migration] Application upsert warning:', appErr.message);
        }
      }
    }

    // 5. Migrate Cover Letters
    if (guestPayload.coverLetters && guestPayload.coverLetters.length > 0) {
      for (const cl of guestPayload.coverLetters) {
        const clRow = coverLetterToInsertRow(cl, userId);
        clRow.id = ensureUuid(cl.id);

        const { error: clErr } = await sb.from('cover_letters').upsert(clRow);

        if (!clErr) {
          result.migratedCounts.coverLetters += 1;
        } else {
          console.warn('[Migration] Cover letter upsert warning:', clErr.message);
        }
      }
    }

    result.success = true;
    clearPendingGuestMigration();
    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown migration error';
    console.error('[Migration] Failed to migrate guest data:', errorMsg);
    result.error = errorMsg;
    return result;
  }
}
