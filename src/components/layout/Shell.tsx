'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ApplicationFormModal } from '@/components/applications/ApplicationFormModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { useApp } from '@/context/AppContext';
import { trackPageView } from '@/lib/telemetry';
import { Loader2, CheckCircle2 } from 'lucide-react';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const pathname = usePathname();
  const { isMigratingGuestData, migrationSuccess } = useApp();

  // Non-blocking telemetry tracking for page navigation
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  // The /tailor page uses a full-bleed studio layout — strip Shell padding
  const isStudio = pathname === '/tailor';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          onAddNewClick={() => setIsAddModalOpen(true)}
        />

        <main
          className={
            isStudio
              ? 'flex-1 flex flex-col min-w-0 overflow-hidden'
              : 'flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto'
          }
        >
          {children}
        </main>
      </div>

      {/* Global Add Application Modal */}
      <ApplicationFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Frictionless SSO & Cloud Sync Modal */}
      <AuthModal />

      {/* Migration Progress Floating Toast */}
      {isMigratingGuestData && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-indigo-400/40 text-xs font-bold animate-in slide-in-from-bottom-5">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-200 shrink-0" />
          <span>Syncing your guest resume &amp; tailored data into your account…</span>
        </div>
      )}

      {/* Migration Success Floating Toast */}
      {migrationSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400/40 text-xs font-bold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>Guest resume and tailored applications saved to Supabase!</span>
        </div>
      )}
    </div>
  );
};
