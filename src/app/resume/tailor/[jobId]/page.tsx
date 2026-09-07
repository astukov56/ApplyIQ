'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Badge } from '@/components/ui';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Wand2,
  Building2,
  MapPin,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Check,
  Copy,
} from 'lucide-react';
import Link from 'next/link';

export default function ResumeTailoringStudioPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const {
    getDiscoveredJob,
    profile,
    masterResume,
    tailorResumeForJob,
    getTailoredResume,
    updateTailoredResume,
    toggleApplyJob,
  } = useApp();

  const job = getDiscoveredJob(jobId);
  const tailored = getTailoredResume(jobId);

  const [summaryText, setSummaryText] = useState(tailored?.tailoredSummary || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (jobId && job && !tailored) {
      tailorResumeForJob(jobId);
    }
  }, [jobId, job, tailored, tailorResumeForJob]);

  useEffect(() => {
    if (tailored?.tailoredSummary) {
      setSummaryText(tailored.tailoredSummary);
    }
  }, [tailored?.id]);

  if (!job) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Job Posting Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested job ID could not be loaded for resume tailoring.
        </p>
        <Link href="/">
          <Button variant="primary" size="sm">
            Back to Discover Jobs
          </Button>
        </Link>
      </div>
    );
  }

  if (!tailored) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Generating tailored resume...</p>
      </div>
    );
  }

  const handleSaveResume = () => {
    updateTailoredResume(tailored.id, {
      tailoredSummary: summaryText,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover Jobs</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href={`/cover-letter/${job.id}`}>
            <Button variant="outline" size="sm" icon={<FileText className="w-3.5 h-3.5" />}>
              Generate Cover Letter
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveResume}
            icon={savedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
          >
            {savedSuccess ? 'Saved to Profile!' : 'Save Tailored Resume'}
          </Button>
        </div>
      </div>

      {/* Target Job Context Card */}
      <Card className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200">
                {job.companyName}
              </span>
              <span className="text-xs text-indigo-400 font-medium">
                Tailoring Target
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {job.jobTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location}
              </span>
              <span>{job.workArrangement}</span>
              {job.salary && <span className="text-emerald-400 font-semibold">{job.salary}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-lg font-bold text-white">{job.matchScore}%</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider">
                Target Compatibility
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Truthfulness Guarantee Notice (Core Product Principle) */}
      <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 sm:p-5 flex items-start gap-3.5 text-emerald-950 dark:text-emerald-200">
        <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2">
            ApplyIQ Truthfulness Guarantee
          </h4>
          <p className="text-xs text-emerald-900/90 dark:text-emerald-300 leading-relaxed">
            ApplyIQ never invents or hallucinates qualifications, employers, degrees, or skills not present in your Master Resume. Tailoring only optimizes keyword emphasis, elevates relevant projects, and sharpens existing achievements.
          </p>
        </div>
      </div>

      {/* 2-Column Comparison Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Changes Made & Requirements Comparison (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Changes Made Section */}
          <Card className="border-indigo-200/60 dark:border-indigo-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-sm">Changes Made by ApplyIQ</CardTitle>
              </div>
              <Badge variant="purple" size="sm">
                {tailored.changesMade.length} Optimizations
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {tailored.changesMade.map((chg, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-[10px]">
                        {idx + 1}
                      </span>
                      {chg.category}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      Truthful
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 pt-0.5 leading-snug">
                    {chg.description}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <strong className="text-slate-700 dark:text-slate-300">Why: </strong>
                    {chg.rationale}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Job Requirements Alignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Target Role Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-xs">
              {(job.requirements || job.keyRequirements || []).map((req, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300 leading-snug">{req}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tailored Resume Document Preview & Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6 shadow-md border-slate-300 dark:border-slate-700">
            {/* Header info */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {tailored.versionName}
                </h3>
                <p className="text-xs text-slate-500">
                  Targeted for {job.companyName} ({job.jobTitle})
                </p>
              </div>
              <Badge variant="success" size="sm">
                Tailored Preview
              </Badge>
            </div>

            {/* Candidate Info */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {profile.name}
              </h2>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {profile.title}
              </p>
              <p className="text-[11px] text-slate-400">
                {profile.email} • {profile.phone} • {profile.location}
              </p>
            </div>

            {/* Tailored Summary Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tailored Professional Summary
                </label>
                <span className="text-[10px] text-indigo-500 font-medium">
                  Editable in-place
                </span>
              </div>
              <Textarea
                rows={3}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Reordered Skills Breakdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Highlighted Technical Competencies
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tailored.tailoredSkills.map((s, idx) => {
                  const isTopMatch = (job.skills || job.matchedSkills || []).includes(s);
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        isTopMatch
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s} {isTopMatch && '★'}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Emphasized Experience Section */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Targeted Experience Timeline
              </label>
              {tailored.tailoredExperiences.map((exp) => (
                <div
                  key={exp.id}
                  className={`p-4 rounded-xl border ${
                    exp.isEmphasized
                      ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                      : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    <span>
                      {exp.role} — {exp.company}
                    </span>
                    <span className="font-normal text-xs text-slate-500">
                      {exp.period}
                    </span>
                  </div>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {exp.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Emphasized Projects */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Relevant Featured Projects
              </label>
              {tailored.tailoredProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{proj.title}</span>
                    <span className="text-[11px] text-indigo-500 font-normal">
                      {proj.techStack.join(', ')}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {proj.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => router.push('/resume')}>
                View All Resumes
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveResume}
                icon={savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              >
                {savedSuccess ? 'Saved!' : 'Save Tailored Resume'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
