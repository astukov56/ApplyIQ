'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge } from '@/components/ui';
import {
  ArrowLeft,
  FileText,
  Copy,
  Check,
  Sparkles,
  Save,
  Wand2,
  Building2,
  MapPin,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

export default function CoverLetterGeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const {
    getDiscoveredJob,
    profile,
    generateCoverLetterForJob,
    getCoverLetter,
    updateCoverLetter,
  } = useApp();

  const job = getDiscoveredJob(jobId);
  const letter = getCoverLetter(jobId);

  const [letterText, setLetterText] = useState(letter?.bodyText || '');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (jobId && job && !letter) {
      generateCoverLetterForJob(jobId);
    }
  }, [jobId, job, letter, generateCoverLetterForJob]);

  useEffect(() => {
    if (letter?.bodyText) {
      setLetterText(letter.bodyText);
    }
  }, [letter?.id]);

  if (!job) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Job Posting Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested job could not be loaded for cover letter generation.
        </p>
        <Link href="/">
          <Button variant="primary" size="sm">
            Back to Discover Jobs
          </Button>
        </Link>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Generating cover letter...</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    updateCoverLetter(letter.id, letterText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover Jobs</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href={`/resume/tailor/${job.id}`}>
            <Button variant="outline" size="sm" icon={<Wand2 className="w-3.5 h-3.5" />}>
              Tailor Resume
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Cover Letter'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            icon={saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          >
            {saved ? 'Saved!' : 'Save Letter'}
          </Button>
        </div>
      </div>

      {/* Target Job Header Card */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200">
                {job.companyName}
              </span>
              <span className="text-xs text-indigo-400 font-medium">
                Cover Letter Target
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {job.jobTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>{job.location}</span>
              <span>•</span>
              <span>{job.workArrangement}</span>
              <span>•</span>
              <span className="text-indigo-300 font-semibold">{job.matchScore}% Candidate Match</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="purple" size="md">
              AI Tailored Letter
            </Badge>
          </div>
        </div>
      </Card>

      {/* Main Cover Letter Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context & Prompt Signals */}
        <div className="space-y-4">
          <Card className="border-indigo-100 dark:border-indigo-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm">Context Synthesized</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white">Profile Evidence:</span>
                <p>Synthesized verified master resume experience, technical projects, and academic background.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white">Role Keywords Highlighted:</span>
                <p>{(job.skills || job.matchedSkills || []).slice(0, 4).join(', ')}.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white">Tone & Stance:</span>
                <p>Professional, collaborative, enthusiastic, and evidence-grounded.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Editable Cover Letter Document */}
        <div className="lg:col-span-2">
          <Card className="p-6 sm:p-8 space-y-4 shadow-sm border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cover Letter for {job.companyName}
                </h3>
                <p className="text-xs text-slate-400">
                  Generated {letter.dateGenerated} • Click to edit directly
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <Textarea
              rows={14}
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              className="text-xs sm:text-sm font-mono leading-relaxed bg-slate-50/50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800"
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLetterText(letter.bodyText)}
                className="text-xs text-slate-400"
                icon={<RotateCcw className="w-3 h-3" />}
              >
                Reset to AI Draft
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                icon={saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              >
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
