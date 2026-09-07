'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { toKanbanStatus } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const PipelineVisual: React.FC = () => {
  const { applications } = useApp();

  const stages = [
    {
      name: 'Wishlist',
      count: applications.filter((a) => toKanbanStatus(a.status) === 'wishlist').length,
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    },
    {
      name: 'Applied',
      count: applications.filter((a) => toKanbanStatus(a.status) === 'applied').length,
      color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
    },
    {
      name: 'Interviewing',
      count: applications.filter((a) => toKanbanStatus(a.status) === 'interviewing').length,
      color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    },
    {
      name: 'Offer',
      count: applications.filter((a) => toKanbanStatus(a.status) === 'offer').length,
      color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
    },
    {
      name: 'Rejected',
      count: applications.filter((a) => toKanbanStatus(a.status) === 'rejected').length,
      color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-sm">Application Pipeline</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live progression of your active job search stages
            </p>
          </div>
          <Link
            href="/applications"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Open Kanban Tracker</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pipeline horizontal tracker */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          {stages.map((stage, idx) => (
            <Link
              key={stage.name}
              href="/applications"
              className="group block"
            >
              <div
                className={`relative rounded-xl p-3.5 border transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer ${stage.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                    {stage.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">0{idx + 1}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight">
                    {stage.count}
                  </span>
                  <span className="text-[10px] opacity-75 font-medium">
                    {stage.count === 1 ? 'role' : 'roles'}
                  </span>
                </div>

                {/* Arrow connector on large screens */}
                {idx < stages.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400">
                    <div className="h-5 w-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
