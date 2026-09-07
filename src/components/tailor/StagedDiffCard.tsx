'use client';

import React from 'react';
import type { StagedModification } from '@/types/tailor';
import { Sparkles, Check, X, ArrowRight, Layers } from 'lucide-react';
import clsx from 'clsx';

export interface StagedDiffCardProps {
  staged: StagedModification;
  onAccept: () => void;
  onReject: () => void;
  isAccepting?: boolean;
}

export function StagedDiffCard({
  staged,
  onAccept,
  onReject,
  isAccepting = false,
}: StagedDiffCardProps) {
  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/90 via-slate-50/50 to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900 p-3.5 shadow-sm space-y-3 print:hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
              Staged Diff Preview
            </span>
            <span className="text-[10px] text-slate-400">Review &amp; Approve</span>
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white pt-1">
            {staged.changeDescription}
          </p>
          {staged.instruction && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
              Prompt: &ldquo;{staged.instruction}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Diff Content View */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {staged.sectionDiffs.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No direct text changes detected.</p>
        ) : (
          staged.sectionDiffs.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Layers className="w-2.5 h-2.5 text-indigo-500" />
                <span>{sec.section}</span>
                {sec.title && <span className="text-slate-400 font-normal">· {sec.title}</span>}
              </div>

              <div className="space-y-1 pl-1">
                {sec.diffs.map((item, dIdx) => (
                  <div
                    key={dIdx}
                    className={clsx(
                      'flex items-start gap-1.5 p-1.5 rounded-md text-[11px] leading-snug',
                      item.type === 'removed'
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-300 line-through'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 font-medium'
                    )}
                  >
                    <span
                      className={clsx(
                        'shrink-0 text-[10px] font-mono px-1 rounded font-bold',
                        item.type === 'removed'
                          ? 'bg-rose-500/20 text-rose-800 dark:text-rose-200'
                          : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                      )}
                    >
                      {item.type === 'removed' ? '—' : '+'}
                    </span>
                    <span className="flex-1">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onAccept}
          disabled={isAccepting}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Accept Changes</span>
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={isAccepting}
          className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 text-slate-600 dark:text-slate-400 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
}
