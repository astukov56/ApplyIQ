'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  Activity,
  MapPin,
  Clock,
  Download,
  Eye,
  Sparkles,
  ExternalLink,
  Code2,
} from 'lucide-react';
import type { RecentActivityItem } from '@/types/analytics';

export interface LiveActivityStreamProps {
  activity: RecentActivityItem[];
  isLoading?: boolean;
}

export function LiveActivityStream({ activity, isLoading }: LiveActivityStreamProps) {
  const getBadgeStyle = (badgeType: RecentActivityItem['badgeType']) => {
    switch (badgeType) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'violet':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800';
      case 'amber':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'rose':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'blue':
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
  };

  const getIcon = (type: RecentActivityItem['type'], badgeType: RecentActivityItem['badgeType']) => {
    if (badgeType === 'emerald') return <Download className="w-3.5 h-3.5 text-emerald-500" />;
    if (badgeType === 'violet') return <Sparkles className="w-3.5 h-3.5 text-violet-500" />;
    if (type === 'page_view') return <Eye className="w-3.5 h-3.5 text-indigo-500" />;
    return <Activity className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <Card className="p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Live Recruiter Activity Stream
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time feed of recruiter sessions, page views, and resume downloads.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-Time Beacon</span>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Streaming recruiter events...
          </div>
        ) : activity.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {activity.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-2xs mt-0.5">
                    {getIcon(item.type, item.badgeType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getBadgeStyle(
                          item.badgeType
                        )}`}
                      >
                        {item.type === 'event' ? 'Action' : 'View'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{item.relativeTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
