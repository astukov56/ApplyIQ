'use client';

import React, { useState } from 'react';
import { AIAnalysis } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';

interface AIAnalysisPlaceholdersProps {
  analysis?: AIAnalysis;
  jobTitle: string;
  companyName: string;
}

export const AIAnalysisPlaceholders: React.FC<AIAnalysisPlaceholdersProps> = ({
  analysis,
  jobTitle,
  companyName,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCoverLetter = () => {
    if (analysis?.coverLetterDraft) {
      navigator.clipboard.writeText(analysis.coverLetterDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!analysis) {
    return (
      <Card className="border-dashed border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          AI Fit Analysis Ready to Run
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Paste the job description above to calculate Match Score, extract key requirements, identify skill gaps, and generate tailored CV pointers.
        </p>
      </Card>
    );
  }

  // Determine score color & label
  const getScoreTheme = (score: number) => {
    if (score >= 85) {
      return {
        badge: 'High Match',
        badgeVariant: 'success' as const,
        textColor: 'text-emerald-600 dark:text-emerald-400',
        strokeColor: '#10b981',
        bgTint: 'bg-emerald-50 dark:bg-emerald-950/30',
      };
    }
    if (score >= 70) {
      return {
        badge: 'Good Match',
        badgeVariant: 'info' as const,
        textColor: 'text-blue-600 dark:text-blue-400',
        strokeColor: '#3b82f6',
        bgTint: 'bg-blue-50 dark:bg-blue-950/30',
      };
    }
    return {
      badge: 'Moderate Match',
      badgeVariant: 'warning' as const,
      textColor: 'text-amber-600 dark:text-amber-400',
      strokeColor: '#f59e0b',
      bgTint: 'bg-amber-50 dark:bg-amber-950/30',
    };
  };

  const theme = getScoreTheme(analysis.matchScore);
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference - (analysis.matchScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Top Match Score & Executive Summary Card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Radial score */}
          <div className="flex items-center gap-6 md:border-r md:border-slate-700/60 md:pr-6">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke={theme.strokeColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tracking-tight text-white">
                  {analysis.matchScore}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  FIT
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Badge variant={theme.badgeVariant} size="sm" dot>
                  {theme.badge}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-200 mt-1.5">
                Role Fit Index
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated against candidate profile & projects
              </p>
            </div>
          </div>

          {/* Fit summary */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>AI Fit Evaluation</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {analysis.fitSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Skills Matrix: Matched Skills vs Skill Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched Skills */}
        <Card className="border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardHeader className="pb-3 border-b-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Matched Skills ({analysis.matchedSkills.length})</CardTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Skills identified in your candidate profile
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {analysis.matchedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                >
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Missing Skills / Skill Gaps */}
        <Card className="border-amber-200/70 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3 border-b-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Skill Gaps ({analysis.missingSkills.length})</CardTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Key requirements not explicitly listed on your CV
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {analysis.missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                >
                  <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Requirements Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Key Requirements Analysis</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Extracted role qualifications and candidate evidence alignment
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
          {analysis.keyRequirements.map((req, idx) => (
            <div key={idx} className="p-4 sm:p-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {req.requirement}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Evidence: </span>
                  {req.note}
                </p>
              </div>
              <Badge
                variant={
                  req.candidateFit === 'Strong'
                    ? 'success'
                    : req.candidateFit === 'Moderate'
                    ? 'warning'
                    : 'danger'
                }
                size="sm"
              >
                {req.candidateFit}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CV Tailoring Recommendations */}
      <Card className="border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Suggested CV Adjustments</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Actionable pointers to increase screening callback rate for this role
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="space-y-3">
            {analysis.cvRecommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-[10px] font-bold mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-snug">{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Tailored Cover Letter Draft */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Tailored Cover Letter Draft</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Custom generated from your profile experience for {companyName}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCoverLetter}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied!' : 'Copy Letter'}
          </Button>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-line leading-relaxed selection:bg-indigo-500 selection:text-white">
            {analysis.coverLetterDraft}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
