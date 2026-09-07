'use client';

import React, { useState } from 'react';
import { DiscoveredJob } from '@/types';
import { Card, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Wand2,
  ExternalLink,
  Plus,
  Clock,
  Briefcase,
  Zap,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface JobCardProps {
  job: DiscoveredJob;
  onViewJob: (job: DiscoveredJob) => void;
  onToggleSave?: (jobId: string) => void;
  onToggleApply?: (jobId: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onViewJob,
  onToggleSave,
  onToggleApply,
}) => {
  const router = useRouter();
  const { applications, addApplication } = useApp();
  const [justTracked, setJustTracked] = useState(false);

  const company = job.company || job.companyName || 'Hiring Company';
  const title = job.title || job.jobTitle || 'Tech Opening';
  const location = job.location || 'Sydney, NSW';
  const description = job.rawDescription || job.description || job.jobDescription || '';
  const url = job.jobUrl || job.sourceUrl || '#';
  const daysAgo = job.daysAgo ?? 2;

  const handleOpenTailor = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('applyiq_tailor_job', JSON.stringify(job));
      }
    } catch (_) {}
    router.push(`/tailor?jobId=${job.id}&company=${encodeURIComponent(company)}&role=${encodeURIComponent(title)}`);
  };

  // Check if already tracked in Kanban tracker
  const existingApp = applications.find(
    (a) =>
      a.companyName.toLowerCase() === company.toLowerCase() &&
      a.jobTitle.toLowerCase() === title.toLowerCase()
  );

  const isTracked = Boolean(existingApp) || justTracked;

  const handleTrackInWishlist = () => {
    if (isTracked) return;
    addApplication({
      companyName: company,
      jobTitle: title,
      jobDescription: description,
      jobUrl: url,
      location,
      salary: job.salary,
      status: 'wishlist',
      notes: `Discovered Sydney role (Match: ${job.matchScore}%). Evaluated against Master Resume. Posted ${daysAgo}d ago.`,
      applicationDate: new Date().toISOString().split('T')[0],
      aiAnalysis: {
        matchScore: job.matchScore,
        fitSummary: job.fitSummary,
        matchedSkills: job.skills || job.matchedSkills || [],
        missingSkills: job.missingSkills || [],
        keyRequirements: (job.requirements || job.keyRequirements || []).map((r) => ({
          requirement: r,
          candidateFit: 'Strong',
          note: 'From Sydney recommendation engine',
        })),
        cvRecommendations: [],
        coverLetterDraft: '',
      },
    });
    setJustTracked(true);
    if (onToggleSave) onToggleSave(job.id);
  };

  // Score color helper
  const getScoreTheme = (score: number) => {
    if (score >= 85) {
      return {
        border: 'border-emerald-500/40 dark:border-emerald-700/50',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
        badge: 'bg-emerald-500 text-white',
      };
    }
    if (score >= 70) {
      return {
        border: 'border-blue-500/40 dark:border-blue-700/50',
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
        badge: 'bg-blue-500 text-white',
      };
    }
    return {
      border: 'border-amber-500/40 dark:border-amber-700/50',
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-500 text-white',
    };
  };

  const theme = getScoreTheme(job.matchScore);
  const tailorHref = `/tailor?company=${encodeURIComponent(company)}&title=${encodeURIComponent(title)}&jobDescription=${encodeURIComponent(description)}`;

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'software':
        return 'Software & Web';
      case 'ai_ml':
        return 'AI & Machine Learning';
      case 'data_analytics':
        return 'Data & Analytics';
      case 'cloud_devops':
        return 'Cloud & DevOps';
      case 'cyber_it':
        return 'Cyber Security & IT';
      case 'graduate_programs':
        return 'Graduate Tech';
      default:
        return 'Tech & Engineering';
    }
  };

  const getApplyLabel = () => {
    if (job.applyType === 'direct_ats' || job.isDirectApplyLink) {
      return 'Apply on Company Portal ↗';
    }
    if (job.applyType === 'seek_verified' || job.source === 'SEEK') {
      return 'View on SEEK ↗';
    }
    return 'Open Verified Job Ad ↗';
  };

  return (
    <Card hoverEffect className="transition-all duration-200 p-5 sm:p-6">
      <div className="space-y-4">
        {/* Top Meta Header Row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                {company}
              </span>

              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                {getCategoryLabel(job.category)}
              </span>

              {/* 14-Day Freshness Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  daysAgo <= 3
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {daysAgo <= 3 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {daysAgo === 0
                    ? 'Posted Today (<14d)'
                    : daysAgo === 1
                    ? 'Posted Yesterday (<14d)'
                    : `Posted ${daysAgo}d ago (<14d)`}
                </span>
              </span>
            </div>

            <h3
              onClick={() => onViewJob(job)}
              className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-snug"
            >
              {title}
            </h3>

            {/* Location & Tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {location}
              </span>

              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {job.jobType || job.employmentType || 'Full-time'}
              </span>

              {job.salary && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salary}
                </span>
              )}
            </div>
          </div>

          {/* Match Score Indicator & Gauge */}
          <div className="flex flex-col items-end shrink-0">
            <div
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${theme.bg} ${theme.border}`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-base sm:text-lg font-black tracking-tight">
                {job.matchScore}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Match
              </span>
            </div>

            {/* Match Breakdown Pills */}
            {job.matchBreakdown && (
              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-slate-400 font-semibold">
                <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  Tech {job.matchBreakdown.technical}/40
                </span>
                <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  Role {job.matchBreakdown.roleRelevance}/30
                </span>
                <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  Exp {job.matchBreakdown.experienceFit}/30
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fit Summary Preview */}
        {job.fitSummary && (
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
              Fit Analysis:{' '}
            </strong>
            {job.fitSummary}
          </p>
        )}

        {/* Skills Matched & Missing Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {/* Matched skills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Matched:
            </span>
            {(job.skills || job.matchedSkills || []).slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/30"
              >
                {skill}
              </span>
            ))}
            {(job.skills || job.matchedSkills || []).length > 4 && (
              <span className="text-[10px] text-slate-400 font-medium">
                +{(job.skills || job.matchedSkills || []).length - 4} more
              </span>
            )}
          </div>

          {/* Skill gaps */}
          {(job.missingSkills || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Gaps:
              </span>
              {(job.missingSkills || []).slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/30"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewJob(job)}
              className="text-xs"
            >
              View Details
            </Button>

            {/* 1-Click Tailor Resume */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenTailor}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
              icon={<Wand2 className="w-3.5 h-3.5" />}
            >
              Tailor Resume
            </Button>

            {/* Direct External Verified Job Link */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold shadow-2xs"
                title={`Open verified live listing for ${company} (${title})`}
              >
                <span>{getApplyLabel()}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Click Track in Wishlist */}
            <button
              type="button"
              onClick={handleTrackInWishlist}
              disabled={isTracked}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isTracked
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 cursor-default'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isTracked ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>In Wishlist</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Track in Wishlist</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
