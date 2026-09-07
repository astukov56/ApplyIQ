'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import type { ResumeVersion, CoverLetterItem, MasterResume, CandidateProfile } from '@/types';
import type { ParsedResumeData } from '@/components/resume/ResumeUploadZone';
import { ResumeUploadZone } from '@/components/resume/ResumeUploadZone';
import { MasterResumeOnboard } from '@/components/onboarding/MasterResumeOnboard';
import { MasterResumePreview } from '@/components/resume/MasterResumePreview';
import { TailoredResumePreview } from '@/components/tailor/TailoredResumePreview';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Textarea } from '@/components/ui';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Edit,
  Wand2,
  UploadCloud,
  Layers,
  Trash2,
  Target,
  Printer,
  Mail,
  ExternalLink,
  Globe,
  FileCode,
  Save,
  LogIn,
  Cloud,
} from 'lucide-react';
import Link from 'next/link';
import { exportResumeVersionDocx, exportCoverLetterDocx } from '@/lib/export/exportDocx';
import { printHtml, buildResumeHtml, buildCoverLetterHtml } from '@/lib/export/exportPdf';
import { trackResumeDownload } from '@/lib/telemetry';
import {
  normalizeUrl,
  formatDisplayUrl,
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
} from '@/lib/linkUtils';

// ---------------------------------------------------------------------------
// Helpers & SVG Icons
// ---------------------------------------------------------------------------
function LinkedinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function relativeDate(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  } catch {
    return iso;
  }
}

type TabType = 'master' | 'tailored' | 'letters';

function ResumeHubContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const initialTab: TabType =
    rawTab === 'letters' || rawTab === 'coverLetters'
      ? 'letters'
      : rawTab === 'tailored' || rawTab === 'versions'
        ? 'tailored'
        : 'master';

  const {
    profile,
    updateMasterResume,
    masterResume,
    resumes,
    getMasterResume,
    deleteResumeVersion,
    coverLetters,
    updateCoverLetter,
    deleteCoverLetter,
    hasMasterResume,
    user,
    isGuestMode,
    openAuthModal,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Master Resume live debounced persistence state
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [lastSavedMaster, setLastSavedMaster] = useState<Date | null>(null);
  const saveMasterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMasterResumeChange = (updates: Partial<MasterResume> & Partial<CandidateProfile>) => {
    setIsSavingMaster(true);
    if (saveMasterTimerRef.current) {
      clearTimeout(saveMasterTimerRef.current);
    }
    saveMasterTimerRef.current = setTimeout(() => {
      updateMasterResume(updates);
      setIsSavingMaster(false);
      setLastSavedMaster(new Date());
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (saveMasterTimerRef.current) {
        clearTimeout(saveMasterTimerRef.current);
      }
    };
  }, []);

  // Dynamic Master Resume Version directly from getMasterResume()
  const masterResumeVersion = getMasterResume();

  // Tailored versions from resumes[] (non-master)
  const tailoredVersions = resumes.filter((r) => !r.isMaster);
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersion | null>(
    tailoredVersions.length > 0 ? tailoredVersions[0] : null
  );

  // Cover letters state
  const [selectedLetter, setSelectedLetter] = useState<CoverLetterItem | null>(
    coverLetters.length > 0 ? coverLetters[0] : null
  );
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [letterDraft, setLetterDraft] = useState<string>('');
  const [letterSavedMsg, setLetterSavedMsg] = useState<boolean>(false);

  // Edit Master Details modal state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: profile.name,
    title: profile.title,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl || '',
    githubUrl: profile.githubUrl || '',
    websiteUrl: profile.websiteUrl || '',
    summary: masterResumeVersion.summary || profile.summary || '',
  });

  const handleOpenEditDetails = () => {
    setDetailsForm({
      name: profile.name,
      title: profile.title,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl || '',
      githubUrl: profile.githubUrl || '',
      websiteUrl: profile.websiteUrl || '',
      summary: masterResumeVersion.summary || profile.summary || '',
    });
    setIsEditingDetails(true);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateMasterResume({
      name: detailsForm.name,
      title: detailsForm.title,
      email: detailsForm.email,
      phone: detailsForm.phone,
      location: detailsForm.location,
      linkedinUrl: detailsForm.linkedinUrl,
      githubUrl: detailsForm.githubUrl,
      websiteUrl: detailsForm.websiteUrl,
      summary: detailsForm.summary,
    });
    setIsEditingDetails(false);
    setUploadSuccessMsg('Candidate details and Master Resume updated!');
    setTimeout(() => setUploadSuccessMsg(null), 5000);
  };

  // Handler when upload parser finishes
  const handleParsed = (data: ParsedResumeData) => {
    updateMasterResume({
      name: data.name,
      title: data.title,
      email: data.email,
      phone: data.phone,
      location: data.location,
      linkedinUrl: data.linkedinUrl,
      githubUrl: data.githubUrl,
      websiteUrl: data.websiteUrl,
      summary: data.summary,
      skills: data.skills as typeof masterResumeVersion.skills,
      experiences: data.experiences as typeof masterResumeVersion.experiences,
      education: data.education as typeof masterResumeVersion.education,
      projects: data.projects as typeof masterResumeVersion.projects,
    });
    setUploadSuccessMsg('Master Resume parsed & updated successfully!');
    setShowUploadZone(false);
    setTimeout(() => setUploadSuccessMsg(null), 8000);
  };

  // Export handlers for Resume
  const handleExportResumeDocx = (ver: ResumeVersion) => {
    trackResumeDownload('docx', ver.title);
    exportResumeVersionDocx(ver, profile);
  };

  const handleExportResumePdf = (ver: ResumeVersion) => {
    trackResumeDownload('pdf', ver.title);
    const skillsText = ver.tailoredSkills
      ? [
          ...ver.tailoredSkills.languages,
          ...ver.tailoredSkills.frameworks,
          ...ver.tailoredSkills.cloudAndData,
          ...ver.tailoredSkills.tools,
        ].join(', ')
      : ver.skills.map((s) => s.name).join(', ');

    const html = buildResumeHtml({
      name: profile.name,
      title: profile.title,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      websiteUrl: profile.websiteUrl,
      summary: ver.summary,
      skillsText,
      experiences: ver.experiences.map((e) => ({
        role: e.role,
        company: e.company,
        start: e.startDate,
        end: e.endDate,
        location: e.location,
        highlights: e.highlights,
      })),
      projects: (ver.tailoredProjects ?? ver.projects?.map((p) => ({ name: p.title, bullets: [p.description] })) ?? []),
      education: ver.education.map((edu) => ({
        degree: edu.degree,
        institution: edu.institution,
        start: edu.startDate,
        end: edu.endDate,
        grade: edu.grade,
        details: edu.details,
      })),
    });

    printHtml(html, `${profile.name} - ${ver.title}`);
  };

  // Export handlers for Master Resume
  const handleExportMasterPdf = () => {
    handleExportResumePdf(masterResumeVersion);
  };

  const handleExportMasterDocx = () => {
    exportResumeVersionDocx(masterResumeVersion, profile);
  };

  // Export handlers for Cover Letter
  const handleExportLetterDocx = (cl: CoverLetterItem) => {
    exportCoverLetterDocx(cl, profile);
  };

  const handleExportLetterPdf = (cl: CoverLetterItem) => {
    const html = buildCoverLetterHtml({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      targetCompany: cl.targetCompany,
      targetPosition: cl.targetPosition,
      bodyText: cl.bodyText,
      date: new Date(cl.dateGenerated || Date.now()).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
    printHtml(html, `Cover Letter - ${profile.name} for ${cl.targetCompany}`);
  };

  const handleStartEditLetter = (cl: CoverLetterItem) => {
    setEditingLetterId(cl.id);
    setLetterDraft(cl.bodyText);
    setLetterSavedMsg(false);
  };

  const handleSaveLetter = (id: string) => {
    updateCoverLetter(id, letterDraft);
    setEditingLetterId(null);
    setLetterSavedMsg(true);
    setTimeout(() => setLetterSavedMsg(false), 3000);
  };

  const [isDismissedOnboard, setIsDismissedOnboard] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('applyiq_resume_scratch') === 'true';
    }
    return false;
  });

  const isMasterResumeEmpty =
    !profile.name.trim() &&
    (masterResume.experiences?.length ?? 0) === 0;

  // If visiting without an uploaded or initialized master resume, show onboarding gate
  if ((isMasterResumeEmpty || !hasMasterResume) && !isDismissedOnboard) {
    return (
      <MasterResumeOnboard
        title="Welcome to ApplyIQ — Set Up Your Master Resume"
        subtitle="Upload your existing resume (PDF/DOCX) to automatically extract your experience, or create from scratch with a clean ATS template."
        onCompleted={() => {
          setIsDismissedOnboard(true);
          setActiveTab('master');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ------------------------------------------------------------------ */}
      {/* Page Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Resume &amp; Document Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Truthfulness Verified
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Single master source of truth, job-specific tailored resumes, and customized cover letters with 1-click export.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isGuestMode && !user && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Cloud className="w-3.5 h-3.5 text-indigo-500" />}
              onClick={() =>
                openAuthModal({
                  title: 'Save Master Resume to Cloud',
                  description:
                    'Create an account or sign in with Google SSO to permanently sync your Master Resume, tailored snapshots, and applications to Supabase.',
                  returnUrl: '/resume',
                })
              }
            >
              Sync to Cloud
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={<Edit className="w-3.5 h-3.5" />}
            onClick={handleOpenEditDetails}
          >
            Edit Details
          </Button>

          <Link href="/tailor">
            <Button variant="primary" size="sm" icon={<Wand2 className="w-3.5 h-3.5" />}>
              AI Tailor Engine
            </Button>
          </Link>
        </div>
      </div>

      {/* Guest Mode Persistent Cloud Sync Banner */}
      {isGuestMode && !user && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Guest Session Active:</strong> Your resume is stored in this browser. Sign in or create a free account with Google SSO to sync across devices with zero loss of work.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              openAuthModal({
                title: 'Save & Sync to Supabase',
                returnUrl: '/resume',
              })
            }
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Sign In with Google SSO &rarr;
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3-Tab Navigation */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'master'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Master Resume</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Source of Truth
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tailored')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tailored'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Tailored Resumes</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            {tailoredVersions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('letters')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'letters'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Cover Letters</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            {coverLetters.length}
          </span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* TAB 1: MASTER RESUME */}
      {/* ================================================================== */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          {/* Success Banner if parsed */}
          {uploadSuccessMsg && (
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-semibold">{uploadSuccessMsg}</span>
              </div>
              <button
                onClick={() => setUploadSuccessMsg(null)}
                className="text-xs underline hover:text-emerald-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Master Resume Control Card */}
          <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white p-6 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {masterResumeVersion.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Primary Source of Truth
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Last updated: <span className="font-semibold text-white">{masterResumeVersion.updatedAt ? new Date(masterResumeVersion.updatedAt).toLocaleDateString('en-AU') : 'Recently'}</span> • {profile.name} ({profile.title})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={handleOpenEditDetails}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UploadCloud className="w-3.5 h-3.5" />}
                  onClick={() => setShowUploadZone((prev) => !prev)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  {showUploadZone ? 'Hide Import' : 'Import File (PDF / DOCX)'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileCode className="w-3.5 h-3.5" />}
                  onClick={handleExportMasterDocx}
                  className="text-xs"
                >
                  Word (.docx)
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={handleExportMasterPdf}
                  className="text-xs"
                >
                  Print / PDF
                </Button>
              </div>
            </div>
          </Card>

          {/* Collapsible Upload Zone */}
          {showUploadZone && (
            <Card className="border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  Parse &amp; Replace Master Resume
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Drop your existing PDF or Word resume. GPT-4o mini will extract and map all fields directly into your Master Resume.
                </p>
              </CardHeader>
              <CardContent className="pt-2">
                <ResumeUploadZone onParsed={handleParsed} />
              </CardContent>
            </Card>
          )}

          {/* Master Resume Document Preview — Executive Harvard ATS Single-Column with Live Editing */}
          <MasterResumePreview
            masterResume={masterResume}
            profile={profile}
            onChange={handleMasterResumeChange}
            isSaving={isSavingMaster}
            lastSaved={lastSavedMaster}
          />
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: TAILORED RESUMES (with export & view) */}
      {/* ================================================================== */}
      {activeTab === 'tailored' && (
        <div className="space-y-6">
          {tailoredVersions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No tailored resumes generated yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Use the AI Tailor Engine to paste any job description and generate an ATS-tailored resume snapshot.
                </p>
                <div className="mt-5">
                  <Link href="/tailor">
                    <Button variant="primary" size="sm" icon={<Wand2 className="w-3.5 h-3.5" />}>
                      Open AI Tailor Engine
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: list of versions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Saved Versions ({tailoredVersions.length})
                  </h3>
                  <Link href="/tailor" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                    <Wand2 className="w-3 h-3" /> + New Tailor
                  </Link>
                </div>

                {tailoredVersions.map((v) => {
                  const isSelected = selectedVersion?.id === v.id;
                  return (
                    <Card
                      key={v.id}
                      hoverEffect
                      onClick={() => setSelectedVersion(v)}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                          : ''
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {v.targetJobTitle || 'Tailored Snapshot'}
                          </span>
                          {v.matchScore !== undefined && (
                            <Badge variant="success" size="sm">
                              {v.matchScore}% Match
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                          {v.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>{relativeDate(v.createdAt)}</span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {v.skills.length} skills · {v.experiences.length} exp
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Right column: active version preview & exports */}
              <div className="lg:col-span-2 space-y-6">
                {selectedVersion && (
                  <>
                    {/* Top Action & Export Bar */}
                    <Card className="border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/40 to-slate-50/30 dark:from-indigo-950/20 dark:to-slate-900/20">
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {selectedVersion.title}
                              </h3>
                              {selectedVersion.matchScore !== undefined && (
                                <Badge variant="success" size="sm">
                                  {selectedVersion.matchScore}% ATS
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Created {relativeDate(selectedVersion.createdAt)} • Includes truthful adjustments
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<FileCode className="w-3.5 h-3.5" />}
                              onClick={() => handleExportResumeDocx(selectedVersion)}
                              className="text-xs"
                            >
                              Export .docx
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Printer className="w-3.5 h-3.5" />}
                              onClick={() => handleExportResumePdf(selectedVersion)}
                              className="text-xs"
                            >
                              Export PDF
                            </Button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${selectedVersion.title}"?`)) {
                                  deleteResumeVersion(selectedVersion.id);
                                  setSelectedVersion(tailoredVersions.find((x) => x.id !== selectedVersion.id) ?? null);
                                }
                              }}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete version"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Keywords Breakdown */}
                    {(selectedVersion.matchedKeywords?.length || selectedVersion.missingKeywords?.length) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-500" />
                            ATS Keyword Alignment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedVersion.matchedKeywords?.length && (
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                                Matched ({selectedVersion.matchedKeywords.length})
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedVersion.matchedKeywords.map((k) => (
                                  <span key={k} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedVersion.missingKeywords?.length && (
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                                Missing from Resume ({selectedVersion.missingKeywords.length})
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedVersion.missingKeywords.map((k) => (
                                  <span key={k} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Tailored Document View — Standardized Executive ATS Format */}
                    <div className="flex justify-center overflow-x-auto">
                      <TailoredResumePreview
                        resume={selectedVersion}
                        profile={profile}
                        highlightKeywords={new Set(selectedVersion.matchedKeywords || [])}
                        showControls={false}
                        editable={false}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: COVER LETTERS */}
      {/* ================================================================== */}
      {activeTab === 'letters' && (
        <div className="space-y-6">
          {coverLetters.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No saved cover letters yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Use the AI Tailor Engine to paste any job description and generate a tailored cover letter instantly.
                </p>
                <div className="mt-5">
                  <Link href="/tailor">
                    <Button variant="primary" size="sm" icon={<Wand2 className="w-3.5 h-3.5" />}>
                      Generate Cover Letter
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Saved Letters ({coverLetters.length})
                  </h3>
                  <Link href="/tailor" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                    <Wand2 className="w-3 h-3" /> + New Letter
                  </Link>
                </div>

                {coverLetters.map((cl) => {
                  const isSelected = selectedLetter?.id === cl.id;
                  return (
                    <Card
                      key={cl.id}
                      hoverEffect
                      onClick={() => {
                        setSelectedLetter(cl);
                        setEditingLetterId(null);
                      }}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                          : ''
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {cl.targetCompany}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cl.dateGenerated}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                          {cl.targetPosition}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          {cl.bodyText.slice(0, 120)}…
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Right detail view & editor */}
              <div className="lg:col-span-2 space-y-5">
                {selectedLetter && (
                  <>
                    {/* Action Bar */}
                    <Card className="border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-r from-slate-50/40 to-indigo-50/30 dark:from-slate-900/20 dark:to-indigo-950/20">
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {selectedLetter.targetCompany} — {selectedLetter.targetPosition}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Generated {selectedLetter.dateGenerated} • Recipient: {selectedLetter.recipientName || 'Hiring Team'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {editingLetterId === selectedLetter.id ? (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<Save className="w-3.5 h-3.5" />}
                                onClick={() => handleSaveLetter(selectedLetter.id)}
                                className="text-xs"
                              >
                                Save Edits
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Edit className="w-3.5 h-3.5" />}
                                onClick={() => handleStartEditLetter(selectedLetter)}
                                className="text-xs"
                              >
                                Edit Text
                              </Button>
                            )}

                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<FileCode className="w-3.5 h-3.5" />}
                              onClick={() => handleExportLetterDocx(selectedLetter)}
                              className="text-xs"
                            >
                              Word (.docx)
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Printer className="w-3.5 h-3.5" />}
                              onClick={() => handleExportLetterPdf(selectedLetter)}
                              className="text-xs"
                            >
                              Print / PDF
                            </Button>

                            <button
                              onClick={() => {
                                if (confirm(`Delete cover letter for "${selectedLetter.targetCompany}"?`)) {
                                  deleteCoverLetter(selectedLetter.id);
                                  setSelectedLetter(coverLetters.find((x) => x.id !== selectedLetter.id) ?? null);
                                }
                              }}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete letter"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {letterSavedMsg && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Cover letter edits saved successfully!
                      </div>
                    )}

                    {/* Document Preview or Edit Mode */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm space-y-6 max-w-3xl font-sans">
                      {/* Header with hyperlinks */}
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-1">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                        <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                          <span>{profile.email}</span>
                          <span>•</span>
                          <span>{profile.phone}</span>
                          <span>•</span>
                          <span>{profile.location}</span>
                          {profile.linkedinUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={normalizeLinkedInUrl(profile.linkedinUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {formatLinkedInDisplay(profile.linkedinUrl)}
                              </a>
                            </>
                          )}
                          {profile.githubUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={normalizeGitHubUrl(profile.githubUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {formatGitHubDisplay(profile.githubUrl)}
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Date & Recipient */}
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>{new Date(selectedLetter.dateGenerated).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedLetter.targetCompany} Hiring Team
                        </p>
                        <p>Re: Application for <em>{selectedLetter.targetPosition}</em></p>
                      </div>

                      {/* Letter Body or Textarea */}
                      {editingLetterId === selectedLetter.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={letterDraft}
                            onChange={(e) => setLetterDraft(e.target.value)}
                            rows={14}
                            className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingLetterId(null)}>
                              Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => handleSaveLetter(selectedLetter.id)}>
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed text-justify">
                          {selectedLetter.bodyText.split('\n\n').map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Master Details Modal */}
      <Modal
        isOpen={isEditingDetails}
        onClose={() => setIsEditingDetails(false)}
        title="Edit Master Candidate Details"
      >
        <form onSubmit={handleSaveDetails} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Jane Doe"
              value={detailsForm.name}
              onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
              required
            />
            <Input
              label="Target Role / Job Title"
              placeholder="e.g. Senior Software Engineer"
              value={detailsForm.title}
              onChange={(e) => setDetailsForm({ ...detailsForm, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="e.g. jane@example.com"
              value={detailsForm.email}
              onChange={(e) => setDetailsForm({ ...detailsForm, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              placeholder="e.g. +61 400 123 456"
              value={detailsForm.phone}
              onChange={(e) => setDetailsForm({ ...detailsForm, phone: e.target.value })}
            />
            <Input
              label="Location"
              placeholder="e.g. Sydney, NSW"
              value={detailsForm.location}
              onChange={(e) => setDetailsForm({ ...detailsForm, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="LinkedIn (URL or username)"
              placeholder="e.g. linkedin.com/in/username"
              value={detailsForm.linkedinUrl}
              onChange={(e) => setDetailsForm({ ...detailsForm, linkedinUrl: e.target.value })}
            />
            <Input
              label="GitHub (URL or username)"
              placeholder="e.g. github.com/username"
              value={detailsForm.githubUrl}
              onChange={(e) => setDetailsForm({ ...detailsForm, githubUrl: e.target.value })}
            />
            <Input
              label="Website / Portfolio"
              placeholder="e.g. portfolio.dev"
              value={detailsForm.websiteUrl}
              onChange={(e) => setDetailsForm({ ...detailsForm, websiteUrl: e.target.value })}
            />
          </div>

          <Textarea
            label="Professional Summary"
            rows={4}
            value={detailsForm.summary}
            onChange={(e) => setDetailsForm({ ...detailsForm, summary: e.target.value })}
            placeholder="Write a compelling 2-3 sentence overview of your background and core technical strengths..."
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditingDetails(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<Save className="w-3.5 h-3.5" />}>
              Save to Master Resume
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ResumeHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading Resume Hub…</div>}>
      <ResumeHubContent />
    </Suspense>
  );
}
