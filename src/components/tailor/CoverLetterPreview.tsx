'use client';

import React, { useState } from 'react';
import type { CandidateProfile } from '@/types/profile';
import type { CoverLetterResult, StagedModification } from '@/types/tailor';
import {
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
  normalizeUrl,
  formatDisplayUrl,
} from '@/lib/linkUtils';
import { renderInSituTextDiff } from '@/lib/diffUtils';
import {
  FileText,
  Copy,
  Check,
  Sparkles,
  Edit3,
  X,
} from 'lucide-react';
import clsx from 'clsx';

export interface CoverLetterPreviewProps {
  coverLetter: CoverLetterResult;
  profile: CandidateProfile;
  targetCompany?: string;
  targetPosition?: string;
  showToolbar?: boolean;
  editable?: boolean;
  onChange?: (updated: CoverLetterResult) => void;
  stagedDiff?: StagedModification | null;
  onAcceptStaged?: () => void;
  onRejectStaged?: () => void;
}

export function CoverLetterPreview({
  coverLetter,
  profile,
  targetCompany = 'Company',
  targetPosition = 'Software Engineer',
  showToolbar = true,
  editable = true,
  onChange,
  stagedDiff = null,
  onAcceptStaged,
  onRejectStaged,
}: CoverLetterPreviewProps) {
  const [copied, setCopied] = useState(false);

  const isDiffMode = Boolean(stagedDiff && (stagedDiff.documentType === 'cover_letter' || stagedDiff.proposedCoverLetter));
  const origCoverLetter = stagedDiff?.originalCoverLetter;
  const activeCoverLetter = isDiffMode && stagedDiff?.proposedCoverLetter ? stagedDiff.proposedCoverLetter : coverLetter;

  // Compute live word count of the active body
  const bodyText = activeCoverLetter.body || '';
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

  // Split active body into paragraphs
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const targetMin = 350;
  const targetMax = 450;
  const isOptimalWordCount = wordCount >= targetMin && wordCount <= targetMax;
  const pageDensityPercent = Math.min(
    100,
    Math.round((wordCount / 500) * 100)
  );

  const formattedDate = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleCopy = () => {
    const fullContent = `${activeCoverLetter.opening}\n\n${bodyText}\n\n${activeCoverLetter.closing}`;
    navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParagraphBlur = (pIdx: number, newParaText: string) => {
    if (isDiffMode) return;
    const updatedParas = [...paragraphs];
    updatedParas[pIdx] = newParaText;
    const newBody = updatedParas.join('\n\n');
    const newWordCount = newBody.trim().split(/\s+/).filter(Boolean).length;
    const newFullText = `${activeCoverLetter.opening}\n\n${newBody}\n\n${activeCoverLetter.closing}`;

    if (onChange) {
      onChange({
        ...activeCoverLetter,
        body: newBody,
        wordCount: newWordCount,
        fullText: newFullText,
      });
    }
  };

  const handleOpeningBlur = (newOpening: string) => {
    if (isDiffMode) return;
    const newFullText = `${newOpening}\n\n${bodyText}\n\n${activeCoverLetter.closing}`;
    if (onChange) {
      onChange({ ...activeCoverLetter, opening: newOpening, fullText: newFullText });
    }
  };

  const handleClosingBlur = (newClosing: string) => {
    if (isDiffMode) return;
    const newFullText = `${activeCoverLetter.opening}\n\n${bodyText}\n\n${newClosing}`;
    if (onChange) {
      onChange({ ...activeCoverLetter, closing: newClosing, fullText: newFullText });
    }
  };

  // Compute diff paragraph list when in diff mode
  const origParas = (origCoverLetter?.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const propParas = paragraphs;
  const maxParasLen = Math.max(origParas.length, propParas.length);

  return (
    <div className="space-y-3 relative">
      {/* Floating Sticky Antigravity Review Toolbar over the Cover Letter canvas */}
      {stagedDiff && (
        <div className="sticky top-2 z-40 mx-auto max-w-xl flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white shadow-2xl border border-indigo-500/50 print:hidden animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-300"></span>
            </span>
            <div className="truncate">
              <span className="font-bold text-xs">Reviewing AI Changes:</span>{' '}
              <span className="text-xs text-slate-300 truncate">{stagedDiff.changeDescription}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onAcceptStaged && (
              <button
                type="button"
                onClick={onAcceptStaged}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Changes</span>
              </button>
            )}
            {onRejectStaged && (
              <button
                type="button"
                onClick={onRejectStaged}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-700 hover:bg-rose-600/90 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top metrics toolbar */}
      {showToolbar && !isDiffMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs print:hidden">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all',
                isOptimalWordCount
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40 shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {wordCount} Words ({pageDensityPercent}% Page Density)
              </span>
            </span>

            <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
              • Target: 350–450 words (2/3 to 3/4 A4 page)
            </span>

            {editable && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                Live editing enabled
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Letter</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* A4 Paper Container */}
      <div
        id="cover-letter-preview"
        className="bg-white text-slate-900 shadow-2xl mx-auto rounded-xs print:shadow-none print:m-0"
        style={{
          width: '816px',
          minHeight: '1056px',
          padding: '44px 54px',
          fontFamily: '"Times New Roman", Times, "Cambria", Georgia, serif',
          fontSize: '11px',
          lineHeight: 1.55,
          color: '#0f172a',
          boxSizing: 'border-box',
        }}
      >
        {/* Formal Header: Candidate Contact Info */}
        <div className="text-center mb-5 pb-3.5 border-b border-slate-200 print:border-black">
          <h1
            className="font-bold tracking-tight text-slate-950 print:text-black uppercase"
            style={{ fontSize: '22px', letterSpacing: '0.04em' }}
          >
            {profile.name}
          </h1>

          {profile.title && (
            <p className="text-[11px] font-semibold text-slate-700 print:text-black mt-0.5 tracking-wide">
              {profile.title}
            </p>
          )}

          <p className="mt-1 text-[9.5px] text-slate-600 print:text-black">
            {[profile.email, profile.phone, profile.location]
              .filter(Boolean)
              .join('  |  ')}
          </p>

          {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl) && (
            <p className="mt-0.5 text-[9.5px] text-blue-700 print:text-black">
              {profile.linkedinUrl && (
                <a
                  href={normalizeLinkedInUrl(profile.linkedinUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {formatLinkedInDisplay(profile.linkedinUrl)}
                </a>
              )}
              {profile.linkedinUrl && profile.githubUrl && (
                <span className="mx-2 text-slate-300 print:text-black">|</span>
              )}
              {profile.githubUrl && (
                <a
                  href={normalizeGitHubUrl(profile.githubUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {formatGitHubDisplay(profile.githubUrl)}
                </a>
              )}
              {(profile.linkedinUrl || profile.githubUrl) && profile.websiteUrl && (
                <span className="mx-2 text-slate-300 print:text-black">|</span>
              )}
              {profile.websiteUrl && (
                <a
                  href={normalizeUrl(profile.websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {formatDisplayUrl(profile.websiteUrl)}
                </a>
              )}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="text-[10px] text-slate-600 print:text-black mb-3">
          {formattedDate}
        </div>

        {/* Recipient Block & Bound Subject Line */}
        <div className="mb-4 text-[10.5px] text-slate-800 print:text-black leading-snug">
          <p className="font-bold text-slate-950 print:text-black">Hiring Team</p>
          <p className="font-semibold text-slate-900 print:text-black">{targetCompany}</p>
          <p className="text-slate-900 print:text-black font-bold mt-2 text-[11px]">
            {activeCoverLetter.subject || `Re: Application for ${targetPosition} – ${targetCompany}`}
          </p>
        </div>

        {/* Salutation */}
        <p
          contentEditable={editable && !isDiffMode}
          suppressContentEditableWarning
          onBlur={(e) => handleOpeningBlur(e.currentTarget.innerText.trim())}
          className={clsx(
            'font-bold text-slate-950 print:text-black mb-2.5 text-[11px]',
            editable && !isDiffMode && 'focus:outline-none focus:ring-1 focus:ring-indigo-400/80 focus:bg-indigo-50/25 rounded-[2px] px-0.5 -mx-0.5 hover:bg-slate-100/60 cursor-text'
          )}
        >
          {activeCoverLetter.opening || `Dear ${targetCompany} Team,`}
        </p>

        {/* 4-Paragraph Narrative Body with Live Inline Editing & In-Situ Diff */}
        <div className="space-y-3 text-justify text-slate-800 print:text-black text-[10.5px] leading-[1.58]">
          {isDiffMode && origCoverLetter
            ? Array.from({ length: maxParasLen }).map((_, pIdx) => {
                const oPara = origParas[pIdx];
                const pPara = propParas[pIdx];

                if (!oPara && pPara) {
                  return (
                    <p key={pIdx} className="indent-0">
                      <ins className="bg-emerald-50 text-emerald-800 border-b border-emerald-400 no-underline px-0.5 rounded-[1px] font-medium print:bg-transparent print:text-black print:border-none print:font-normal">
                        {pPara}
                      </ins>
                    </p>
                  );
                }

                if (oPara && !pPara) {
                  return (
                    <p key={pIdx} className="indent-0 print:hidden">
                      <del className="bg-rose-50 text-rose-700 line-through px-0.5 rounded-[1px]">
                        {oPara}
                      </del>
                    </p>
                  );
                }

                if (oPara && pPara && oPara !== pPara) {
                  return (
                    <p key={pIdx} className="indent-0">
                      {renderInSituTextDiff(oPara, pPara)}
                    </p>
                  );
                }

                return (
                  <p key={pIdx} className="indent-0">
                    {pPara}
                  </p>
                );
              })
            : paragraphs.map((para, index) => (
                <p
                  key={index}
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => handleParagraphBlur(index, e.currentTarget.innerText.trim())}
                  className={clsx(
                    'indent-0 transition-colors',
                    editable &&
                      'focus:outline-none focus:ring-1 focus:ring-indigo-400/80 focus:bg-indigo-50/25 rounded-[2px] px-0.5 -mx-0.5 hover:bg-slate-100/60 cursor-text'
                  )}
                >
                  {para}
                </p>
              ))}
        </div>

        {/* Closing & Sign-off */}
        <div className="mt-5 text-[10.5px] text-slate-900 print:text-black space-y-1">
          <p
            contentEditable={editable && !isDiffMode}
            suppressContentEditableWarning
            onBlur={(e) => handleClosingBlur(e.currentTarget.innerText.trim())}
            className={clsx(
              'whitespace-pre-line leading-relaxed',
              editable && !isDiffMode && 'focus:outline-none focus:ring-1 focus:ring-indigo-400/80 focus:bg-indigo-50/25 rounded-[2px] px-0.5 -mx-0.5 hover:bg-slate-100/60 cursor-text'
            )}
          >
            {activeCoverLetter.closing || `Sincerely,\n${profile.name}`}
          </p>
          {profile.title && (
            <p className="text-[10px] text-slate-600 print:text-black font-medium">
              {profile.title}
            </p>
          )}
        </div>
      </div>

      {/* Embedded print stylesheet rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          #cover-letter-preview {
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          [contenteditable] {
            outline: none !important;
            border: none !important;
            background: transparent !important;
          }
          del {
            display: none !important;
          }
          ins {
            background: transparent !important;
            color: black !important;
            border: none !important;
            text-decoration: none !important;
            font-weight: normal !important;
          }
          @page {
            size: A4;
            margin: 12mm 12mm;
          }
        }
      `}</style>
    </div>
  );
}
