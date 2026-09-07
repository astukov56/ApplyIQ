'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  Compass,
  FileText,
  Mail,
  Globe2,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import type { ReferrerShare, TelemetryReferrerSource } from '@/types/analytics';

function LinkedinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export interface ReferralBreakdownCardProps {
  referrers: ReferrerShare[];
  isLoading?: boolean;
}

export function ReferralBreakdownCard({ referrers, isLoading }: ReferralBreakdownCardProps) {
  const getSourceIcon = (source: TelemetryReferrerSource) => {
    switch (source) {
      case 'resume':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'linkedin':
        return <LinkedinIcon className="w-4 h-4 text-blue-500" />;
      case 'github':
        return <GithubIcon className="w-4 h-4 text-slate-800 dark:text-slate-200" />;
      case 'email':
        return <Mail className="w-4 h-4 text-amber-500" />;
      case 'direct':
      default:
        return <Globe2 className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getSourceBadgeClass = (source: TelemetryReferrerSource) => {
    switch (source) {
      case 'resume':
        return 'bg-emerald-500';
      case 'linkedin':
        return 'bg-blue-500';
      case 'github':
        return 'bg-slate-700 dark:bg-slate-300';
      case 'email':
        return 'bg-amber-500';
      case 'direct':
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <Card className="p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Recruiter Referral Breakdown
          </CardTitle>
          <span className="text-xs font-bold text-slate-400">Inbound Channels</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Attribution tracking showing which platforms drove recruiter visits.
        </p>
      </CardHeader>

      <CardContent className="p-0 pt-2 space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Loading referral telemetry...
          </div>
        ) : (
          referrers.map((ref) => (
            <div key={ref.source} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    {getSourceIcon(ref.source)}
                  </div>
                  <span>{ref.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {ref.count} visit{ref.count !== 1 ? 's' : ''}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {ref.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getSourceBadgeClass(
                    ref.source
                  )}`}
                  style={{ width: `${Math.max(4, ref.percentage)}%` }}
                />
              </div>
            </div>
          ))
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Source parsed from HTTP Referrer &amp; UTM tags</span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">100% Attributed</span>
        </div>
      </CardContent>
    </Card>
  );
}
