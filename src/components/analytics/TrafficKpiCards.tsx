'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui';
import {
  Users,
  Eye,
  Download,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { TrafficKpis } from '@/types/analytics';

export interface TrafficKpiCardsProps {
  kpis: TrafficKpis;
  isLoading?: boolean;
}

export function TrafficKpiCards({ kpis, isLoading }: TrafficKpiCardsProps) {
  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const cards = [
    {
      title: 'Total Visits',
      value: kpis.totalVisits.toString(),
      subtext: `${kpis.totalPageViews} total page impressions`,
      trend: '+18% this period',
      icon: Eye,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/50',
      pillBg: 'bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    },
    {
      title: 'Unique Recruiters',
      value: kpis.uniqueRecruiters.toString(),
      subtext: 'Distinct verified candidate sessions',
      trend: '+12% new hiring managers',
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/70 dark:border-violet-800/50',
      pillBg: 'bg-violet-100/80 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    },
    {
      title: 'Resume Downloads',
      value: kpis.resumeDownloads.toString(),
      subtext: 'High-intent PDF & DOCX exports',
      trend: `${Math.round((kpis.resumeDownloads / Math.max(1, kpis.uniqueRecruiters)) * 100)}% recruiter action rate`,
      icon: Download,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/50',
      pillBg: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    },
    {
      title: 'Avg Time On Site',
      value: formatSeconds(kpis.avgTimeOnSiteSeconds),
      subtext: `Active portfolio exploration`,
      trend: `${kpis.bounceRatePercent}% low exit rate`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/50',
      pillBg: 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.title}
            className={`p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${c.bg}`}
          >
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl bg-white dark:bg-slate-800/90 shadow-2xs ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isLoading ? '...' : c.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.subtext}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${c.pillBg}`}>
                  <TrendingUp className="w-3 h-3" />
                  {c.trend}
                </span>
                <span className="text-slate-400 text-[10px] font-medium">Verified RUM</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
