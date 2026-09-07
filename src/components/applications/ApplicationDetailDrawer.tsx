'use client';

import React, { useState, useEffect } from 'react';
import { ApplicationCard, KanbanStatus, KANBAN_COLUMNS, fromKanbanStatus } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import {
  X,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Sparkles,
  FileText,
  Mail,
  Edit2,
  Trash2,
  Wand2,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Save,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ApplicationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  card: ApplicationCard | null;
  onEdit: (card: ApplicationCard) => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  isOpen,
  onClose,
  card,
  onEdit,
}) => {
  const {
    updateApplication,
    deleteApplication,
    moveApplication,
    resumes,
    coverLetters,
  } = useApp();

  const [notes, setNotes] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string>('');
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    if (card) {
      setNotes(card.notes || '');
      setSelectedResumeId(card.tailoredResumeId || '');
      setSelectedCoverLetterId(card.coverLetterId || '');
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const currentColumn = KANBAN_COLUMNS.find((col) => col.id === card.status) || KANBAN_COLUMNS[1];

  const linkedResume = selectedResumeId
    ? resumes.find((r) => r.id === selectedResumeId)
    : undefined;

  const linkedCoverLetter = selectedCoverLetterId
    ? coverLetters.find((c) => c.id === selectedCoverLetterId || c.jobId === card.id)
    : undefined;

  const handleSaveNotesAndLinks = () => {
    updateApplication(card.id, {
      notes,
      tailoredResumeId: selectedResumeId || undefined,
      coverLetterId: selectedCoverLetterId || undefined,
    });
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleAddTimestampNote = () => {
    const stamp = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const prefix = notes.trim() ? `${notes}\n\n` : '';
    setNotes(`${prefix}[${stamp}] `);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/80">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentColumn.dotColor}`} />
              <select
                value={card.status}
                onChange={(e) => moveApplication(card.id, e.target.value as KanbanStatus)}
                className="text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>

              {card.aiAnalysis?.matchScore && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {card.aiAnalysis.matchScore}% Match
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {card.jobTitle}
            </h2>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">{card.companyName}</span>
              {card.jobUrl && (
                <a
                  href={card.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-xs"
                >
                  <span>Posting</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(card)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit details"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Applied Date
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {formatDate(card.appliedDate)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Location
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{card.location || 'Not set'}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Work Type
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-400" />
                {card.workType || 'Hybrid'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Salary
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                <DollarSign className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{card.salary || 'Undisclosed'}</span>
              </span>
            </div>
          </div>

          {/* Section: Linked Resume & Cover Letter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Application Assets
              </h3>
              <Link
                href="/tailor"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Open AI Tailor Studio</span>
              </Link>
            </div>

            {/* Resume Selector */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Linked Tailored Resume</span>
                </label>
                {linkedResume && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Updated {formatDate(linkedResume.updatedAt)}
                  </span>
                )}
              </div>

              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No linked resume (Select from saved versions)</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.isMaster ? '(Master)' : '(Tailored)'}
                  </option>
                ))}
              </select>

              {linkedResume && (
                <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs flex items-center justify-between">
                  <div className="truncate mr-2">
                    <p className="font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                      {linkedResume.title}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">
                      {linkedResume.summary.slice(0, 70)}...
                    </p>
                  </div>
                  <Link
                    href="/resume"
                    className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    View
                  </Link>
                </div>
              )}
            </div>

            {/* Cover Letter Selector */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-violet-500" />
                  <span>Linked Cover Letter</span>
                </label>
                {linkedCoverLetter && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDate(linkedCoverLetter.dateGenerated)}
                  </span>
                )}
              </div>

              <select
                value={selectedCoverLetterId}
                onChange={(e) => setSelectedCoverLetterId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No linked cover letter (Select draft)</option>
                {coverLetters.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.targetCompany} - {cl.targetPosition}
                  </option>
                ))}
              </select>

              {linkedCoverLetter && (
                <div className="p-2.5 rounded-lg bg-violet-50/50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-xs">
                  <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
                    {linkedCoverLetter.bodyText}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Interview Logs & Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Interview Logs & Private Notes
              </h3>
              <button
                type="button"
                onClick={handleAddTimestampNote}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Clock className="w-3 h-3" />
                <span>+ Timestamp Note</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record recruiter questions, technical rounds, follow-up dates, or offer conditions..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Section: AI Fit Breakdown (if available) */}
          {card.aiAnalysis && (
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI Fit Assessment
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {card.aiAnalysis.matchScore}% Match
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {card.aiAnalysis.fitSummary}
              </p>

              {card.aiAnalysis.matchedSkills?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Matched Strengths
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {card.aiAnalysis.matchedSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {card.aiAnalysis.missingSkills?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Skill Gaps / Areas to Highlight
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {card.aiAnalysis.missingSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Page Link */}
          <div className="pt-2">
            <Link
              href={`/applications/${card.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Open dedicated full-screen Application & AI Evaluation page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete application for ${card.jobTitle} at ${card.companyName}?`)) {
                deleteApplication(card.id);
                onClose();
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            {isSavedToast && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved!
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveNotesAndLinks}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
