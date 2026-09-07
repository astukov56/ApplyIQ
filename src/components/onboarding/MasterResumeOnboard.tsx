'use client';

import React, { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ResumeUploadZone, ParsedResumeData } from '@/components/resume/ResumeUploadZone';
import { Card, CardContent, Button, Badge, Textarea } from '@/components/ui';
import {
  FileText,
  Sparkles,
  UploadCloud,
  FilePlus,
  ClipboardPaste,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Bot,
  Briefcase,
} from 'lucide-react';
import { EMPTY_PROFILE, EMPTY_MASTER_RESUME } from '@/data/mockData';

interface MasterResumeOnboardProps {
  onCompleted?: () => void;
  title?: string;
  subtitle?: string;
  redirectNotice?: string;
}

export const MasterResumeOnboard: React.FC<MasterResumeOnboardProps> = ({
  onCompleted,
  title = 'Build or Upload Your Master Resume',
  subtitle = 'ApplyIQ requires your foundational resume to calculate real-time ATS match scores, discover personalized tech roles, and generate targeted applications.',
  redirectNotice,
}) => {
  const { updateMasterResume } = useApp();
  const [activeMode, setActiveMode] = useState<'upload' | 'blank' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Handler when PDF/DOCX finishes parsing
  const handleParsed = useCallback(
    (data: ParsedResumeData) => {
      updateMasterResume({
        name: data.name || '',
        title: data.title || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        linkedinUrl: data.linkedinUrl || '',
        githubUrl: data.githubUrl || '',
        websiteUrl: data.websiteUrl || '',
        summary: data.summary || '',
        skills: (data.skills as any) || [],
        experiences: (data.experiences as any) || [],
        education: (data.education as any) || [],
        projects: (data.projects as any) || [],
      });
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('applyiq_resume_scratch', 'true');
        }
      } catch (_) {}
      if (onCompleted) onCompleted();
    },
    [updateMasterResume, onCompleted]
  );

  // Create from Scratch: clean empty template
  const handleStartBlank = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('applyiq_resume_scratch', 'true');
      }
    } catch (_) {}
    updateMasterResume({
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      linkedinUrl: '',
      githubUrl: '',
      websiteUrl: '',
      summary: '',
      skills: [],
      experiences: [],
      education: [],
      projects: [],
    });
    if (onCompleted) onCompleted();
  };

  // Quick Paste text parsing
  const handleParsePaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim() || pasteText.length < 30) {
      setPasteError('Please paste at least a paragraph of your resume text.');
      return;
    }

    setPasteError(null);
    setIsParsingPaste(true);

    try {
      const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
      const firstLine = lines[0] || '';
      const summaryText = lines.slice(1, 4).join(' ');

      updateMasterResume({
        name: firstLine.length < 40 ? firstLine : '',
        title: '',
        summary: summaryText || pasteText.slice(0, 300),
        skills: [],
        experiences: [],
        education: [],
        projects: [],
      });

      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('applyiq_resume_scratch', 'true');
        }
      } catch (_) {}

      if (onCompleted) onCompleted();
    } catch (err: any) {
      setPasteError(err?.message || 'Could not parse pasted resume. Try uploading a PDF.');
    } finally {
      setIsParsingPaste(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero Brand Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span>Clean Slate &bull; Privacy-First Sandbox</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {subtitle}
        </p>

        {redirectNotice && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{redirectNotice}</span>
          </div>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-center gap-2 p-1.5 max-w-md mx-auto mb-8 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveMode('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'upload'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload PDF/DOCX</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('blank')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'blank'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FilePlus className="w-4 h-4" />
          <span>Create from Scratch</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('paste')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'paste'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ClipboardPaste className="w-4 h-4" />
          <span>Quick Paste</span>
        </button>
      </div>

      {/* Main Container Card */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <CardContent className="p-6 sm:p-10">
          {activeMode === 'upload' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span>Upload &amp; Auto-Parse Master Resume</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Extracts work history, education, skills, and contact URLs directly into your clean profile.
                  </p>
                </div>
                <Badge variant="info" className="text-[11px] font-bold">
                  Recommended
                </Badge>
              </div>

              {/* Upload Zone */}
              <ResumeUploadZone onParsed={handleParsed} />

              {/* Or Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Or start with an empty template
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Create from Scratch Callout */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <FilePlus className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Don&apos;t have a resume file handy?</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Initialize an empty ATS canvas and input your details section by section.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleStartBlank}
                  className="w-full sm:w-auto shrink-0 text-xs font-bold flex items-center justify-center gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Create from Scratch</span>
                </Button>
              </div>

              {/* Security Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Client-side storage first: your uploaded resume stays in this browser session until you choose to sync with Single Sign-On.
                </span>
              </div>
            </div>
          )}

          {activeMode === 'blank' && (
            <div className="text-center py-6 sm:py-10 space-y-6 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-xs">
                <FilePlus className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Create from Scratch
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Prefer entering your credentials manually? Initialize an empty, ATS-compliant master template and fill in your details section by section.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={handleStartBlank}
                className="w-full py-3 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Create from Scratch</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {activeMode === 'paste' && (
            <form onSubmit={handleParsePaste} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Paste Resume or LinkedIn Summary Text
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Copy and paste the text from your existing CV or LinkedIn profile.
                </p>
              </div>

              <Textarea
                rows={9}
                placeholder="Paste your resume content, experience bullet points, or skills list here..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="font-mono text-xs"
              />

              {pasteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pasteError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isParsingPaste || !pasteText.trim()}
                className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isParsingPaste ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Structuring into Master Schema…</span>
                  </>
                ) : (
                  <>
                    <span>Convert to Master Resume</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

