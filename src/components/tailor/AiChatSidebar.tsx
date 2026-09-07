'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  SlidersHorizontal,
  Sparkles,
  Send,
  AlertTriangle,
  FileSearch,
  Save,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { AtsScoreCard } from './AtsScoreCard';
import { StagedDiffCard } from './StagedDiffCard';
import type { AtsMatchResult, StagedModification } from '@/types/tailor';

export interface ChangeCard {
  id: string;
  label: string;
  type: 'tailor' | 'chat' | 'edit' | 'save';
  timestamp: Date;
}

export interface AiChatSidebarProps {
  matchResult: AtsMatchResult;
  chatMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
  isChatPending: boolean;
  onSendMessage: (instruction: string) => void;
  onAddKeywordToResume: (keyword: string) => void;
  changeFeed: ChangeCard[];
  jobDescription: string;
  onJobDescriptionChange: (val: string) => void;
  targetCompany: string;
  onTargetCompanyChange: (val: string) => void;
  includeCoverLetter: boolean;
  onIncludeCoverLetterChange: (val: boolean) => void;
  onReTailor: () => void;
  isTailorPending: boolean;
  tailorError?: string | null;
  saved: boolean;
  saveError: string | null;
  onSaveAll: () => void;
  resumeTitle: string;
  onResumeTitleChange: (title: string) => void;
  addToKanban: boolean;
  onAddToKanbanChange: (add: boolean) => void;
  stagedModification?: StagedModification | null;
  onAcceptStaged?: () => void;
  onRejectStaged?: () => void;
  activeTab?: 'jobfit' | 'resume' | 'coverLetter';
  targetRole?: string;
}

const RESUME_SUGGESTIONS = [
  'Add Docker and CI/CD to experience bullets',
  'Make the summary punchier and senior-focused',
  'Emphasize cloud architecture achievements',
  'Quantify project outcomes with % metrics',
];

const COVER_LETTER_SUGGESTIONS = [
  'Emphasize cloud architecture and telemetry in paragraph 2',
  'Align paragraph 1 hook more closely with company culture',
  'Strengthen the call-to-action in the closing paragraph',
  'Make tone more confident and leadership-oriented',
];

export function AiChatSidebar({
  matchResult,
  chatMessages,
  isChatPending,
  onSendMessage,
  onAddKeywordToResume,
  changeFeed,
  jobDescription,
  onJobDescriptionChange,
  targetCompany,
  onTargetCompanyChange,
  includeCoverLetter,
  onIncludeCoverLetterChange,
  onReTailor,
  isTailorPending,
  tailorError,
  saved,
  saveError,
  onSaveAll,
  resumeTitle,
  onResumeTitleChange,
  addToKanban,
  onAddToKanbanChange,
  stagedModification,
  onAcceptStaged,
  onRejectStaged,
  activeTab = 'resume',
  targetRole = '',
}: AiChatSidebarProps) {
  const [panelTab, setPanelTab] = useState<'chat' | 'context'>('chat');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentSuggestions =
    activeTab === 'coverLetter' ? COVER_LETTER_SUGGESTIONS : RESUME_SUGGESTIONS;

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatPending, stagedModification]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || isChatPending) return;
    onSendMessage(text);
    setChatInput('');
  };

  return (
    <div className="w-80 xl:w-96 flex flex-col shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full overflow-hidden">
      {/* Tab switch */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900">
        {(['chat', 'context'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setPanelTab(tab)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer',
              panelTab === tab
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab === 'chat' ? <MessageSquare className="w-3 h-3" /> : <SlidersHorizontal className="w-3 h-3" />}
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CHAT TAB */}
      {panelTab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Active Target Document Context Badge */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Target Canvas:</span>
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide shadow-xs',
                  activeTab === 'coverLetter'
                    ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                )}
              >
                {activeTab === 'coverLetter' ? 'Cover Letter Studio' : 'Tailored Resume'}
              </span>
            </div>

            {/* Reactive ATS Scorecard */}
            <AtsScoreCard
              matchResult={matchResult}
              onAddKeyword={onAddKeywordToResume}
            />

            {/* Antigravity Staged Diff Review Card */}
            {stagedModification && (
              <StagedDiffCard
                staged={stagedModification}
                onAccept={onAcceptStaged!}
                onReject={onRejectStaged!}
              />
            )}

            {/* Saved state notice */}
            {saved && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 p-3 text-xs text-emerald-700 dark:text-emerald-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved to library!
                </p>
                <div className="flex gap-2">
                  <Link
                    href="/resume?tab=tailored"
                    className="flex items-center gap-1 font-semibold underline hover:no-underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Resumes
                  </Link>
                  <Link
                    href="/resume?tab=letters"
                    className="flex items-center gap-1 font-semibold underline hover:no-underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Letters
                  </Link>
                </div>
              </div>
            )}

            {/* Change Feed */}
            {changeFeed.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                  Change Feed
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                  {changeFeed.slice(0, 5).map((card) => (
                    <div
                      key={card.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="flex-1 leading-tight">{card.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="space-y-2 pt-1">
              {chatMessages.length === 0 && (
                <div className="text-center py-6 px-2 space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    AI Editor Assistant
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Instruct the AI to rewrite sections, add missing skills, or tune wording. Changes update the document and ATS score live.
                  </p>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={clsx(
                      'max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200/60 dark:border-slate-700'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isChatPending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1.5 items-center">
                      {[0, 150, 300].map((delay) => (
                        <div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Suggestion pills */}
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            {currentSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setChatInput(s)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-all cursor-pointer text-left"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Chat input */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {saveError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3" />
                {saveError}
              </p>
            )}
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <textarea
                id="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  activeTab === 'coverLetter'
                    ? 'Ask AI to refine cover letter (e.g. Emphasize cloud architecture in paragraph 2)...'
                    : 'Ask AI to refine resume (e.g. Add Docker and AWS to skills)...'
                }
                rows={2}
                className="flex-1 resize-none bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none leading-relaxed"
              />
              <button
                id="chat-send-btn"
                onClick={handleSend}
                disabled={!chatInput.trim() || isChatPending}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 px-0.5">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>
      )}

      {/* CONTEXT TAB */}
      {panelTab === 'context' && (
        <div className="flex flex-col flex-1 overflow-y-auto p-3 space-y-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Job Description
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <textarea
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                placeholder="Paste target job description here..."
                className="w-full resize-none bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 p-3 focus:outline-none"
                style={{ minHeight: 220 }}
              />
              <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[10px] text-slate-400">
                {jobDescription.length} characters
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="company-ctx"
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              Target Company
            </label>
            <input
              id="company-ctx"
              type="text"
              value={targetCompany}
              onChange={(e) => onTargetCompanyChange(e.target.value)}
              placeholder="e.g. Canva, Atlassian"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={includeCoverLetter}
              onChange={(e) => onIncludeCoverLetterChange(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Generate 350–450w cover letter
            </span>
          </label>

          <button
            onClick={() => {
              onReTailor();
              setPanelTab('chat');
            }}
            disabled={!jobDescription.trim() || isTailorPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white shadow-xs transition-all cursor-pointer"
          >
            {isTailorPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Tailoring…
              </>
            ) : (
              <>
                <FileSearch className="w-3.5 h-3.5" />
                Re-run AI Tailor
              </>
            )}
          </button>

          {tailorError && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {tailorError}
            </div>
          )}

          {/* Save & Track */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Save &amp; Track Snapshot
            </p>
            <input
              type="text"
              value={resumeTitle}
              onChange={(e) => onResumeTitleChange(e.target.value)}
              placeholder={`${targetCompany.trim() || 'Company'} Application`}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={addToKanban}
                onChange={(e) => onAddToKanbanChange(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Track in Kanban (Wishlist)</span>
            </label>
            <button
              onClick={onSaveAll}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Resume &amp; Cover Letter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
