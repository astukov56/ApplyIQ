'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { FunnelStage } from '@/types/analytics';
import {
  Bookmark,
  Send,
  Users,
  Trophy,
  XCircle,
  ArrowDown,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface ConversionFunnelChartProps {
  funnel: FunnelStage[];
}

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ funnel }) => {
  const getStageMeta = (stage: string) => {
    switch (stage) {
      case 'wishlist':
        return {
          icon: Bookmark,
          color: 'text-amber-500',
          barBg: 'bg-amber-500',
          bgLight: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
        };
      case 'applied':
        return {
          icon: Send,
          color: 'text-blue-500',
          barBg: 'bg-blue-600',
          bgLight: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
        };
      case 'interviewing':
        return {
          icon: Users,
          color: 'text-purple-500',
          barBg: 'bg-purple-600',
          bgLight: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
        };
      case 'offer':
        return {
          icon: Trophy,
          color: 'text-emerald-500',
          barBg: 'bg-emerald-500',
          bgLight: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
        };
      default:
        return {
          icon: XCircle,
          color: 'text-slate-400',
          barBg: 'bg-slate-400',
          bgLight: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800',
        };
    }
  };

  const maxCount = Math.max(1, ...funnel.map((s) => s.count));
  const mainFunnel = funnel.filter((s) => s.stage !== 'rejected');
  const rejectedStage = funnel.find((s) => s.stage === 'rejected');

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">5-Stage Pipeline Conversion Funnel</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Progression efficiency across your active Kanban stages
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/30">
            <TrendingUp className="w-3 h-3" />
            Live Funnel
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {mainFunnel.map((item, idx) => {
          const meta = getStageMeta(item.stage);
          const Icon = meta.icon;
          const widthPct = Math.max(8, Math.round((item.count / maxCount) * 100));

          return (
            <div key={item.stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${meta.bgLight}`}>
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {item.count}
                  </span>
                  {idx > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      ({item.conversionRate}% conversion)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Funnel Bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                <div
                  className={`h-full ${meta.barBg} rounded-full transition-all duration-500`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              {/* Arrow indicator between stages */}
              {idx < mainFunnel.length - 1 && (
                <div className="flex items-center justify-center py-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md">
                    <ArrowDown className="w-3 h-3 text-indigo-500" />
                    <span>{mainFunnel[idx + 1].conversionRate}% pass rate</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Rejected / Closed Stage Mini Footer */}
        {rejectedStage && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Closed / Concluded:</span>
              <strong className="text-slate-700 dark:text-slate-300">
                {rejectedStage.count} roles
              </strong>
            </div>
            <span className="text-[10px] text-slate-400">
              Benchmark rejection: ~60-70%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
