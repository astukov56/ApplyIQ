'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Plus, LogIn, LogOut, User, Sparkles, Compass } from 'lucide-react';
import { Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';

interface HeaderProps {
  onMenuToggle: () => void;
  onAddNewClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, onAddNewClick }) => {
  const { profile, user, isGuestMode, signOut, openAuthModal } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = user
    ? user.user_metadata?.full_name || user.email?.split('@')[0] || profile.name
    : profile.name;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile menu toggle & brand tagline */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <p className="text-xs text-slate-400 font-medium">Job Search Intelligence</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Analysed rather than merely tracked
          </p>
        </div>
      </div>

      {/* Right: Add Job, Auth State & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={onAddNewClick}
          icon={<Plus className="w-4 h-4" />}
          className="text-xs"
        >
          Add Job
        </Button>

        <div className="h-6 w-px bg-slate-200 dark:border-slate-800 hidden sm:block" />

        {user ? (
          /* Authenticated User Menu */
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>

                <Link
                  href="/resume"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Master Resume</span>
                </Link>

                <Link
                  href="/analytics"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Analytics Hub</span>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    setShowUserMenu(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Guest / Unauthenticated Header Pill */
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuthModal({ returnUrl: typeof window !== 'undefined' ? window.location.pathname : '/resume' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </button>

            <Link
              href="/resume"
              className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800"
              title="Guest Mode Demo Sandbox"
            >
              <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs font-bold">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hidden lg:inline">
                Guest Mode
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
