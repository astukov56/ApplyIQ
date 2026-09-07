'use client';

import React from 'react';
import { DiscoveredJob } from '@/types';
import { Modal, Button } from '@/components/ui';
import {
  Sparkles,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  Wand2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface JobDetailModalProps {
  job: DiscoveredJob | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleSave: (jobId: string) => void;
  onToggleApply: (jobId: string) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onToggleSave,
  onToggleApply,
}) => {
  const router = useRouter();
  if (!job) return null;

  const company = job.company || job.companyName || 'Hiring Company';
  const title = job.title || job.jobTitle || 'Tech Opening';
  const location = job.location || 'Sydney, NSW';
  const description = job.rawDescription || job.description || job.jobDescription || '';
  const url = job.jobUrl || job.sourceUrl || '#';
  const daysAgo = job.daysAgo ?? 2;

  const handleOpenTailor = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('applyiq_tailor_job', JSON.stringify(job));
      }
    } catch (_) {}
    onClose();
    router.push(`/tailor?jobId=${job.id}&company=${encodeURIComponent(company)}&role=${encodeURIComponent(title)}`);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`${company} • ${location}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 rounded-md text-slate-800 dark:text-slate-200">
                {company}
              </span>

              {/* 14-Day Freshness Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                <Clock className="w-3 h-3 text-emerald-500" />
                <span>
                  {daysAgo === 0
                    ? 'Posted Today (<14d)'
                    : daysAgo === 1
                    ? 'Posted Yesterday (<14d)'
                    : `Posted ${daysAgo}d ago (<14d)`}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {location}
              </span>
              <span className="font-medium">{job.jobType || job.employmentType || 'Full-time'}</span>
              {job.salary && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salary}
                </span>
              )}
            </div>
          </div>

          {/* Match Score Gauge */}
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-lg font-black">{job.matchScore}%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Match
              </span>
            </div>

            {job.matchBreakdown && (
              <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-semibold">
                <span>Tech {job.matchBreakdown.technical}/40</span>
                <span>• Role {job.matchBreakdown.roleRelevance}/30</span>
                <span>• Exp {job.matchBreakdown.experienceFit}/30</span>
              </div>
            )}
          </div>
        </div>

        {/* Fit Analysis Box */}
        {job.fitSummary && (
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>ApplyIQ Candidate Fit Analysis</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {job.fitSummary}
            </p>
          </div>
        )}

        {/* Matched Skills & Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Matching Skills from Your Master Resume
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(job.skills || job.matchedSkills || []).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Target Skill Gaps to Address
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(job.missingSkills || []).length > 0 ? (
                (job.missingSkills || []).map((gap) => (
                  <span
                    key={gap}
                    className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                  >
                    {gap}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  No major technical gaps detected for this role.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full Job Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Original Advertisement
          </h4>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
            {description}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenTailor}
              icon={<Wand2 className="w-4 h-4" />}
            >
              Tailor Resume
            </Button>

            <Link href={`/cover-letter/${job.id}`} onClick={onClose}>
              <Button
                variant="secondary"
                size="sm"
                icon={<FileText className="w-4 h-4" />}
              >
                Generate Cover Letter
              </Button>
            </Link>

            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{getApplyLabel()}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleSave(job.id)}
            >
              {job.isSaved ? 'Saved to Wishlist' : 'Save Job'}
            </Button>
            <Button
              variant={job.isApplied ? 'success' : 'primary'}
              size="sm"
              onClick={() => onToggleApply(job.id)}
            >
              {job.isApplied ? 'Applied ✓' : 'Mark as Applied'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
