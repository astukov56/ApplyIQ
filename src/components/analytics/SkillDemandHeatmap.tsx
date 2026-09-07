'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { SkillBreakdown } from '@/types/analytics';
import { CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface SkillDemandHeatmapProps {
  skillBreakdown: SkillBreakdown;
}

export const SkillDemandHeatmap: React.FC<SkillDemandHeatmapProps> = ({ skillBreakdown }) => {
  const { topMatchedSkills, topMissingGaps } = skillBreakdown;
  const maxMatched = Math.max(1, ...topMatchedSkills.map((s) => s.frequency));

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Skills Resonance & Keyword Gaps Heatmap</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Most requested requirements across tracked & discovered tech roles
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/30">
            <Sparkles className="w-3 h-3" />
            Keyword Intelligence
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top Matched Strengths */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Your Top In-Demand Strengths</span>
            </div>

            <div className="space-y-2">
              {topMatchedSkills.map((item, idx) => {
                const widthPct = Math.max(15, Math.round((item.frequency / maxMatched) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.skill}
                      </span>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {item.frequency} roles
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Missing Gaps & Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Recurring Skill Gaps to Address</span>
              </div>
              <Link
                href="/resume"
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Edit Profile</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {topMissingGaps.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.skill}
                    </span>
                    <Badge variant="warning" size="sm">
                      Missing in {item.frequency} roles
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    <span>{item.suggestedAction}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
