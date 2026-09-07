'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import type {
  DiscoveredJob,
  JobImportMode,
  JobImportResponse,
  ApplicationStatus,
} from '@/types';
import { JobDetailModal } from '@/components/discovery/JobDetailModal';
import { Card, CardContent, Button, Input } from '@/components/ui';
import {
  Sparkles,
  Link2,
  FileText,
  Building2,
  MapPin,
  DollarSign,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clipboard,
  Wand2,
  Kanban,
  Check,
  Search,
  SlidersHorizontal,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

const SAMPLE_JOB_TEXT = `Company: Canva
Job Title: Senior Full-Stack Engineer (Product & AI Tools)
Location: Sydney, NSW, Australia (Hybrid - 2 days in Surry Hills office)
Salary: $160,000 - $190,000 + equity + super
Employment Type: Full-time

About Canva:
Canva is on a mission to empower everyone in the world to design anything and publish anywhere.

The Role:
We are looking for an experienced Senior Full-Stack Engineer to join our Core Creation & AI Experiences team in Sydney. You will design, build, and ship performant web interfaces and robust backend services that power millions of creators daily.

Key Responsibilities:
- Architect, build, and scale customer-facing features using React, TypeScript, and Next.js.
- Build high-throughput, low-latency microservices with Node.js, Python, and AWS serverless technologies.
- Partner closely with product managers, UX designers, and ML engineers to integrate generative AI workflows into user tools.
- Maintain top-tier code quality with automated testing (Jest, Playwright) and robust CI/CD pipelines.

Qualifications & Requirements:
- 4+ years of professional experience building web applications at scale.
- Advanced expertise in TypeScript, React, modern JavaScript, and CSS/Tailwind.
- Proven backend engineering experience with Node.js, Python, or Go.
- Working knowledge of cloud infrastructure (AWS or GCP) and Docker containers.
- Strong product mindset, customer empathy, and collaborative spirit in agile squads.
- Bachelor's degree in Computer Science, Software Engineering, or equivalent practical experience.`;

export function JobImportView() {
  const router = useRouter();
  const { masterResume, discoveredJobs, addImportedJob, addJobToApplications, applications } =
    useApp();

  // Mode & input states
  const [activeTab, setActiveTab] = useState<JobImportMode>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');

  // Execution states
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<number>(0); // 0=idle, 1=fetching, 2=extracting, 3=scoring
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [botBlockedDomain, setBotBlockedDomain] = useState<string | null>(null);

  // Result state
  const [importedJob, setImportedJob] = useState<DiscoveredJob | null>(null);
  const [isAddedToKanban, setIsAddedToKanban] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<DiscoveredJob | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // History filtering
  const [historySearch, setHistorySearch] = useState('');
  const [historyMinScore, setHistoryMinScore] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (activeTab === 'url') {
            setUrlInput(text.trim());
          } else {
            setTextInput(text.trim());
          }
        }
      }
    } catch (_) {
      // Browser permission denied or not supported
    }
  };

  const handleFillSample = () => {
    setActiveTab('text');
    setTextInput(SAMPLE_JOB_TEXT);
    setErrorMsg(null);
    setBotBlockedDomain(null);
  };

  const handleSwitchToPaste = () => {
    setActiveTab('text');
    setErrorMsg(null);
    setBotBlockedDomain(null);
  };

  const handleRunImport = () => {
    setErrorMsg(null);
    setBotBlockedDomain(null);
    setImportedJob(null);
    setIsAddedToKanban(false);

    if (activeTab === 'url' && !urlInput.trim()) {
      setErrorMsg('Please enter a job posting URL.');
      return;
    }

    if (activeTab === 'text' && (!textInput.trim() || textInput.trim().length < 25)) {
      setErrorMsg('Please paste at least 25 characters of the job description.');
      return;
    }

    startTransition(async () => {
      try {
        setCurrentStep(1); // Fetching

        const bodyPayload = {
          mode: activeTab,
          url: activeTab === 'url' ? urlInput.trim() : undefined,
          rawText: activeTab === 'text' ? textInput.trim() : undefined,
          masterResume,
        };

        const res = await fetch('/api/jobs/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        setCurrentStep(2); // Extraction

        const data: JobImportResponse = await res.json();

        if (!res.ok || !data.success) {
          if (data.errorCode === 'BOT_BLOCKED') {
            setBotBlockedDomain(data.blockedDomain || 'external platform');
          }
          throw new Error(data.error || 'Failed to ingest job posting.');
        }

        setCurrentStep(3); // ATS Scoring Complete

        if (data.job) {
          addImportedJob(data.job);
          setImportedJob(data.job);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An unexpected error occurred during ingestion.');
      } finally {
        setCurrentStep(0);
      }
    });
  };

  const handlePushToKanban = (status: ApplicationStatus = 'wishlist') => {
    if (!importedJob) return;
    addJobToApplications(importedJob, status);
    setIsAddedToKanban(true);
  };

  const handleOpenInTailor = (job: DiscoveredJob) => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('applyiq_tailor_job', JSON.stringify(job));
      }
    } catch (_) {}
    router.push(`/tailor?jobId=${job.id}&company=${encodeURIComponent(job.companyName)}&role=${encodeURIComponent(job.jobTitle)}`);
  };

  // Filter history jobs
  const filteredHistory = (discoveredJobs || []).filter((job) => {
    const q = historySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      job.companyName.toLowerCase().includes(q) ||
      job.jobTitle.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q) ||
      (job.skills || []).some((s) => s.toLowerCase().includes(q));

    const matchesScore = (job.matchScore ?? 0) >= historyMinScore;
    return matchesSearch && matchesScore;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Ingestion Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-7 sm:p-9 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Job Ingestion Engine</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            <span className="text-[11px] font-medium text-indigo-200">Phase 1 In-App Importer</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Ingest Any Job. Score Alignment. Tailor in Seconds.
          </h1>

          <p className="text-sm sm:text-base text-indigo-200/90 leading-relaxed">
            Eliminate fragile scrapers and broken 404 links. Ingest active job descriptions via live URL or
            direct text from any company board, run real-time ATS match scoring against your{' '}
            <strong className="text-white font-semibold">{masterResume.versionName}</strong>, and push
            directly to your Kanban tracker and AI Tailor Studio.
          </p>
        </div>
      </div>

      {/* Main Ingestion Workbench Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Tab Navigation Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('url');
                setErrorMsg(null);
                setBotBlockedDomain(null);
              }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                activeTab === 'url'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Link2 className="w-4 h-4" />
              <span>Live Job URL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('text');
                setErrorMsg(null);
                setBotBlockedDomain(null);
              }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                activeTab === 'text'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <FileText className="w-4 h-4" />
              <span>Quick Paste Text</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
              <span>Paste Clipboard</span>
            </button>

            <button
              type="button"
              onClick={handleFillSample}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Fill a realistic Canva engineering posting"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Fill Sample Job</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Live Job URL */}
        {activeTab === 'url' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Target Job Posting URL
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste the URL from company portals or applicant tracking systems (e.g. Greenhouse,
                Lever, Ashby, Workable, SmartRecruiters, Jobvite, company career pages).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Input
                  type="url"
                  placeholder="https://boards.greenhouse.io/company/jobs/123456 or https://jobs.lever.co/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunImport();
                  }}
                  className="h-12 text-sm pl-4 pr-10 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-indigo-500"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    ×
                  </button>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleRunImport}
                disabled={isPending || !urlInput.trim()}
                className="h-12 px-7 rounded-2xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ingesting…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Import & Align ATS</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Supported Platforms:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Greenhouse</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Lever</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Ashby</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Workable</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Company Direct Sites</span>
            </div>
          </div>
        )}

        {/* Tab 2: Quick Paste Text */}
        {activeTab === 'text' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Raw Job Description Text
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select all and copy from LinkedIn, SEEK, Indeed, or any job board. Paste it directly below.
                </p>
              </div>

              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {textInput.length.toLocaleString()} characters
              </span>
            </div>

            <textarea
              rows={8}
              placeholder="Paste job posting text here (including role title, company description, responsibilities, requirements, and tech stack)..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full p-4 text-xs sm:text-sm font-mono leading-relaxed rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-y transition-all"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero bot-block risk. Fast structured extraction with OpenAI & ATS scoring.</span>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleRunImport}
                disabled={isPending || !textInput.trim() || textInput.trim().length < 25}
                className="h-11 px-8 rounded-2xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Text…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze & Align ATS</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Progress State Indicator */}
        {isPending && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>
                  {currentStep === 1
                    ? 'Fetching URL content & sanitizing HTML...'
                    : currentStep === 2
                      ? 'Extracting structured role metadata & tech stack with AI...'
                      : 'Computing precision ATS match scoring against Master Resume...'}
                </span>
              </span>
              <span>Step {currentStep || 1} of 3</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{
                  width: currentStep === 1 ? '33%' : currentStep === 2 ? '70%' : '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* Bot-Blocked Banner Alert (Graceful Fallback UI) */}
        {botBlockedDomain && (
          <div className="border-t border-amber-200 dark:border-amber-800/60 p-6 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-200/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                  Bot Verification Detected on {botBlockedDomain}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Platforms like <strong>{botBlockedDomain}</strong> intentionally block automated
                  server requests to protect their walled garden. No problem at all! Simply copy the job
                  description text from your browser and switch to the Quick Paste tab.
                </p>
              </div>
            </div>

            <div className="pl-11 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSwitchToPaste}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Switch to Quick Paste Text Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Generic Error Banner */}
        {errorMsg && !botBlockedDomain && (
          <div className="border-t border-rose-200 dark:border-rose-800/60 p-5 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Successfully Ingested Job Preview Banner */}
      {importedJob && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900 shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-6 sm:p-7 border-b border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Ingestion & ATS Alignment Successful
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {importedJob.jobTitle}
                </h2>
              </div>
            </div>

            {/* Quick Action Handoffs */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handlePushToKanban('wishlist')}
                disabled={isAddedToKanban}
                className={clsx(
                  'px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs',
                  isAddedToKanban
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                )}
              >
                {isAddedToKanban ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tracked on Kanban!</span>
                  </>
                ) : (
                  <>
                    <Kanban className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
                    <span>Push to Kanban Tracker</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenInTailor(importedJob)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Open in AI Tailor Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta Tags Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{importedJob.companyName}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{importedJob.location}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{importedJob.workArrangement} • {importedJob.employmentType}</span>
              </div>

              {importedJob.salary && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 font-semibold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{importedJob.salary}</span>
                </div>
              )}
            </div>

            {/* ATS Score & Fit Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <div className="md:col-span-3 flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                  {importedJob.matchScore}%
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  ATS Match Score
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {importedJob.matchScore >= 80 ? 'High Alignment' : 'Moderate Alignment'}
                </div>
              </div>

              <div className="md:col-span-9 space-y-2.5 flex flex-col justify-center">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Fit Evaluation Summary</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {importedJob.fitSummary}
                </p>

                {/* Score Breakdown Bars */}
                {importedJob.matchBreakdown && (
                  <div className="pt-2 grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Technical</span>
                        <span>{importedJob.matchBreakdown.technical}/40</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(importedJob.matchBreakdown.technical / 40) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Role Fit</span>
                        <span>{importedJob.matchBreakdown.roleRelevance}/30</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(importedJob.matchBreakdown.roleRelevance / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Experience</span>
                        <span>{importedJob.matchBreakdown.experienceFit}/30</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${(importedJob.matchBreakdown.experienceFit / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Alignment Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Matched Skills */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Matched Core Skills ({importedJob.matchedSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {importedJob.matchedSkills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Missing / Desired Skills ({importedJob.missingSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {importedJob.missingSkills.length > 0 ? (
                    importedJob.missingSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">None - Complete match!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Requirements */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Key Requirements Extracted ({importedJob.keyRequirements.length})
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {importedJob.keyRequirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Description Accordion */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    {showFullDescription
                      ? 'Hide Complete Description'
                      : `View Complete Formatted Description (${importedJob.jobDescription?.split(/\s+/).filter(Boolean).length || 0} words)`}
                  </span>
                  {showFullDescription ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  100% verbatim text preserved
                </span>
              </div>

              {showFullDescription && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto">
                  {importedJob.jobDescription}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Ingested Jobs Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Recently Ingested Jobs History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredHistory.length} opportunities ready for ATS tailoring and Kanban tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Input
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                className="h-9 text-xs"
              />
            </div>

            <select
              value={historyMinScore}
              onChange={(e) => setHistoryMinScore(Number(e.target.value))}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={0}>All Scores</option>
              <option value={75}>75%+ Match</option>
              <option value={85}>85%+ Match</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold">No ingested jobs found</p>
              <p className="text-xs max-w-sm mx-auto">
                Paste a live job link or copy text from LinkedIn or SEEK above to import your first role!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistory.map((job) => {
              const isTracked = applications.some(
                (a) =>
                  a.companyName.toLowerCase() === job.companyName.toLowerCase() &&
                  a.jobTitle.toLowerCase() === job.jobTitle.toLowerCase()
              );

              return (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                          {job.companyName}
                        </span>
                        <h4
                          onClick={() => setSelectedJobForModal(job)}
                          className="text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                        >
                          {job.jobTitle}
                        </h4>
                      </div>

                      <span
                        className={clsx(
                          'px-2.5 py-1 rounded-xl text-xs font-extrabold shrink-0',
                          job.matchScore >= 80
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        )}
                      >
                        {job.matchScore}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {job.location}
                      </span>
                      <span>•</span>
                      <span>{job.workArrangement}</span>
                    </div>

                    {/* Skill tags */}
                    <div className="flex flex-wrap gap-1">
                      {(job.matchedSkills || []).slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {s}
                        </span>
                      ))}
                      {(job.matchedSkills || []).length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400">
                          +{(job.matchedSkills || []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => addJobToApplications(job, 'wishlist')}
                      disabled={isTracked}
                      className={clsx(
                        'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                        isTracked
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      {isTracked ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tracked</span>
                        </>
                      ) : (
                        <>
                          <Kanban className="w-3.5 h-3.5 text-slate-400" />
                          <span>Track</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenInTailor(job)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Tailor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for full inspection */}
      <JobDetailModal
        job={selectedJobForModal}
        isOpen={Boolean(selectedJobForModal)}
        onClose={() => setSelectedJobForModal(null)}
        onToggleSave={() => {}}
        onToggleApply={() => {}}
      />
    </div>
  );
}
