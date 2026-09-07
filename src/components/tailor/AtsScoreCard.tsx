'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import clsx from 'clsx';
import type { AtsMatchResult } from '@/types/tailor';

export interface AtsScoreCardProps {
  matchResult: AtsMatchResult;
  /** Optional handler to immediately inject a missing keyword into the resume */
  onAddKeyword?: (keyword: string) => void;
  className?: string;
}

export function AtsScoreCard({
  matchResult,
  onAddKeyword,
  className,
}: AtsScoreCardProps) {
  const { atsScore, matchedKeywords, missingKeywords, matchBreakdown } = matchResult;

  const [scorePulse, setScorePulse] = useState(false);
  const [recentlyMatched, setRecentlyMatched] = useState<string | null>(null);

  // Trigger pulse animation when ATS score changes
  useEffect(() => {
    setScorePulse(true);
    const timer = setTimeout(() => setScorePulse(false), 800);
    return () => clearTimeout(timer);
  }, [atsScore]);

  // Color dynamics based on score tiers
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-indigo-600 dark:text-indigo-400';
    if (score >= 55) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 85) return '#10b981'; // emerald-500
    if (score >= 70) return '#6366f1'; // indigo-500
    if (score >= 55) return '#f59e0b'; // amber-500
    return '#f43f5e'; // rose-500
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Top Tier Fit', icon: Flame, color: 'emerald' };
    if (score >= 70) return { label: 'High Alignment', icon: ShieldCheck, color: 'indigo' };
    if (score >= 55) return { label: 'Moderate Fit', icon: Sparkles, color: 'amber' };
    return { label: 'Needs Keywords', icon: ArrowUpRight, color: 'rose' };
  };

  const badge = getScoreBadge(atsScore);
  const BadgeIcon = badge.icon;

  // SVG Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (atsScore / 100) * circumference;

  const handleQuickAdd = (keyword: string) => {
    if (onAddKeyword) {
      setRecentlyMatched(keyword);
      onAddKeyword(keyword);
      setTimeout(() => setRecentlyMatched(null), 1200);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 space-y-4 shadow-sm transition-all',
        scorePulse && 'ring-2 ring-indigo-500/40',
        className
      )}
    >
      {/* Top: Score Gauge & Tier Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Radial Progress Gauge */}
          <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="7"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={getScoreRingColor(atsScore)}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={clsx('text-xl font-extrabold tracking-tight', getScoreColor(atsScore))}>
                {atsScore}
              </span>
              <span className="text-[9px] font-bold uppercase text-slate-400 -mt-0.5">ATS</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1',
                  badge.color === 'emerald' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                  badge.color === 'indigo' && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
                  badge.color === 'amber' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                  badge.color === 'rose' && 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                )}
              >
                <BadgeIcon className="w-3 h-3" />
                {badge.label}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
              Reactive ATS Alignment
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live scoring on document changes
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Metrics */}
      {matchBreakdown && (
        <div className="grid grid-cols-3 gap-2 pt-1 pb-1 text-center">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold uppercase text-slate-400">Tech Fit</p>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
              {matchBreakdown.technical}/45
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold uppercase text-slate-400">Role Title</p>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
              {matchBreakdown.roleRelevance}/30
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold uppercase text-slate-400">Experience</p>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
              {matchBreakdown.experienceFit}/25
            </p>
          </div>
        </div>
      )}

      {/* Matched Keywords (Green Badges) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Matched Keywords ({matchedKeywords.length})
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          {matchedKeywords.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">No matching keywords yet</span>
          ) : (
            matchedKeywords.map((kw) => (
              <span
                key={kw}
                className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all',
                  recentlyMatched === kw
                    ? 'bg-emerald-200 text-emerald-950 border-emerald-400 scale-105 shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                )}
              >
                <span>✓</span>
                <span>{kw}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Missing Keywords (Red Pills with Quick-Add action) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Missing From Resume ({missingKeywords.length})
          </span>
          {onAddKeyword && missingKeywords.length > 0 && (
            <span className="text-[10px] text-slate-400">Click to insert</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          {missingKeywords.length === 0 ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ All high-priority job keywords are present!
            </span>
          ) : (
            missingKeywords.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => handleQuickAdd(kw)}
                title={onAddKeyword ? `Click to add "${kw}" to resume skills` : undefined}
                className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                  'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border-rose-200/60 dark:border-rose-800/40 active:scale-95'
                )}
              >
                <Plus className="w-3 h-3 text-rose-500" />
                <span>{kw}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
