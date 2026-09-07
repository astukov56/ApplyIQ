'use client';

import React, { useState, useTransition, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { TailorResult } from '@/app/api/tailor/route';
import type { ChatEditResult } from '@/app/api/resume/chat-edit/route';
import type { ResumeVersion, CoverLetterItem, SkillItem } from '@/types';
import type { AtsMatchResult, CoverLetterResult, StagedModification } from '@/types/tailor';
import { calculateReactiveAtsScore } from '@/lib/atsScoring';
import { computeResumeDiff } from '@/lib/resumeDiff';
import { computeCoverLetterDiff } from '@/lib/diffUtils';
import { TailoredResumePreview } from '@/components/tailor/TailoredResumePreview';
import { CoverLetterPreview } from '@/components/tailor/CoverLetterPreview';
import { AiChatSidebar, type ChangeCard } from '@/components/tailor/AiChatSidebar';
import { MasterResumeOnboard } from '@/components/onboarding/MasterResumeOnboard';
import {
  Sparkles,
  BrainCircuit,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Save,
  Target,
  RotateCcw,
  FileText,
  Mail,
  Building2,
  Printer,
  FileCode,
  ChevronDown,
  Wand2,
  Download,
  Edit3,
  Cloud,
} from 'lucide-react';
import clsx from 'clsx';
import { exportResumeVersionDocx, exportCoverLetterDocx } from '@/lib/export/exportDocx';
import { printHtml, buildResumeHtml, buildCoverLetterHtml, exportResumeVersionPdf } from '@/lib/export/exportPdf';
import type { ResumeFormatSettings } from '@/types/resumeFormat';
import {
  DEFAULT_FORMAT_SETTINGS,
  DEFAULT_COVER_LETTER_FORMAT_SETTINGS,
  getSavedFormatSettings,
  saveFormatSettings,
} from '@/types/resumeFormat';

// ---------------------------------------------------------------------------
// Studio View Types
// ---------------------------------------------------------------------------
type StudioTab = 'resume' | 'jobfit' | 'coverLetter';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AITailorPage() {
  const {
    masterResume,
    profile,
    createTailoredResume,
    saveCoverLetter,
    addApplication,
    resumes,
    discoveredJobs,
    hasMasterResume,
    isGuestMode,
    user,
    openAuthModal,
  } = useApp();

  // Input fields
  const [jobDescription, setJobDescription] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [addToKanban, setAddToKanban] = useState(true);

  // Tailor API
  const [result, setResult] = useState<TailorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Studio UI
  const [studioTab, setStudioTab] = useState<StudioTab>('jobfit');
  const [liveResume, setLiveResume] = useState<ResumeVersion | null>(null);
  const [liveCoverLetter, setLiveCoverLetter] = useState<CoverLetterResult | null>(null);
  const [stagedModification, setStagedModification] = useState<StagedModification | null>(null);
  const [changeFeed, setChangeFeed] = useState<ChangeCard[]>([]);
  const [saved, setSaved] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatPending, startChatTransition] = useTransition();
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Derive master resume as ResumeVersion for the preview pane
  const masterVersion: ResumeVersion = useMemo(() => {
    return (
      resumes.find((r) => r.isMaster) ?? {
        id: masterResume.id,
        title: masterResume.versionName,
        isMaster: true,
        createdAt: masterResume.lastUpdated + 'T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        summary: masterResume.summary,
        skills: masterResume.skills,
        experiences: masterResume.experiences,
        education: masterResume.education,
        projects: masterResume.projects,
      }
    );
  }, [resumes, masterResume]);

  const previewResume = liveResume ?? masterVersion;
  const docName = profile.name.replace(/\s+/g, '_') || 'Resume';
  const versionTag = liveResume && !liveResume.isMaster ? 'Tailored' : 'Master';

  // ---------------------------------------------------------------------------
  // Reactive ATS Scoring Engine (Debounced 300ms)
  // ---------------------------------------------------------------------------
  const [reactiveAts, setReactiveAts] = useState<AtsMatchResult>(() =>
    calculateReactiveAtsScore(jobDescription, previewResume, resumeTitle || targetCompany)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = liveResume ?? masterVersion;
      const res = calculateReactiveAtsScore(
        jobDescription,
        current,
        resumeTitle || targetCompany
      );
      setReactiveAts(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [jobDescription, liveResume, resumeTitle, targetCompany, masterVersion]);

  // Pre-fill from sessionStorage handoff, AppContext discoveredJobs, or URL parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = sessionStorage.getItem('applyiq_tailor_job');
      if (stored) {
        const job = JSON.parse(stored);
        if (job) {
          const comp = job.companyName || job.company || '';
          const role = job.jobTitle || job.title || '';
          const desc = job.rawDescription || job.jobDescription || job.description || '';
          if (comp) setTargetCompany(comp);
          if (role) setTargetRole(role);
          if (desc) setJobDescription(desc);
          if (role || comp) {
            setResumeTitle(`${comp ? `${comp} ` : ''}${role ? `${role} ` : ''}Application – Tailored Resume`.trim());
          }
        }
        sessionStorage.removeItem('applyiq_tailor_job');
        return;
      }
    } catch (_) {}

    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');
    const co = params.get('company');
    const jd = params.get('jd') || params.get('jobDescription');
    const role = params.get('role') || params.get('title');

    // Context fallback: if jobId is provided, retrieve complete job from AppContext state / Supabase
    if (jobId && discoveredJobs?.length) {
      const found = discoveredJobs.find((j) => j.id === jobId);
      if (found) {
        const comp = found.companyName || found.company || (co ? decodeURIComponent(co) : '');
        const r = found.jobTitle || found.title || (role ? decodeURIComponent(role) : '');
        const desc = found.rawDescription || found.jobDescription || found.description || '';
        if (comp) setTargetCompany(comp);
        if (r) setTargetRole(r);
        if (desc) setJobDescription(desc);
        if (r || comp) {
          setResumeTitle(`${comp ? `${comp} ` : ''}${r ? `${r} ` : ''}Application – Tailored Resume`.trim());
        }
        return;
      }
    }

    if (co) setTargetCompany(decodeURIComponent(co));
    if (role) setTargetRole(decodeURIComponent(role));
    if (jd) setJobDescription(decodeURIComponent(jd));
    if (role || co) {
      setResumeTitle(`${co ? `${decodeURIComponent(co)} ` : ''}${role ? `${decodeURIComponent(role)} ` : ''}Application – Tailored Resume`.trim());
    }
  }, [discoveredJobs]);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pushChange = useCallback((label: string, type: ChangeCard['type']) => {
    setChangeFeed((prev) => [
      { id: crypto.randomUUID(), label, type, timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  // ---------------------------------------------------------------------------
  // Quick-Add Missing Keyword to Resume
  // ---------------------------------------------------------------------------
  const handleAddKeywordToResume = (keyword: string) => {
    const current = liveResume ?? masterVersion;
    const alreadyHas = (current.skills || []).some(
      (s) => s.name.toLowerCase() === keyword.toLowerCase()
    );
    if (alreadyHas) return;

    const newSkill: SkillItem = {
      id: crypto.randomUUID(),
      name: keyword,
      category: 'Tools & Other',
      proficiency: 'Advanced',
    };
    const updated = {
      ...current,
      skills: [...(current.skills || []), newSkill],
      updatedAt: new Date().toISOString(),
    };
    setLiveResume(updated);
    pushChange(`Added "${keyword}" to skills list`, 'edit');
  };

  // ---------------------------------------------------------------------------
  // API Tailor Handlers
  // ---------------------------------------------------------------------------
  const handleTailor = () => {
    if (!jobDescription.trim()) return;
    setError(null);
    setSaved(false);
    setSaveError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/tailor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription,
            currentResume: masterResume,
            candidateName: profile.name,
            candidateEmail: profile.email,
            candidatePhone: profile.phone,
            targetCompany: targetCompany.trim(),
            targetRole: targetRole.trim(),
            generateCoverLetter: includeCoverLetter,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'API error');
        const tailorRes = data as TailorResult;
        setResult(tailorRes);
        setLiveResume(tailorRes.tailoredResume);
        if (tailorRes.coverLetter) {
          setLiveCoverLetter(tailorRes.coverLetter);
        }
        if (!targetCompany.trim() && tailorRes.extractedCompany && tailorRes.extractedCompany !== 'Company') {
          setTargetCompany(tailorRes.extractedCompany);
        }
        if (!targetRole.trim() && tailorRes.extractedRole && tailorRes.extractedRole !== 'Target Position') {
          setTargetRole(tailorRes.extractedRole);
        }
        const effectiveCompany = targetCompany.trim() || (tailorRes.extractedCompany !== 'Company' ? tailorRes.extractedCompany : '');
        const effectiveRole = targetRole.trim() || tailorRes.extractedRole || '';
        if (effectiveCompany || effectiveRole) {
          setResumeTitle(`${effectiveCompany ? `${effectiveCompany} ` : ''}${effectiveRole ? `${effectiveRole} ` : ''}Application – Tailored Resume`.trim());
        }
        setStudioTab('resume');
        setChangeFeed([]);
        (tailorRes.changesSummary?.length ? tailorRes.changesSummary : ['Generated tailored resume'])
          .forEach((label: string) => pushChange(label, 'tailor'));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unexpected error');
      }
    });
  };

  const handleChatSend = (instruction: string) => {
    if (!instruction || isChatPending) return;
    setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: instruction }]);

    // Branch logic based on active tab: Cover Letter vs Resume
    if (studioTab === 'coverLetter') {
      const currentLetter = liveCoverLetter ?? result?.coverLetter;
      if (!currentLetter) {
        setChatMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: 'No cover letter available to edit. Please generate one first.' },
        ]);
        return;
      }

      startChatTransition(async () => {
        try {
          const res = await fetch('/api/tailor/cover-letter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coverLetter: currentLetter,
              instruction,
              candidateName: profile.name,
              targetCompany: targetCompany.trim() || result?.extractedCompany || 'Company',
              targetRole: targetRole.trim() || result?.extractedRole || 'Target Position',
              jobDescription,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? 'Cover letter edit failed');

          const sectionDiffs = computeCoverLetterDiff(currentLetter, data.updatedCoverLetter);
          const staged: StagedModification = {
            id: crypto.randomUUID(),
            instruction,
            changeDescription: data.changeDescription,
            documentType: 'cover_letter',
            originalCoverLetter: currentLetter,
            proposedCoverLetter: data.updatedCoverLetter,
            sectionDiffs,
            timestamp: new Date(),
          };
          setStagedModification(staged);

          setChatMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Proposed cover letter changes staged: "${data.changeDescription}". Review the diff in the document and accept or reject.`,
            },
          ]);
        } catch (e: unknown) {
          setChatMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` },
          ]);
        }
      });
      return;
    }

    // Default: resume edit
    const currentResume = liveResume ?? masterVersion;
    startChatTransition(async () => {
      try {
        const res = await fetch('/api/resume/chat-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume: currentResume, instruction, candidateName: profile.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Chat edit failed');
        const editResult = data as ChatEditResult;

        // Stage proposal rather than immediately mutating
        const sectionDiffs = computeResumeDiff(currentResume, editResult.updatedResume);
        const staged: StagedModification = {
          id: crypto.randomUUID(),
          instruction,
          changeDescription: editResult.changeDescription,
          documentType: 'resume',
          originalResume: currentResume,
          proposedResume: editResult.updatedResume,
          sectionDiffs,
          timestamp: new Date(),
        };
        setStagedModification(staged);

        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Proposed changes staged: "${editResult.changeDescription}". Review the visual diff and accept or reject below.`,
          },
        ]);
      } catch (e: unknown) {
        setChatMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` },
        ]);
      }
    });
  };

  const handleAcceptStaged = () => {
    if (!stagedModification) return;
    const { documentType, proposedResume, proposedCoverLetter, changeDescription } = stagedModification;

    if (documentType === 'cover_letter' && proposedCoverLetter) {
      setLiveCoverLetter(proposedCoverLetter);
      pushChange(changeDescription, 'chat');
    } else if (proposedResume) {
      setLiveResume(proposedResume);
      pushChange(changeDescription, 'chat');
    }

    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'assistant', content: `✓ Accepted: ${changeDescription}` },
    ]);
    setStagedModification(null);
  };

  const handleRejectStaged = () => {
    if (!stagedModification) return;
    const { changeDescription } = stagedModification;
    setStagedModification(null);
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'assistant', content: `Discarded proposal: ${changeDescription}` },
    ]);
  };

  const handleSaveAll = () => {
    if (!result && !liveResume) return;
    const finalCompany =
      targetCompany.trim() ||
      (result?.extractedCompany !== 'Company' ? result?.extractedCompany : '') ||
      'Target Company';
    const title = resumeTitle.trim() || `${finalCompany} Application – Tailored Resume`;
    setSaveError(null);
    try {
      const savedVersion = createTailoredResume(
        liveResume ?? result?.tailoredResume ?? {
          summary: masterResume.summary,
          experiences: masterResume.experiences,
          education: masterResume.education,
          projects: masterResume.projects,
          skills: masterResume.skills,
        },
        title
      );
      let savedLetter: CoverLetterItem | undefined;
      const currentCoverLetter = liveCoverLetter ?? result?.coverLetter;
      if (currentCoverLetter) {
        savedLetter = saveCoverLetter({
          jobId: '',
          targetCompany: finalCompany,
          targetPosition: title.replace(' – Tailored Resume', ''),
          dateGenerated: new Date().toISOString().split('T')[0],
          recipientName: `${finalCompany} Team`,
          bodyText: currentCoverLetter.body,
        });
      }

      if (addToKanban) {
        addApplication({
          companyName: finalCompany,
          jobTitle: title.replace(' – Tailored Resume', ''),
          jobDescription,
          jobUrl: '',
          applicationDate: new Date().toISOString().split('T')[0],
          status: 'wishlist',
          notes: `Created via AI Tailor Studio (ATS Score: ${reactiveAts.atsScore}%). Tailored resume snapshot and cover letter attached.`,
          tailoredResumeId: savedVersion.id,
          coverLetterId: savedLetter?.id,
          aiAnalysis: {
            matchScore: reactiveAts.atsScore,
            fitSummary:
              reactiveAts.fitSummary ||
              `Generated tailored version with ${reactiveAts.matchedKeywords.length} matched target skills.`,
            matchedSkills: reactiveAts.matchedKeywords,
            missingSkills: reactiveAts.missingKeywords,
            keyRequirements: [],
            cvRecommendations: [],
            coverLetterDraft: currentCoverLetter?.body ?? '',
          },
        });
        pushChange(`Tracked in Kanban (Wishlist): ${finalCompany}`, 'save');
      }

      setSaved(true);
      pushChange(`Saved: ${title}`, 'save');

      if (isGuestMode && !user) {
        openAuthModal({
          title: 'Save Tailored Assets to Cloud',
          description:
            'Your tailored resume and cover letter are saved in this browser. Connect your account with Google SSO to permanently sync your snapshots and active applications to Supabase.',
          returnUrl: '/tailor',
        });
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleReset = () => {
    setResult(null);
    setLiveResume(null);
    setLiveCoverLetter(null);
    setStagedModification(null);
    setError(null);
    setSaved(false);
    setSaveError(null);
    setResumeTitle('');
    setJobDescription('');
    setTargetCompany('');
    setChangeFeed([]);
    setChatMessages([]);
    setStudioTab('jobfit');
  };

  // Format states for tailored resume and cover letter
  const [resumeFormatSettings, setResumeFormatSettings] = useState<ResumeFormatSettings>(() =>
    getSavedFormatSettings('resume', DEFAULT_FORMAT_SETTINGS)
  );
  const [letterFormatSettings, setLetterFormatSettings] = useState<ResumeFormatSettings>(() =>
    getSavedFormatSettings('cover_letter', DEFAULT_COVER_LETTER_FORMAT_SETTINGS)
  );

  const handleUpdateResumeFormat = (updated: ResumeFormatSettings) => {
    setResumeFormatSettings(updated);
    saveFormatSettings('resume', updated);
  };

  const handleUpdateLetterFormat = (updated: ResumeFormatSettings) => {
    setLetterFormatSettings(updated);
    saveFormatSettings('cover_letter', updated);
  };

  // ---------------------------------------------------------------------------
  // Export Handlers (always export latest live/edited content)
  // ---------------------------------------------------------------------------
  const handleExportResumePdf = () => {
    const ver = liveResume ?? masterVersion;
    exportResumeVersionPdf(ver, profile, resumeFormatSettings);
  };

  const handleExportResumeDocx = () => {
    const ver = liveResume ?? result?.tailoredResume ?? masterVersion;
    exportResumeVersionDocx(ver, profile, resumeFormatSettings);
  };

  const handleExportLetterPdf = () => {
    const cl = liveCoverLetter ?? result?.coverLetter;
    if (!cl) return;
    const finalCompany = targetCompany.trim() || result?.extractedCompany || 'Target Company';
    const html = buildCoverLetterHtml({
      name: profile.name,
      title: profile.title,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      websiteUrl: profile.websiteUrl,
      targetCompany: finalCompany,
      targetPosition: resumeTitle.trim() || 'Role',
      bodyText: cl.body,
      date: new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
    printHtml(html, `Cover Letter - ${profile.name} for ${finalCompany}`, letterFormatSettings);
  };

  const handleExportLetterDocx = () => {
    const cl = liveCoverLetter ?? result?.coverLetter;
    if (!cl) return;
    const finalCompany = targetCompany.trim() || result?.extractedCompany || 'Target Company';
    exportCoverLetterDocx(
      {
        id: 'draft',
        jobId: '',
        targetCompany: finalCompany,
        targetPosition: resumeTitle.trim() || 'Role',
        dateGenerated: new Date().toISOString().split('T')[0],
        recipientName: `${finalCompany} Team`,
        bodyText: cl.body,
      },
      profile,
      letterFormatSettings
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  // If user has no master resume, gate with onboarding interface
  if (!hasMasterResume) {
    return (
      <div className="max-w-4xl w-full mx-auto py-10 px-4">
        <MasterResumeOnboard
          title="Upload or Initialize Your Master Resume First"
          subtitle="Before tailoring your CV against specific job postings and running ATS keyword analysis, ApplyIQ needs your foundational resume data."
          redirectNotice="Once uploaded or initialized, you will immediately unlock the AI Tailoring Studio."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-100 dark:bg-slate-950" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ================================================================== */}
      {/* TOP HEADER BAR                                                       */}
      {/* ================================================================== */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs shrink-0 z-20">
        {/* Left — doc name + version tag */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
            {docName}
          </span>
          <span
            className={clsx(
              'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border',
              versionTag === 'Tailored'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            )}
          >
            {versionTag}
          </span>

          {/* Live Reactive ATS score badge in header */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">ATS Match:</span>
            <span
              className={clsx(
                reactiveAts.atsScore >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : reactiveAts.atsScore >= 65
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {reactiveAts.atsScore}%
            </span>
          </div>
        </div>

        {/* Center — document tabs */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
          {(['resume', 'jobfit', 'coverLetter'] as StudioTab[]).map((tab) => {
            const labels: Record<StudioTab, string> = {
              resume: 'RESUME',
              jobfit: 'JOB FIT',
              coverLetter: 'COVER LETTER',
            };
            const tabIcons: Record<StudioTab, React.ReactNode> = {
              resume: <FileText className="w-3.5 h-3.5" />,
              jobfit: <Target className="w-3.5 h-3.5" />,
              coverLetter: <Mail className="w-3.5 h-3.5" />,
            };
            return (
              <button
                key={tab}
                onClick={() => setStudioTab(tab)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer',
                  studioTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {tabIcons[tab]}
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Export dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    handleExportResumePdf();
                    setShowDownloadMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-500" />
                  Resume PDF
                </button>
                <button
                  onClick={() => {
                    handleExportResumeDocx();
                    setShowDownloadMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  Resume .docx
                </button>
                {(liveCoverLetter || result?.coverLetter) && (
                  <>
                    <div className="border-t border-slate-100 dark:border-slate-700" />
                    <button
                      onClick={() => {
                        handleExportLetterPdf();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-500" />
                      Cover Letter PDF
                    </button>
                    <button
                      onClick={() => {
                        handleExportLetterDocx();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      Cover Letter .docx
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {(result || liveResume) && !saved && (
            <button
              id="save-changes-btn"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors active:scale-[0.98] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
          )}
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved!
            </div>
          )}
          {(result || liveResume) && (
            <button
              onClick={handleReset}
              title="Start over"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* BODY — dual pane                                                     */}
      {/* ================================================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ============================================================ */}
        {/* LEFT — document / preview pane with INLINE LIVE EDITING        */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-900 relative">
          {/* JOB FIT tab — tailor input form */}
          {studioTab === 'jobfit' && (
            <div className="absolute inset-0 z-10 overflow-y-auto flex items-start justify-center p-6">
              <div className="w-full max-w-2xl space-y-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">AI Tailor Engine</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Paste a job description to tailor your resume &amp; calculate match score
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="company-input"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      Company (Optional)
                    </label>
                    <input
                      id="company-input"
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Atlassian, Canva"
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full">
                      <input
                        type="checkbox"
                        checked={includeCoverLetter}
                        onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Cover Letter (350–450w)
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Generate 4-paragraph formal draft
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="jd-textarea" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Job Description <span className="text-rose-500">*</span>
                  </label>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <textarea
                      id="jd-textarea"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the full job description here (responsibilities, required skills, about company)..."
                      rows={10}
                      className="w-full resize-none bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 p-4 focus:outline-none"
                    />
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{jobDescription.length} chars</span>
                      <span className="text-[10px] text-slate-400">GPT-4o mini · Conservative ATS engine</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 text-sm text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  id="tailor-btn"
                  onClick={handleTailor}
                  disabled={!jobDescription.trim() || isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Generating tailored resume &amp; cover letter…
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate Tailored Resume &amp; Cover Letter
                    </>
                  )}
                </button>

                {result && (
                  <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Resume tailored —{' '}
                    <button
                      onClick={() => setStudioTab('resume')}
                      className="underline hover:no-underline cursor-pointer"
                    >
                      view &amp; edit live
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* RESUME and COVER LETTER tabs — A4 paper preview with LIVE INLINE EDITING */}
          {studioTab !== 'jobfit' && (
            <div className="py-8 px-4 flex justify-center min-h-full">
              {isPending ? (
                /* Loading skeleton */
                <div
                  className="bg-white shadow-2xl mx-auto animate-pulse rounded-sm"
                  style={{ width: 816, minHeight: 1056 }}
                >
                  <div className="p-12 space-y-6">
                    <div className="h-8 w-64 bg-slate-200 rounded mx-auto" />
                    <div className="h-4 w-96 bg-slate-100 rounded mx-auto" />
                    <div className="h-px bg-slate-200 mt-6" />
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-48 bg-slate-200 rounded" />
                        <div className="h-3 w-full bg-slate-100 rounded" />
                        <div className="h-3 w-5/6 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : studioTab === 'resume' ? (
                <TailoredResumePreview
                  resume={stagedModification?.proposedResume || previewResume}
                  profile={profile}
                  highlightKeywords={new Set(reactiveAts.matchedKeywords)}
                  showControls
                  editable={!stagedModification}
                  formatSettings={resumeFormatSettings}
                  onFormatChange={handleUpdateResumeFormat}
                  onExportDocx={handleExportResumeDocx}
                  onExportPdf={handleExportResumePdf}
                  onChange={(updated) => {
                    setLiveResume(updated);
                    pushChange('Updated resume content', 'edit');
                  }}
                  stagedDiff={stagedModification}
                  onAcceptStaged={handleAcceptStaged}
                  onRejectStaged={handleRejectStaged}
                />
              ) : studioTab === 'coverLetter' && (liveCoverLetter || result?.coverLetter) ? (
                <CoverLetterPreview
                  coverLetter={
                    stagedModification && stagedModification.documentType === 'cover_letter' && stagedModification.proposedCoverLetter
                      ? stagedModification.proposedCoverLetter
                      : (liveCoverLetter ?? result!.coverLetter!)
                  }
                  profile={profile}
                  targetCompany={targetCompany || result?.extractedCompany || 'Company'}
                  targetPosition={targetRole || result?.extractedRole || resumeTitle || 'Target Position'}
                  showToolbar
                  editable={!stagedModification}
                  formatSettings={letterFormatSettings}
                  onFormatChange={handleUpdateLetterFormat}
                  onExportDocx={handleExportLetterDocx}
                  onExportPdf={handleExportLetterPdf}
                  onChange={(updated) => {
                    setLiveCoverLetter(updated);
                    pushChange('Updated cover letter content', 'edit');
                  }}
                  stagedDiff={stagedModification?.documentType === 'cover_letter' ? stagedModification : null}
                  onAcceptStaged={handleAcceptStaged}
                  onRejectStaged={handleRejectStaged}
                />
              ) : (
                /* No cover letter yet */
                <div className="flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
                  <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    No cover letter generated yet
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                    Run Tailor with cover letter enabled
                  </p>
                  <button
                    onClick={() => setStudioTab('jobfit')}
                    className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Generate now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT — AI assistant sidebar with REACTIVE ATS SCORECARD      */}
        {/* ============================================================ */}
        <AiChatSidebar
          matchResult={reactiveAts}
          chatMessages={chatMessages}
          isChatPending={isChatPending}
          onSendMessage={handleChatSend}
          onAddKeywordToResume={handleAddKeywordToResume}
          changeFeed={changeFeed}
          jobDescription={jobDescription}
          onJobDescriptionChange={setJobDescription}
          targetCompany={targetCompany}
          onTargetCompanyChange={setTargetCompany}
          includeCoverLetter={includeCoverLetter}
          onIncludeCoverLetterChange={setIncludeCoverLetter}
          onReTailor={handleTailor}
          isTailorPending={isPending}
          tailorError={error}
          saved={saved}
          saveError={saveError}
          onSaveAll={handleSaveAll}
          resumeTitle={resumeTitle}
          onResumeTitleChange={setResumeTitle}
          addToKanban={addToKanban}
          onAddToKanbanChange={setAddToKanban}
          stagedModification={stagedModification}
          onAcceptStaged={handleAcceptStaged}
          onRejectStaged={handleRejectStaged}
          activeTab={studioTab}
          targetRole={targetRole}
        />
      </div>
    </div>
  );
}
