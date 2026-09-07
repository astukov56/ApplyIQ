'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { Building2, ChevronRight, Sparkles, ExternalLink, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/dateUtils';

interface RecentApplicationsProps {
  onAddNewClick?: () => void;
}

export const RecentApplications: React.FC<RecentApplicationsProps> = ({ onAddNewClick }) => {
  const { applications } = useApp();

  const recent = applications.slice(0, 5);

  if (recent.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            No applications recorded yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Start tracking your job search by pasting your first job description.
          </p>
          {onAddNewClick && (
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={onAddNewClick}
            >
              Add First Application
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-sm">Recent Applications</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest opportunities and their current evaluation status
            </p>
          </div>
          <Link
            href="/applications"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All ({applications.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recent.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="group block p-4 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Company & Role */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {app.jobTitle}
                    </span>
                    {app.aiAnalysis && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        {app.aiAnalysis.matchScore}% Match
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {app.companyName}
                    </span>
                    {app.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {app.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(app.applicationDate)}
                    </span>
                  </div>
                </div>

                {/* Status & CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <StatusBadge status={app.status} size="sm" />
                  <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
