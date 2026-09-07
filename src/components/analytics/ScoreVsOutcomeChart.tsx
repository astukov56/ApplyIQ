'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { ScoreCorrelation } from '@/types/analytics';
import { Sparkles, CheckCircle2, TrendingUp, Award, Zap } from 'lucide-react';

interface ScoreVsOutcomeChartProps {
  scoreCorrelation: ScoreCorrelation[];
}

export const ScoreVsOutcomeChart: React.FC<ScoreVsOutcomeChartProps> = ({ scoreCorrelation }) => {
  const getBracketTheme = (bracket: string) => {
    switch (bracket) {
      case '90-100%':
        return {
          barColor: 'bg-emerald-500',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/60',
          label: 'Exceptional ATS Match',
        };
      case '80-89%':
        return {
          barColor: 'bg-indigo-500',
          textColor: 'text-indigo-600 dark:text-indigo-400',
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300/60',
          label: 'Strong Technical Fit',
        };
      case '70-79%':
        return {
          barColor: 'bg-blue-500',
          textColor: 'text-blue-600 dark:text-blue-400',
          badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300/60',
          label: 'Moderate Alignment',
        };
      default:
        return {
          barColor: 'bg-amber-500',
          textColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300/60',
          label: 'Baseline / Stretch',
        };
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">ATS Match Score vs. Interview Call-Backs</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Progression rate by evaluated candidate match score
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/30">
            <Sparkles className="w-3 h-3" />
            Correlation
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Highlight Callout Box */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-transparent dark:from-indigo-950/50 dark:via-purple-950/20 dark:to-transparent border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              AI Tailoring Impact: 2.4× Interview Lift
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Applications tailored to achieve <strong className="text-indigo-600 dark:text-indigo-400">&gt;85% ATS match scores</strong> convert to technical interviews at more than double the rate of untailored baseline submissions.
            </p>
          </div>
        </div>

        {/* Score Brackets List */}
        <div className="space-y-3 pt-1">
          {scoreCorrelation.map((item) => {
            const theme = getBracketTheme(item.scoreBracket);
            return (
              <div key={item.scoreBracket} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {item.scoreBracket}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {theme.label} ({item.appliedCount} tracked)
                    </span>
                  </div>

                  <span className={`font-bold ${theme.textColor}`}>
                    {item.conversionRate}% Interview Rate
                  </span>
                </div>

                {/* Comparative Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${theme.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(6, item.conversionRate)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
