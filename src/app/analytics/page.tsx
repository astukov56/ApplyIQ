'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileText,
  ExternalLink,
  Code2,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { TrafficTelemetrySummary, TimeRangeFilter } from '@/types/analytics';
import { TrafficKpiCards } from '@/components/analytics/TrafficKpiCards';
import { TrafficTrendChart } from '@/components/analytics/TrafficTrendChart';
import { ReferralBreakdownCard } from '@/components/analytics/ReferralBreakdownCard';
import { HighIntentActionsCard } from '@/components/analytics/HighIntentActionsCard';
import { LiveActivityStream } from '@/components/analytics/LiveActivityStream';
import { RecruiterEngagementCard } from '@/components/analytics/RecruiterEngagementCard';
import { useApp } from '@/context/AppContext';

export default function AnalyticsPage() {
  const { profile } = useApp();
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('7d');
  const [summary, setSummary] = useState<TrafficTelemetrySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchTelemetry = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`/api/telemetry?range=${timeRange}`);
      if (res.ok) {
        const data: TrafficTelemetrySummary = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [timeRange]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Recruiter Engagement &amp; Platform Telemetry
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time inbound recruiter visits, referral source attribution, resume asset downloads, and candidate interaction telemetry.
          </p>
        </div>

        {/* Controls: Time Range Tabs + Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shadow-2xs">
            {[
              { id: '7d' as TimeRangeFilter, label: 'Last 7 Days' },
              { id: '30d' as TimeRangeFilter, label: 'Last 30 Days' },
              { id: 'all' as TimeRangeFilter, label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchTelemetry(true)}
            disabled={isRefreshing}
            title="Refresh telemetry stream"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Recruiter Session Banner */}
      <RecruiterEngagementCard />

      {/* 4 Top-line KPI Cards */}
      {summary && (
        <TrafficKpiCards kpis={summary.kpis} isLoading={isLoading} />
      )}

      {/* Middle Row: Traffic Trend Velocity + Referral Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          {summary && (
            <TrafficTrendChart data={summary.dailyTrend} isLoading={isLoading} />
          )}
        </div>
        <div className="lg:col-span-5">
          {summary && (
            <ReferralBreakdownCard referrers={summary.referrers} isLoading={isLoading} />
          )}
        </div>
      </div>

      {/* Bottom Row: High-Intent Actions + Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          {summary && (
            <HighIntentActionsCard actions={summary.highIntentActions} isLoading={isLoading} />
          )}
        </div>
        <div className="lg:col-span-6">
          {summary && (
            <LiveActivityStream activity={summary.recentActivity} isLoading={isLoading} />
          )}
        </div>
      </div>

      {/* Portfolio Callout & Verification Footer */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Candidate Showcase Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile.name
                ? `${profile.name} • ${profile.title || 'Candidate'} • ${profile.location || 'Profile Showcase'}`
                : 'Verified Candidate Profile • Software & Systems Engineering'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/resume"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Master Resume</span>
          </Link>
          <Link
            href="/tailor"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Tailor Studio</span>
          </Link>
          {profile.githubUrl ? (
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>GitHub Profile</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          ) : (
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
