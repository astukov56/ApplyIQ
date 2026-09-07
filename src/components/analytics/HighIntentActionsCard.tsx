'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  Sparkles,
  FileText,
  Download,
  Mail,
  Code2,
  ExternalLink,
  Target,
  CheckCircle2,
} from 'lucide-react';
import type { HighIntentActionCount } from '@/types/analytics';

export interface HighIntentActionsCardProps {
  actions: HighIntentActionCount[];
  isLoading?: boolean;
}

export function HighIntentActionsCard({ actions, isLoading }: HighIntentActionsCardProps) {
  const getActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'file-text':
        return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'download':
        return <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'mail':
        return <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'code':
      default:
        return <Code2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
    }
  };

  return (
    <Card className="p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            High-Intent Recruiter Conversions
          </CardTitle>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Portfolio Actions
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Explicit document downloads, tailoring explorations, and repository inspections.
        </p>
      </CardHeader>

      <CardContent className="p-0 pt-2 space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Loading interaction telemetry...
          </div>
        ) : (
          actions.map((act) => (
            <div
              key={act.eventName}
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-2xs">
                  {getActionIcon(act.iconName)}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {act.label}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {act.conversionPercent}% of unique recruiters took this action
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                  {act.count}
                </span>
                <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  CONVERTED
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
