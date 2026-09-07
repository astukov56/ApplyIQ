'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  Compass,
  Briefcase,
  FileText,
  BarChart3,
  Sparkles,
  X,
  RotateCcw,
  Wand2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { applications, resumes, resetToMockData } = useApp();
  const tailoredCount = resumes.filter((r) => !r.isMaster).length;

  const navItems = [
    {
      label: 'Job Ingestion',
      href: '/',
      icon: Compass,
      badge: 'Smart Import',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      label: 'Applications',
      href: '/applications',
      icon: Briefcase,
      badge: applications.length.toString(),
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      label: 'Resume Hub',
      href: '/resume',
      icon: FileText,
      badge: tailoredCount > 0 ? `${tailoredCount} Tailored` : 'Master',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      label: 'AI Tailor',
      href: '/tailor',
      icon: Wand2,
      badge: 'Dual AI',
      badgeColor: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      badge: 'AI',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo & Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={onClose}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                Apply<span className="text-indigo-400">IQ</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Job Search Intelligence
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </p>
          </div>

          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor || 'bg-slate-800 text-slate-400'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom footer & Reset Mock Data button */}
        <div className="p-4 border-t border-slate-800 space-y-3 shrink-0">
          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Application Workspace</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Truthful resume tailoring & fit evaluation. Mock data mode.
            </p>
          </div>

          <button
            onClick={() => {
              if (confirm('Reset workspace and mock demo data to initial state?')) {
                resetToMockData();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </aside>
    </>
  );
};
