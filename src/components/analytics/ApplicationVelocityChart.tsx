'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { VelocityData } from '@/types/analytics';
import { Activity, Send, Users, Calendar } from 'lucide-react';

interface ApplicationVelocityChartProps {
  velocity: VelocityData[];
}

export const ApplicationVelocityChart: React.FC<ApplicationVelocityChartProps> = ({ velocity }) => {
  const maxVelocity = Math.max(1, ...velocity.map((v) => Math.max(v.appliedCount, v.interviewCount)));

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Application Velocity & Milestone Pacing</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Weekly submission cadence vs. interview progression rate
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
              <span className="text-[11px] font-semibold">Submissions</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-600 inline-block" />
              <span className="text-[11px] font-semibold">Interviews</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Visual Timeline Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {velocity.map((item, idx) => {
            const appliedHeightPct = Math.max(12, Math.round((item.appliedCount / maxVelocity) * 100));
            const interviewHeightPct = Math.max(8, Math.round((item.interviewCount / maxVelocity) * 100));

            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span className="truncate">{item.period}</span>
                  <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
                </div>

                {/* Comparative Mini Bars */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Send className="w-2.5 h-2.5 text-blue-500" /> Applied
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {item.appliedCount}
                      </strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${appliedHeightPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 text-purple-500" /> Interviews
                      </span>
                      <strong className="text-purple-600 dark:text-purple-400">
                        {item.interviewCount}
                      </strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${interviewHeightPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pacing Guideline */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Optimal Pacing: Target <strong>4–6 high-match applications per week</strong> for sustainable follow-up and technical preparation.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
