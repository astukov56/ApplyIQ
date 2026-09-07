'use client';

import React, { useState } from 'react';
import { ApplicationCard, KanbanStatus, KANBAN_COLUMNS } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatDate, formatRelativeDate } from '@/lib/dateUtils';
import {
  Building2,
  MapPin,
  Sparkles,
  ExternalLink,
  FileText,
  Mail,
  MoreVertical,
  Edit2,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface KanbanCardProps {
  card: ApplicationCard;
  onOpenDetails: (card: ApplicationCard) => void;
  onEdit: (card: ApplicationCard) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, card: ApplicationCard) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  onOpenDetails,
  onEdit,
  isDragging,
  onDragStart,
  onDragEnd,
}) => {
  const { deleteApplication, moveApplication, resumes, coverLetters } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  // Linked resume and cover letter details
  const linkedResume = card.tailoredResumeId
    ? resumes.find((r) => r.id === card.tailoredResumeId)
    : undefined;

  const linkedCoverLetter = card.coverLetterId
    ? coverLetters.find((c) => c.id === card.coverLetterId || c.jobId === card.id)
    : undefined;

  // Calculate days since applied
  const getDaysSinceApplied = () => {
    if (!card.appliedDate) return null;
    const applied = new Date(card.appliedDate);
    if (isNaN(applied.getTime())) return null;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - applied.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  };

  const daysAgo = getDaysSinceApplied();

  // Column index navigation for quick keyboard/click move
  const currentColumnIdx = KANBAN_COLUMNS.findIndex((col) => col.id === card.status);
  const nextColumn = currentColumnIdx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[currentColumnIdx + 1] : null;
  const prevColumn = currentColumnIdx > 0 ? KANBAN_COLUMNS[currentColumnIdx - 1] : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e, card);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDetails(card)}
      className={`group relative rounded-xl border bg-white dark:bg-slate-900/90 p-3.5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-40 scale-95 border-dashed border-indigo-400 dark:border-indigo-600'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Top Header: Company + Quick Menu */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
            <Building2 className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
            {card.companyName}
          </span>
        </div>

        {/* Quick Menu */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            title="Card actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 z-40 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenDetails(card);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  View Details & AI Fit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(card);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  Edit Application
                </button>

                {card.jobUrl && (
                  <a
                    href={card.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left text-indigo-600 dark:text-indigo-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Job Posting
                  </a>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Move Stage
                </div>
                {KANBAN_COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    disabled={col.id === card.status}
                    onClick={() => {
                      moveApplication(card.id, col.id);
                      setShowMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1 text-left ${
                      col.id === card.status
                        ? 'opacity-40 cursor-not-allowed font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{col.title}</span>
                    {col.id === card.status && <span className="text-[10px]">Current</span>}
                  </button>
                ))}

                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm(`Delete application for ${card.jobTitle} at ${card.companyName}?`)) {
                      deleteApplication(card.id);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Card
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Role Title */}
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {card.jobTitle}
      </h4>

      {/* Meta Pills (Location, Work Type, Salary) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {card.location && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 max-w-[130px] truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{card.location}</span>
          </span>
        )}

        {card.salary && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30">
            <DollarSign className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{card.salary}</span>
          </span>
        )}
      </div>

      {/* Linked Assets (Tailored Resume & Cover Letter) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {linkedResume ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(card);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors cursor-pointer"
            title={`Linked Resume: ${linkedResume.title}`}
          >
            <FileText className="w-2.5 h-2.5 text-indigo-500" />
            <span>Tailored CV</span>
          </span>
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(card);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            title="Attach a tailored resume"
          >
            <FileText className="w-2.5 h-2.5" />
            <span>+ Attach CV</span>
          </span>
        )}

        {linkedCoverLetter && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(card);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 hover:bg-violet-100 transition-colors cursor-pointer"
            title="Linked Cover Letter"
          >
            <Mail className="w-2.5 h-2.5 text-violet-500" />
            <span>Cover Letter</span>
          </span>
        )}

        {card.aiAnalysis?.matchScore && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-2.5 h-2.5" />
            <span>{card.aiAnalysis.matchScore}%</span>
          </span>
        )}
      </div>

      {/* Footer: Date applied & Quick Stage Advance Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{daysAgo ? `Applied: ${daysAgo}` : formatDate(card.appliedDate)}</span>
        </div>

        {/* Quick advance / reverse stage buttons on hover */}
        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {prevColumn && (
            <button
              type="button"
              onClick={() => moveApplication(card.id, prevColumn.id)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title={`Move back to ${prevColumn.title}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {nextColumn && (
            <button
              type="button"
              onClick={() => moveApplication(card.id, nextColumn.id)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title={`Advance to ${nextColumn.title}`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
