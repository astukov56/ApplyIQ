'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui';
import { Briefcase, FileCheck, Users, Trophy, BookmarkCheck, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export const MetricCards: React.FC = () => {
  const { applications } = useApp();

  const total = applications.length;
  const saved = applications.filter((a) => a.status === 'Saved').length;
  const applied = applications.filter((a) => a.status === 'Applied').length;
  const assessment = applications.filter((a) => a.status === 'Assessment').length;
  const interview = applications.filter((a) => a.status === 'Interview').length;
  const offer = applications.filter((a) => a.status === 'Offer').length;

  const activeApps = total - saved;
  const interviewRate = activeApps > 0 ? Math.round(((interview + offer) / activeApps) * 100) : 0;

  const stats = [
    {
      title: 'Total Applications',
      value: total,
      label: 'All tracked roles',
      icon: <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      border: 'border-indigo-100 dark:border-indigo-900/30',
      href: '/applications',
    },
    {
      title: 'In Assessment',
      value: assessment,
      label: 'Online tests / challenges',
      icon: <FileCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border-purple-100 dark:border-purple-900/30',
      href: '/applications?status=Assessment',
    },
    {
      title: 'In Interview',
      value: interview,
      label: 'Active interview rounds',
      icon: <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-100 dark:border-amber-900/30',
      href: '/applications?status=Interview',
    },
    {
      title: 'Offers',
      value: offer,
      label: 'Job offers received',
      icon: <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      href: '/applications?status=Offer',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Link key={i} href={stat.href} className="group">
          <Card
            hoverEffect
            className={`transition-all h-full border ${stat.border}`}
          >
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl ${stat.bg} transition-transform group-hover:scale-110`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {stat.value === 1 ? 'role' : 'roles'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{stat.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
