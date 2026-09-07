'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  CandidateProfile,
  Education,
  JobApplication,
  Project,
  SkillItem,
  WorkExperience,
  ApplicationStatus,
  DiscoveredJob,
  MasterResume,
  TailoredResume,
  CoverLetterItem,
  ResumeVersion,
} from '@/types';
import {
  INITIAL_APPLICATIONS,
  INITIAL_PROFILE,
  INITIAL_DISCOVERED_JOBS,
  INITIAL_MASTER_RESUME,
  INITIAL_TAILORED_RESUMES,
  INITIAL_COVER_LETTERS,
  EMPTY_PROFILE,
  EMPTY_MASTER_RESUME,
} from '@/data/mockData';
import {
  AUTH_STORAGE_KEYS,
  readGuestSessionPayload,
  migrateGuestSessionToSupabase,
  clearPendingGuestMigration,
  signInWithOAuth as authSignInWithOAuth,
  signInWithOtp as authSignInWithOtp,
} from '@/lib/supabase/auth';
import {
  dbRowToApplication,
  applicationToInsertRow,
  applicationPartialToUpdateRow,
  dbRowToDiscoveredJob,
  dbRowToProfile,
  profileToUpsertRow,
  dbRowToMasterResume,
  masterResumeToUpsertRow,
  dbRowToTailoredResume,
  tailoredResumeToInsertRow,
  tailoredResumePartialToUpdateRow,
  dbRowToCoverLetter,
  coverLetterToInsertRow,
  discoveredJobToInsertRow,
} from '@/lib/supabase/mappers';
import { isResumeEmpty, MigrationResult } from '@/types';

// ---------------------------------------------------------------------------
// Supabase readiness — true only when real credentials have been provided.
// ---------------------------------------------------------------------------
const SUPABASE_READY =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') === true &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0) > 20;

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
export interface AuthModalOptions {
  title?: string;
  description?: string;
  returnUrl?: string;
  onSuccess?: () => void;
}

interface AppContextType {
  /** Supabase Auth user — null when not authenticated or in guest mode. */
  user: User | null;
  session: Session | null;
  isLoadingAuth: boolean;
  isGuestMode: boolean;

  profile: CandidateProfile;
  applications: JobApplication[];
  discoveredJobs: DiscoveredJob[];
  masterResume: MasterResume;
  tailoredResumes: TailoredResume[];
  coverLetters: CoverLetterItem[];
  isLoaded: boolean;

  // Guest Onboarding & Migration State
  hasMasterResume: boolean;
  isMigratingGuestData: boolean;
  migrationSuccess: boolean;

  // Auth Modal Controls
  isAuthModalOpen: boolean;
  authModalOptions: AuthModalOptions | null;
  openAuthModal: (options?: AuthModalOptions) => void;
  closeAuthModal: () => void;

  // Auth Actions
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithOAuth: (provider: 'github' | 'google', returnUrl?: string) => Promise<{ error: any }>;
  signInWithOtp: (email: string, returnUrl?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  migrateGuestData: (targetUser?: User) => Promise<MigrationResult>;

  // Profile Actions
  updateProfile: (profile: Partial<CandidateProfile>) => void;
  addSkill: (skill: Omit<SkillItem, 'id'>) => void;
  removeSkill: (id: string) => void;
  addExperience: (exp: Omit<WorkExperience, 'id'>) => void;
  updateExperience: (id: string, exp: Partial<WorkExperience>) => void;
  deleteExperience: (id: string) => void;
  addEducation: (edu: Omit<Education, 'id'>) => void;
  updateEducation: (id: string, edu: Partial<Education>) => void;
  deleteEducation: (id: string) => void;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Applications Actions
  addApplication: (appData: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) => JobApplication;
  updateApplication: (id: string, appData: Partial<JobApplication>) => void;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void;
  moveApplication: (id: string, newStatus: ApplicationStatus, targetIndex?: number) => void;
  reorderApplications: (reordered: JobApplication[]) => void;
  linkResumeToApplication: (appId: string, resumeId: string | undefined) => void;
  linkCoverLetterToApplication: (appId: string, coverLetterId: string | undefined) => void;
  deleteApplication: (id: string) => void;
  getApplication: (id: string) => JobApplication | undefined;

  // Job Discovery & Ingestion Actions
  getDiscoveredJob: (id: string) => DiscoveredJob | undefined;
  toggleSaveJob: (jobId: string) => void;
  toggleApplyJob: (jobId: string) => void;
  addImportedJob: (job: DiscoveredJob) => void;
  addJobToApplications: (job: DiscoveredJob, initialStatus?: ApplicationStatus) => JobApplication;

  // Resume & Tailoring Actions
  updateMasterResume: (updates: Partial<MasterResume> & Partial<CandidateProfile>) => void;
  tailorResumeForJob: (jobId: string) => TailoredResume;
  getTailoredResume: (idOrJobId: string) => TailoredResume | undefined;
  updateTailoredResume: (id: string, updates: Partial<TailoredResume>) => void;

  // Multi-version Resume Actions
  resumes: ResumeVersion[];
  getMasterResume: () => ResumeVersion;
  createTailoredResume: (tailoredData: Partial<ResumeVersion>, title: string) => ResumeVersion;
  updateResumeVersion: (id: string, updates: Partial<ResumeVersion>) => void;
  deleteResumeVersion: (id: string) => void;

  // Cover Letter Actions
  generateCoverLetterForJob: (jobId: string) => CoverLetterItem;
  saveCoverLetter: (letter: Omit<CoverLetterItem, 'id'>) => CoverLetterItem;
  getCoverLetter: (idOrJobId: string) => CoverLetterItem | undefined;
  updateCoverLetter: (id: string, bodyText: string) => void;
  deleteCoverLetter: (id: string) => void;

  // Data Reset
  resetToMockData: () => void;
  resetMasterResume: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = AUTH_STORAGE_KEYS;

/** Build the initial master ResumeVersion from a MasterResume + profile snapshot. */
function buildInitialMasterVersion(master: MasterResume): ResumeVersion {
  return {
    id: master.id,
    title: master.versionName,
    isMaster: true,
    createdAt: master.lastUpdated + 'T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    summary: master.summary,
    skills: master.skills,
    experiences: master.experiences,
    education: master.education,
    projects: master.projects,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Unauthenticated sessions default to a clean, empty slate (EMPTY_RESUME)
  const [profile, setProfile] = useState<CandidateProfile>(EMPTY_PROFILE);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [discoveredJobs, setDiscoveredJobs] = useState<DiscoveredJob[]>(INITIAL_DISCOVERED_JOBS);
  const [masterResume, setMasterResume] = useState<MasterResume>(EMPTY_MASTER_RESUME);
  const [tailoredResumes, setTailoredResumes] = useState<TailoredResume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [resumes, setResumes] = useState<ResumeVersion[]>([buildInitialMasterVersion(EMPTY_MASTER_RESUME)]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Supabase Auth State
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);

  // Guest Onboarding, Migration & Auth Modal State
  const [isMigratingGuestData, setIsMigratingGuestData] = useState<boolean>(false);
  const [migrationSuccess, setMigrationSuccess] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalOptions, setAuthModalOptions] = useState<AuthModalOptions | null>(null);

  const hasMasterResume = !isResumeEmpty(masterResume, profile);

  /** Stable ref to the Supabase client */
  const sbRef = useRef<SupabaseClient | null>(null);

  // Helper — returns client + user ID only when Supabase is authenticated.
  const sbCtx = (): { sb: SupabaseClient; uid: string } | null => {
    const sb = sbRef.current;
    const uid = supabaseUser?.id;
    return sb && uid ? { sb, uid } : null;
  };

  // Helper: load localStorage demo sandbox data
  const hydrateFromLocalStorage = () => {
    try {
      const storedApps = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      const storedJobs = localStorage.getItem(STORAGE_KEYS.DISCOVERED_JOBS);
      const storedMaster = localStorage.getItem(STORAGE_KEYS.MASTER_RESUME);
      const storedTailored = localStorage.getItem(STORAGE_KEYS.TAILORED_RESUMES);
      const storedLetters = localStorage.getItem(STORAGE_KEYS.COVER_LETTERS);
      const storedResumes = localStorage.getItem(STORAGE_KEYS.RESUMES);
      const guestStored = localStorage.getItem(STORAGE_KEYS.GUEST_MODE);

      if (guestStored === 'false') {
        setIsGuestMode(false);
      } else {
        setIsGuestMode(true);
      }

      if (storedApps) setApplications(JSON.parse(storedApps));
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      } else {
        setProfile(EMPTY_PROFILE);
      }
      if (storedJobs) setDiscoveredJobs(JSON.parse(storedJobs));
      if (storedMaster) {
        const parsed: MasterResume = JSON.parse(storedMaster);
        setMasterResume(parsed);
        if (!storedResumes) {
          setResumes([buildInitialMasterVersion(parsed)]);
        }
      } else {
        setMasterResume(EMPTY_MASTER_RESUME);
        setResumes([buildInitialMasterVersion(EMPTY_MASTER_RESUME)]);
      }
      if (storedTailored) setTailoredResumes(JSON.parse(storedTailored));
      if (storedLetters) setCoverLetters(JSON.parse(storedLetters));
      if (storedResumes) setResumes(JSON.parse(storedResumes));
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
  };

  // Hydrate from Supabase database tables for an authenticated user
  const hydrateFromSupabase = async (sb: SupabaseClient, user: User) => {
    try {
      const [appsRes, jobsRes, profileRes, masterRes, tailoredRes, lettersRes] =
        await Promise.all([
          sb
            .from('applications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          sb
            .from('discovered_jobs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          sb.from('master_resumes').select('*').eq('user_id', user.id).maybeSingle(),
          sb
            .from('tailored_resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          sb
            .from('cover_letters')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (!appsRes.error && appsRes.data?.length) {
        setApplications(appsRes.data.map(dbRowToApplication));
      }
      if (!jobsRes.error && jobsRes.data?.length) {
        setDiscoveredJobs(jobsRes.data.map(dbRowToDiscoveredJob));
      }
      if (!profileRes.error && profileRes.data) {
        setProfile(dbRowToProfile(profileRes.data));
      } else {
        setProfile(EMPTY_PROFILE);
      }
      if (!masterRes.error && masterRes.data) {
        const mr = dbRowToMasterResume(masterRes.data);
        setMasterResume(mr);
        setResumes([buildInitialMasterVersion(mr)]);
      } else {
        setMasterResume(EMPTY_MASTER_RESUME);
        setResumes([buildInitialMasterVersion(EMPTY_MASTER_RESUME)]);
      }
      if (!tailoredRes.error && tailoredRes.data?.length) {
        setTailoredResumes(tailoredRes.data.map(dbRowToTailoredResume));
      }
      if (!lettersRes.error && lettersRes.data?.length) {
        setCoverLetters(lettersRes.data.map(dbRowToCoverLetter));
      }
    } catch (err) {
      console.warn('Error hydrating from Supabase tables:', err);
    }
  };

  /**
   * Rezi-style guest-to-authenticated data migration execution
   */
  const migrateGuestData = async (targetUser?: User): Promise<MigrationResult> => {
    const userToMigrate = targetUser || supabaseUser;
    const sb = sbRef.current;
    if (!sb || !userToMigrate) {
      return {
        success: false,
        migratedCounts: {
          masterResume: false,
          profile: false,
          tailoredResumes: 0,
          applications: 0,
          coverLetters: 0,
        },
        error: 'Supabase client or authenticated user is not ready.',
      };
    }

    const payload = readGuestSessionPayload();
    if (!payload) {
      clearPendingGuestMigration();
      return {
        success: true,
        migratedCounts: {
          masterResume: false,
          profile: false,
          tailoredResumes: 0,
          applications: 0,
          coverLetters: 0,
        },
      };
    }

    setIsMigratingGuestData(true);
    const result = await migrateGuestSessionToSupabase(sb, userToMigrate, payload);
    setIsMigratingGuestData(false);

    if (result.success) {
      setMigrationSuccess(true);
      setTimeout(() => setMigrationSuccess(false), 6000);
      await hydrateFromSupabase(sb, userToMigrate);
    }
    return result;
  };

  // =========================================================================
  // AUTHENTICATION & HYDRATION LIFECYCLE
  // =========================================================================
  useEffect(() => {
    if (!SUPABASE_READY) {
      hydrateFromLocalStorage();
      setIsLoadingAuth(false);
      setIsLoaded(true);
      return;
    }

    const sb = createClient();
    sbRef.current = sb;

    // Routine to handle post-login state migration & hydration
    const handleAuthenticatedUser = async (user: User) => {
      setIsGuestMode(false);
      try {
        const guestPayload = readGuestSessionPayload();
        if (guestPayload) {
          setIsMigratingGuestData(true);
          const migRes = await migrateGuestSessionToSupabase(sb, user, guestPayload);
          setIsMigratingGuestData(false);
          if (migRes.success) {
            setMigrationSuccess(true);
            setTimeout(() => setMigrationSuccess(false), 6000);
          }
        }
      } catch (migErr) {
        console.warn('Auto-migration warning:', migErr);
        setIsMigratingGuestData(false);
      }
      await hydrateFromSupabase(sb, user);
    };

    // Get initial session
    sb.auth.getSession().then(async ({ data: { session } }) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        await handleAuthenticatedUser(session.user);
      } else {
        hydrateFromLocalStorage();
      }
      setIsLoaded(true);
      setIsLoadingAuth(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (event, session) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await handleAuthenticatedUser(session.user);
        } else {
          setIsGuestMode(false);
          await hydrateFromSupabase(sb, session.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================================
  // LOCALSTORAGE PERSISTENCE (Guest / Demo Sandbox Mode)
  // =========================================================================
  useEffect(() => {
    if (!isLoaded || supabaseUser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEYS.DISCOVERED_JOBS, JSON.stringify(discoveredJobs));
      localStorage.setItem(STORAGE_KEYS.MASTER_RESUME, JSON.stringify(masterResume));
      localStorage.setItem(STORAGE_KEYS.TAILORED_RESUMES, JSON.stringify(tailoredResumes));
      localStorage.setItem(STORAGE_KEYS.COVER_LETTERS, JSON.stringify(coverLetters));
      localStorage.setItem(STORAGE_KEYS.RESUMES, JSON.stringify(resumes));
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, isGuestMode ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [
    applications,
    profile,
    discoveredJobs,
    masterResume,
    tailoredResumes,
    coverLetters,
    resumes,
    isLoaded,
    supabaseUser,
    isGuestMode,
  ]);

  // =========================================================================
  // AUTH ACTION METHODS & MODAL CONTROLS
  // =========================================================================
  const openAuthModal = (options?: AuthModalOptions) => {
    setAuthModalOptions(options || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalOptions(null);
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!sbRef.current) {
      return { error: { message: 'Supabase is not configured' } };
    }
    const res = await sbRef.current.auth.signInWithPassword({ email, password });
    return { error: res.error };
  };

  const signUpWithPassword = async (email: string, password: string, fullName: string) => {
    if (!sbRef.current) {
      return { error: { message: 'Supabase is not configured' } };
    }
    const res = await sbRef.current.auth.signUp({
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
  };

  const signInWithOAuth = async (provider: 'github' | 'google', returnUrl: string = '/resume') => {
    if (!sbRef.current) {
      return { error: { message: 'Supabase is not configured' } };
    }
    return authSignInWithOAuth(sbRef.current, provider, returnUrl);
  };

  const signInWithOtp = async (email: string, returnUrl: string = '/resume') => {
    if (!sbRef.current) {
      return { error: { message: 'Supabase is not configured' } };
    }
    return authSignInWithOtp(sbRef.current, email, returnUrl);
  };

  const signOut = async () => {
    if (sbRef.current) {
      await sbRef.current.auth.signOut();
    }
    setSupabaseUser(null);
    setSupabaseSession(null);
    setIsGuestMode(true);
    // Reset to empty clean slate
    setApplications([]);
    setProfile(EMPTY_PROFILE);
    setMasterResume(EMPTY_MASTER_RESUME);
    setDiscoveredJobs(INITIAL_DISCOVERED_JOBS);
    setTailoredResumes([]);
    setCoverLetters([]);
    setResumes([buildInitialMasterVersion(EMPTY_MASTER_RESUME)]);
    try {
      localStorage.removeItem(STORAGE_KEYS.APPLICATIONS);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.MASTER_RESUME);
      localStorage.removeItem(STORAGE_KEYS.TAILORED_RESUMES);
      localStorage.removeItem(STORAGE_KEYS.COVER_LETTERS);
      localStorage.removeItem(STORAGE_KEYS.RESUMES);
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
    } catch (_) {}
  };

  const continueAsGuest = () => {
    setIsGuestMode(true);
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
    } catch (_) {}
  };

  // =========================================================================
  // PROFILE ACTIONS
  // =========================================================================
  const updateProfile = (updatedFields: Partial<CandidateProfile>) => {
    const updated = { ...profile, ...updatedFields };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('updateProfile error:', error.message);
        });
    }
  };

  const addSkill = (skillData: Omit<SkillItem, 'id'>) => {
    const newSkill: SkillItem = { ...skillData, id: crypto.randomUUID() };
    const updated = { ...profile, skills: [...profile.skills, newSkill] };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('addSkill error:', error.message);
        });
    }
  };

  const removeSkill = (id: string) => {
    const updated = { ...profile, skills: profile.skills.filter((s) => s.id !== id) };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('removeSkill error:', error.message);
        });
    }
  };

  const addExperience = (expData: Omit<WorkExperience, 'id'>) => {
    const newExp: WorkExperience = { ...expData, id: crypto.randomUUID() };
    const updated = { ...profile, experiences: [newExp, ...profile.experiences] };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('addExperience error:', error.message);
        });
    }
  };

  const updateExperience = (id: string, updatedFields: Partial<WorkExperience>) => {
    const next = {
      ...profile,
      experiences: profile.experiences.map((exp) =>
        exp.id === id ? { ...exp, ...updatedFields } : exp
      ),
    };
    setProfile(next);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(next, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('updateExperience error:', error.message);
        });
    }
  };

  const deleteExperience = (id: string) => {
    const updated = {
      ...profile,
      experiences: profile.experiences.filter((exp) => exp.id !== id),
    };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('deleteExperience error:', error.message);
        });
    }
  };

  const addEducation = (eduData: Omit<Education, 'id'>) => {
    const newEdu: Education = { ...eduData, id: crypto.randomUUID() };
    const updated = { ...profile, education: [newEdu, ...profile.education] };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('addEducation error:', error.message);
        });
    }
  };

  const updateEducation = (id: string, updatedFields: Partial<Education>) => {
    const next = {
      ...profile,
      education: profile.education.map((edu) =>
        edu.id === id ? { ...edu, ...updatedFields } : edu
      ),
    };
    setProfile(next);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(next, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('updateEducation error:', error.message);
        });
    }
  };

  const deleteEducation = (id: string) => {
    const updated = {
      ...profile,
      education: profile.education.filter((edu) => edu.id !== id),
    };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('deleteEducation error:', error.message);
        });
    }
  };

  const addProject = (projData: Omit<Project, 'id'>) => {
    const newProject: Project = { ...projData, id: crypto.randomUUID() };
    const updated = { ...profile, projects: [newProject, ...profile.projects] };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('addProject error:', error.message);
        });
    }
  };

  const updateProject = (id: string, updated: Partial<Project>) => {
    const next = {
      ...profile,
      projects: profile.projects.map((proj) => (proj.id === id ? { ...proj, ...updated } : proj)),
    };
    setProfile(next);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(next, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('updateProject error:', error.message);
        });
    }
  };

  const deleteProject = (id: string) => {
    const updated = { ...profile, projects: profile.projects.filter((proj) => proj.id !== id) };
    setProfile(updated);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updated, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('deleteProject error:', error.message);
        });
    }
  };

  // =========================================================================
  // APPLICATION ACTIONS (Optimistic Updates + Supabase Sync)
  // =========================================================================

  const addApplication = (
    appData: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>
  ): JobApplication => {
    const now = new Date().toISOString();
    const mockMatchScore = Math.floor(Math.random() * 20) + 75;
    const mockAnalysis = appData.aiAnalysis || {
      matchScore: mockMatchScore,
      fitSummary: `Automated evaluation: Candidate profile demonstrates solid alignment for ${appData.jobTitle} at ${appData.companyName}.`,
      matchedSkills: profile.skills.slice(0, 4).map((s) => s.name),
      missingSkills: ['Domain-specific tools', 'Specialized Frameworks'],
      keyRequirements: [
        {
          requirement: 'Relevant degree in software engineering or technology',
          candidateFit: 'Strong' as const,
          note: 'Matched with USYD Computer Science degree.',
        },
        {
          requirement: 'Proficiency in frontend and backend technologies',
          candidateFit: 'Strong' as const,
          note: 'Matched with portfolio project stack.',
        },
      ],
      cvRecommendations: [
        `Tailor the summary statement to specifically mention interest in ${appData.companyName}.`,
        'Highlight TypeScript and responsive frontend accomplishments.',
      ],
      coverLetterDraft: `Dear ${appData.companyName} Hiring Team,\n\nI am writing to express my strong interest in the ${appData.jobTitle} position...`,
    };

    const newApp: JobApplication = {
      ...appData,
      id: crypto.randomUUID(),
      aiAnalysis: mockAnalysis,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic UI update
    setApplications((prev) => [newApp, ...prev]);

    // Async persist to Supabase
    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('applications')
        .insert(applicationToInsertRow(newApp, ctx.uid))
        .then(({ error }) => {
          if (error) {
            // Fallback try job_applications table
            ctx.sb
              .from('job_applications')
              .insert(applicationToInsertRow(newApp, ctx.uid))
              .then(({ error: fallbackErr }) => {
                if (fallbackErr) console.error('addApplication error:', fallbackErr.message);
              });
          }
        });
    }

    return newApp;
  };

  const updateApplication = (id: string, updatedFields: Partial<JobApplication>) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, ...updatedFields, updatedAt: new Date().toISOString() } : app
      )
    );

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('applications')
        .update(applicationPartialToUpdateRow(updatedFields))
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) {
            ctx.sb
              .from('job_applications')
              .update(applicationPartialToUpdateRow(updatedFields))
              .eq('id', id)
              .eq('user_id', ctx.uid);
          }
        });
    }
  };

  const updateApplicationStatus = (id: string, status: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, status, updatedAt: new Date().toISOString() } : app
      )
    );

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) {
            ctx.sb
              .from('job_applications')
              .update({ status, updated_at: new Date().toISOString() })
              .eq('id', id)
              .eq('user_id', ctx.uid);
          }
        });
    }
  };

  const moveApplication = (id: string, newStatus: ApplicationStatus, targetIndex?: number) => {
    setApplications((prev) => {
      const targetApp = prev.find((a) => a.id === id);
      if (!targetApp) return prev;

      const otherApps = prev.filter((a) => a.id !== id);
      const updatedApp: JobApplication = {
        ...targetApp,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (typeof targetIndex === 'number' && targetIndex >= 0) {
        const newApps = [...otherApps];
        newApps.splice(targetIndex, 0, updatedApp);
        return newApps;
      }

      return [...otherApps, updatedApp];
    });

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('applications')
        .update({
          status: newStatus,
          order_index: targetIndex ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) {
            ctx.sb
              .from('job_applications')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', id)
              .eq('user_id', ctx.uid);
          }
        });
    }
  };

  const reorderApplications = (reordered: JobApplication[]) => {
    setApplications(reordered);
  };

  const linkResumeToApplication = (appId: string, resumeId: string | undefined) => {
    updateApplication(appId, { tailoredResumeId: resumeId });
  };

  const linkCoverLetterToApplication = (appId: string, coverLetterId: string | undefined) => {
    updateApplication(appId, { coverLetterId });
  };

  const deleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) {
            ctx.sb.from('job_applications').delete().eq('id', id).eq('user_id', ctx.uid);
          }
        });
    }
  };

  const getApplication = (id: string) => {
    return applications.find((app) => app.id === id);
  };

  // =========================================================================
  // JOB DISCOVERY ACTIONS
  // =========================================================================

  const getDiscoveredJob = (id: string) => {
    return discoveredJobs.find((job) => job.id === id);
  };

  const toggleSaveJob = (jobId: string) => {
    const job = discoveredJobs.find((j) => j.id === jobId);
    if (!job) return;

    const nextSaved = !job.isSaved;
    setDiscoveredJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isSaved: nextSaved } : j))
    );

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('discovered_jobs')
        .update({ is_saved: nextSaved, updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) console.error('toggleSaveJob error:', error.message);
        });
    }
  };

  const toggleApplyJob = (jobId: string) => {
    const job = discoveredJobs.find((j) => j.id === jobId);
    if (!job) return;

    const newIsApplied = !job.isApplied;

    if (newIsApplied) {
      addApplication({
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        jobUrl: job.sourceUrl,
        applicationDate: new Date().toISOString().split('T')[0],
        status: 'applied',
        location: job.location,
        workType: job.workArrangement,
        salary: job.salary,
        notes: `Discovered Sydney role (Match: ${job.matchScore}%). Evaluated against Master Resume.`,
      });
    }

    setDiscoveredJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isApplied: newIsApplied } : j))
    );
  };

  const addImportedJob = (job: DiscoveredJob) => {
    setDiscoveredJobs((prev) => {
      const exists = prev.some((j) => j.id === job.id || (j.sourceUrl && j.sourceUrl === job.sourceUrl && j.sourceUrl !== '#'));
      if (exists) {
        return prev.map((j) => (j.id === job.id || (j.sourceUrl && j.sourceUrl === job.sourceUrl && j.sourceUrl !== '#') ? { ...j, ...job } : j));
      }
      return [job, ...prev];
    });

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('discovered_jobs')
        .upsert(discoveredJobToInsertRow(job, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('addImportedJob error:', error.message);
        });
    }
  };

  const addJobToApplications = (
    job: DiscoveredJob,
    initialStatus: ApplicationStatus = 'wishlist'
  ): JobApplication => {
    // Check if an application already exists for this role
    const existing = applications.find(
      (a) =>
        (job.jobUrl && job.jobUrl !== '#' && a.jobUrl === job.jobUrl) ||
        (a.companyName.toLowerCase() === job.companyName.toLowerCase() &&
          a.jobTitle.toLowerCase() === job.jobTitle.toLowerCase())
    );

    if (existing) {
      if (initialStatus && existing.status !== initialStatus) {
        updateApplicationStatus(existing.id, initialStatus);
      }
      return existing;
    }

    const newApp = addApplication({
      companyName: job.companyName,
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription || job.description,
      jobUrl: job.sourceUrl || job.jobUrl,
      applicationDate: new Date().toISOString().split('T')[0],
      status: initialStatus,
      location: job.location,
      workType: job.workArrangement,
      salary: job.salary,
      notes: `Ingested via Smart Ingestion Engine. Match Score: ${job.matchScore}%.`,
      aiAnalysis: {
        matchScore: job.matchScore,
        fitSummary: job.fitSummary,
        matchedSkills: job.matchedSkills,
        missingSkills: job.missingSkills,
        keyRequirements: job.keyRequirements.map((req) => ({
          requirement: req,
          candidateFit: job.matchedSkills.length > 3 ? 'Strong' : 'Moderate',
          note: 'Evaluated against Master Resume via Smart Job Ingestion Engine.',
        })),
        cvRecommendations: [
          `Emphasize top aligned skills: ${job.matchedSkills.slice(0, 3).join(', ')}`,
          `Highlight experience addressing: ${job.missingSkills.slice(0, 2).join(', ') || 'role criteria'}`,
        ],
        coverLetterDraft: `Dear ${job.companyName} Hiring Team,\n\nI am writing to express my strong interest in the ${job.jobTitle} opportunity...`,
      },
    });

    // Mark as applied/saved in discovered jobs
    setDiscoveredJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, isApplied: true, isSaved: true } : j))
    );

    return newApp;
  };

  // =========================================================================
  // MASTER RESUME ACTIONS
  // =========================================================================

  const updateMasterResume = (updates: Partial<MasterResume> & Partial<CandidateProfile>) => {
    const now = new Date().toISOString().split('T')[0];
    const updatedMaster: MasterResume = {
      ...masterResume,
      ...updates,
      skills: updates.skills || masterResume.skills,
      experiences: updates.experiences || masterResume.experiences,
      education: updates.education || masterResume.education,
      projects: updates.projects || masterResume.projects,
      lastUpdated: now,
    };
    setMasterResume(updatedMaster);

    const updatedProfile: CandidateProfile = {
      ...profile,
      name: updates.name || profile.name,
      title: updates.title || profile.title,
      summary: updates.summary || profile.summary,
      skills: updates.skills || profile.skills,
      experiences: updates.experiences || profile.experiences,
      education: updates.education || profile.education,
      projects: updates.projects || profile.projects,
      location: updates.location !== undefined ? updates.location : profile.location,
      email: updates.email !== undefined ? updates.email : profile.email,
      phone: updates.phone !== undefined ? updates.phone : profile.phone,
      linkedinUrl: updates.linkedinUrl !== undefined ? updates.linkedinUrl : profile.linkedinUrl,
      githubUrl: updates.githubUrl !== undefined ? updates.githubUrl : profile.githubUrl,
      websiteUrl: updates.websiteUrl !== undefined ? updates.websiteUrl : profile.websiteUrl,
    };
    setProfile(updatedProfile);

    // Keep resumes[0] (the master version) in sync
    setResumes((prev) => {
      const rest = prev.filter((r) => !r.isMaster);
      const updatedMasterVersion: ResumeVersion = {
        id: updatedMaster.id,
        title: updatedMaster.versionName,
        isMaster: true,
        createdAt: (prev.find((r) => r.isMaster)?.createdAt) || (now + 'T00:00:00.000Z'),
        updatedAt: new Date().toISOString(),
        linkedinUrl: updatedProfile.linkedinUrl,
        githubUrl: updatedProfile.githubUrl,
        websiteUrl: updatedProfile.websiteUrl,
        summary: updatedMaster.summary,
        skills: updatedMaster.skills,
        experiences: updatedMaster.experiences,
        education: updatedMaster.education,
        projects: updatedMaster.projects,
      };
      return [updatedMasterVersion, ...rest];
    });

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('master_resumes')
        .upsert(masterResumeToUpsertRow(updatedMaster, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('updateMasterResume error:', error.message);
        });
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(updatedProfile, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('updateProfile from master error:', error.message);
        });
    }
  };

  // =========================================================================
  // TAILORED RESUMES & COVER LETTERS
  // =========================================================================

  const tailorResumeForJob = (jobId: string): TailoredResume => {
    const job = discoveredJobs.find((j) => j.id === jobId);
    const existing = tailoredResumes.find((r) => r.jobId === jobId);
    if (existing) return existing;

    const company = job ? job.companyName : 'Tech Partner';
    const role = job ? job.jobTitle : 'Software Engineer';
    const now = new Date().toISOString();

    const newTailored: TailoredResume = {
      id: crypto.randomUUID(),
      jobId,
      targetCompany: company,
      targetPosition: role,
      versionName: `${company} - ${role} Tailored`,
      dateGenerated: now.split('T')[0],
      matchScore: job ? job.matchScore : 90,
      tailoredSummary: `Enthusiastic and results-driven Software Engineering graduate with strong technical foundations in React, TypeScript, Next.js, and cloud systems, tailored specifically for the ${role} position at ${company}.`,
      tailoredSkills: masterResume.skills.map((s) => s.name),
      tailoredExperiences: masterResume.experiences.map((exp) => ({
        id: exp.id,
        role: exp.role,
        company: exp.company,
        location: exp.location || 'Sydney, NSW',
        period: `${exp.startDate} - ${exp.endDate || 'Present'}`,
        highlights: exp.highlights.map(
          (h) => `${h} (Optimized for ${role} performance requirements)`
        ),
      })),
      tailoredProjects: masterResume.projects.map((proj) => ({
        id: proj.id,
        title: proj.title,
        description: proj.description,
        techStack: proj.techStack,
      })),
      tailoredEducation: masterResume.education,
      changesMade: [
        {
          category: 'Summary',
          description: `Customized summary to highlight core technical skills relevant to ${company}.`,
          rationale: `Directly reflects top requirements in ${role} posting.`,
        },
        {
          category: 'Skill Reordering',
          description: `Promoted ${(job?.skills || job?.matchedSkills || []).slice(0, 3).join(', ') || 'core stack'} to primary positions.`,
          rationale: 'Aligns keyword prominence for recruiters and screening filters.',
        },
        {
          category: 'Project Emphasis',
          description: 'Elevated full-stack Next.js and data telemetry projects.',
          rationale: 'Demonstrates proven hands-on delivery matching role responsibilities.',
        },
      ],
    };

    setTailoredResumes((prev) => [newTailored, ...prev]);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('tailored_resumes')
        .insert(tailoredResumeToInsertRow(newTailored, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('tailorResumeForJob error:', error.message);
        });
    }

    return newTailored;
  };

  const getTailoredResume = (idOrJobId: string) => {
    return tailoredResumes.find((r) => r.id === idOrJobId || r.jobId === idOrJobId);
  };

  const updateTailoredResume = (id: string, updates: Partial<TailoredResume>) => {
    setTailoredResumes((prev) =>
      prev.map((resume) => (resume.id === id ? { ...resume, ...updates } : resume))
    );

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('tailored_resumes')
        .update(tailoredResumePartialToUpdateRow(updates))
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) console.error('updateTailoredResume error:', error.message);
        });
    }
  };

  // Multi-version Resumes
  const getMasterResume = (): ResumeVersion => {
    return resumes.find((r) => r.isMaster) || resumes[0];
  };

  const createTailoredResume = (
    tailoredData: Partial<ResumeVersion>,
    title: string
  ): ResumeVersion => {
    const now = new Date().toISOString();
    const master = getMasterResume();
    const newVersion: ResumeVersion = {
      id: crypto.randomUUID(),
      title,
      isMaster: false,
      createdAt: now,
      updatedAt: now,
      summary: tailoredData.summary || master.summary,
      skills: tailoredData.skills || master.skills,
      experiences: tailoredData.experiences || master.experiences,
      education: tailoredData.education || master.education,
      projects: tailoredData.projects || master.projects,
    };
    setResumes((prev) => [...prev, newVersion]);
    return newVersion;
  };

  const updateResumeVersion = (id: string, updates: Partial<ResumeVersion>) => {
    setResumes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
  };

  const deleteResumeVersion = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id || r.isMaster));
  };

  // Cover Letter Actions
  const generateCoverLetterForJob = (jobId: string): CoverLetterItem => {
    const job = discoveredJobs.find((j) => j.id === jobId);
    const existing = coverLetters.find((c) => c.jobId === jobId);
    if (existing) return existing;

    const company = job ? job.companyName : 'Tech Team';
    const role = job ? job.jobTitle : 'Software Engineer';
    const now = new Date().toISOString();

    const matchedStack = (job?.skills || job?.matchedSkills || ['TypeScript', 'React', 'Next.js', 'Node.js', 'cloud systems']).slice(0, 4).join(', ');
    const newLetter: CoverLetterItem = {
      id: crypto.randomUUID(),
      jobId,
      targetCompany: company,
      targetPosition: role,
      dateGenerated: now.split('T')[0],
      bodyText: `I am writing to express my enthusiastic application for the ${role} position at ${company}. Having followed your engineering advancements, high-impact digital products, and commitment to technical excellence, I have developed deep admiration for your team's mission to build reliable, user-centric software at scale. With a rigorous academic foundation in Computer Science and hands-on delivery experience across modern web architectures—including ${matchedStack}—I am eager to contribute immediately to your product roadmap. My background combines algorithmic problem-solving with practical product delivery, allowing me to translate complex specifications into resilient, high-performance web systems.

Throughout my software engineering experience, I have prioritized architecting performant, scalable, and maintainable applications that directly address mission-critical business requirements. In my recent full-stack development projects, I engineered end-to-end responsive web platforms and robust RESTful microservice integrations that decreased client-side page load latency by over 38% while maintaining strict accessibility and comprehensive automated test coverage standards. By leveraging TypeScript, modern React component lifecycles, and automated CI/CD deployment pipelines, I consistently ensured high system reliability, minimal production regression rates, and seamless feature delivery velocity across multi-disciplinary engineering squads.

In addition to core full-stack execution, I bring a proactive product mindset, strong systems intuition, and a proven track record of cross-functional ownership. Whether partnering closely with product managers to decompose ambiguous feature requirements or collaborating with UX designers to refine intuitive client interactions, I take complete responsibility for project outcomes from initial technical discovery through to production deployment. When navigating technical trade-offs and performance bottlenecks, I systematically evaluate architectural decisions, optimize asynchronous data workflows, and document key design rationale to elevate code quality and accelerate collective velocity across the entire engineering team.

Joining ${company} represents an exciting opportunity to apply my technical execution, disciplined engineering standards, and collaborative mindset to solve high-impact user challenges. I am confident that my technical proficiency in modern web frameworks, cloud systems, and dependable code craftsmanship makes me an immediate, value-adding contributor to your organization's engineering culture. Thank you for your time, consideration, and review of my application; I welcome the opportunity to discuss how my background and enthusiasm directly align with your team's strategic goals.`,
    };

    setCoverLetters((prev) => [newLetter, ...prev]);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('cover_letters')
        .insert(coverLetterToInsertRow(newLetter, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('generateCoverLetterForJob error:', error.message);
        });
    }

    return newLetter;
  };

  const saveCoverLetter = (letter: Omit<CoverLetterItem, 'id'>): CoverLetterItem => {
    const newLetter: CoverLetterItem = {
      ...letter,
      id: crypto.randomUUID(),
    };

    setCoverLetters((prev) => [newLetter, ...prev]);

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('cover_letters')
        .insert(coverLetterToInsertRow(newLetter, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('saveCoverLetter error:', error.message);
        });
    }

    return newLetter;
  };

  const getCoverLetter = (idOrJobId: string) => {
    return coverLetters.find((c) => c.id === idOrJobId || c.jobId === idOrJobId);
  };

  const updateCoverLetter = (id: string, bodyText: string) => {
    setCoverLetters((prev) =>
      prev.map((letter) =>
        letter.id === id
          ? { ...letter, content: bodyText, updatedAt: new Date().toISOString() }
          : letter
      )
    );

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('cover_letters')
        .update({ content: bodyText, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) console.error('updateCoverLetter error:', error.message);
        });
    }
  };

  const deleteCoverLetter = (id: string) => {
    setCoverLetters((prev) => prev.filter((c) => c.id !== id));

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('cover_letters')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.uid)
        .then(({ error }) => {
          if (error) console.error('deleteCoverLetter error:', error.message);
        });
    }
  };

  const resetToMockData = () => {
    setProfile(INITIAL_PROFILE);
    setApplications(INITIAL_APPLICATIONS);
    setDiscoveredJobs(INITIAL_DISCOVERED_JOBS);
    setMasterResume(INITIAL_MASTER_RESUME);
    setTailoredResumes(INITIAL_TAILORED_RESUMES);
    setCoverLetters(INITIAL_COVER_LETTERS);
    setResumes([buildInitialMasterVersion(INITIAL_MASTER_RESUME)]);
    try {
      localStorage.clear();
      sessionStorage.removeItem('applyiq_resume_scratch');
    } catch (_) {}
  };

  const resetMasterResume = () => {
    setProfile(EMPTY_PROFILE);
    setMasterResume(EMPTY_MASTER_RESUME);
    setResumes([buildInitialMasterVersion(EMPTY_MASTER_RESUME)]);
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.MASTER_RESUME);
      localStorage.removeItem(STORAGE_KEYS.RESUMES);
      localStorage.removeItem('applyiq_resume_scratch');
      sessionStorage.removeItem('applyiq_resume_scratch');
    } catch (_) {}

    const ctx = sbCtx();
    if (ctx) {
      ctx.sb
        .from('master_resumes')
        .upsert(masterResumeToUpsertRow(EMPTY_MASTER_RESUME, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('resetMasterResume error:', error.message);
        });
      ctx.sb
        .from('profiles')
        .upsert(profileToUpsertRow(EMPTY_PROFILE, ctx.uid))
        .then(({ error }) => {
          if (error) console.error('resetProfile error:', error.message);
        });
    }
  };

  return (
    <AppContext.Provider
      value={{
        user: supabaseUser,
        session: supabaseSession,
        isLoadingAuth,
        isGuestMode,
        profile,
        applications,
        discoveredJobs,
        masterResume,
        tailoredResumes,
        coverLetters,
        isLoaded,

        // Guest Onboarding & Migration State
        hasMasterResume,
        isMigratingGuestData,
        migrationSuccess,

        // Auth Modal Controls
        isAuthModalOpen,
        authModalOptions,
        openAuthModal,
        closeAuthModal,

        // Auth
        signInWithPassword,
        signUpWithPassword,
        signInWithOAuth,
        signInWithOtp,
        signOut,
        continueAsGuest,
        migrateGuestData,

        // Profile
        updateProfile,
        addSkill,
        removeSkill,
        addExperience,
        updateExperience,
        deleteExperience,
        addEducation,
        updateEducation,
        deleteEducation,
        addProject,
        updateProject,
        deleteProject,

        // Applications
        addApplication,
        updateApplication,
        updateApplicationStatus,
        moveApplication,
        reorderApplications,
        linkResumeToApplication,
        linkCoverLetterToApplication,
        deleteApplication,
        getApplication,

        // Job Discovery & Ingestion
        getDiscoveredJob,
        toggleSaveJob,
        toggleApplyJob,
        addImportedJob,
        addJobToApplications,

        // Resume & Tailoring
        updateMasterResume,
        tailorResumeForJob,
        getTailoredResume,
        updateTailoredResume,

        // Multi-version Resumes
        resumes,
        getMasterResume,
        createTailoredResume,
        updateResumeVersion,
        deleteResumeVersion,

        // Cover Letter
        generateCoverLetterForJob,
        saveCoverLetter,
        getCoverLetter,
        updateCoverLetter,
        deleteCoverLetter,

        // Reset
        resetToMockData,
        resetMasterResume,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
