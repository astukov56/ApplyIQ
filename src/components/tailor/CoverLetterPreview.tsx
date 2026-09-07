'use client';

import React, { useState } from 'react';
import type { CandidateProfile } from '@/types/profile';
import type { CoverLetterResult, StagedModification } from '@/types/tailor';
import {
  ResumeFormatSettings,
  DEFAULT_COVER_LETTER_FORMAT_SETTINGS,
  FONT_FAMILY_STACKS,
  MARGIN_CONFIG,
  LINE_SPACING_CSS,
  getSavedFormatSettings,
  saveFormatSettings,
} from '@/types/resumeFormat';
import {
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
  normalizeUrl,
  formatDisplayUrl,
} from '@/lib/linkUtils';
import { renderInSituTextDiff } from '@/lib/diffUtils';
import { DocumentToolbar } from '@/components/common/DocumentToolbar';
import { exportCoverLetterDocx } from '@/lib/export/exportDocx';
import { buildCoverLetterHtml, printHtml } from '@/lib/export/exportPdf';
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
  formatSettings?: ResumeFormatSettings;
  onFormatChange?: (settings: ResumeFormatSettings) => void;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
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
  formatSettings: externalFormatSettings,
  onFormatChange,
  onExportDocx,
  onExportPdf,
}: CoverLetterPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [internalFormat, setInternalFormat] = useState<ResumeFormatSettings>(() => {
    return getSavedFormatSettings('cover_letter', DEFAULT_COVER_LETTER_FORMAT_SETTINGS);
  });

  const format = externalFormatSettings || internalFormat;
  const setFormat = (newSettings: ResumeFormatSettings) => {
    saveFormatSettings('cover_letter', newSettings);
    if (onFormatChange) {
      onFormatChange(newSettings);
    } else {
      setInternalFormat(newSettings);
    }
  };

  // 1-Page A4 Height Monitoring (A4 standard height = 1123px at 96 DPI / 297mm)
  const A4_HEIGHT_PX = 1123;
  const paperRef = React.useRef<HTMLDivElement>(null);
  const [pageBudgetPercent, setPageBudgetPercent] = useState<number>(100);

  React.useEffect(() => {
    const el = paperRef.current;
    if (!el) return;

    const measureHeight = () => {
      const scrollH = el.scrollHeight;
      const pct = Math.round((scrollH / A4_HEIGHT_PX) * 100);
      setPageBudgetPercent(pct);
    };

    measureHeight();
    const observer = new ResizeObserver(measureHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [format, coverLetter, profile]);

  const handleAutoFit = () => {
    setFormat({
      ...format,
      fontSizePt: Math.max(9.5, format.fontSizePt - 1.0),
      margin: 'narrow',
    });
  };

  const isDiffMode = Boolean(
    stagedDiff && (stagedDiff.documentType === 'cover_letter' || stagedDiff.proposedCoverLetter)
  );
  const origCoverLetter = stagedDiff?.originalCoverLetter;
  const activeCoverLetter =
    isDiffMode && stagedDiff?.proposedCoverLetter ? stagedDiff.proposedCoverLetter : coverLetter;

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
  const pageDensityPercent = Math.min(100, Math.round((wordCount / 500) * 100));

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

  // Default export handlers
  const handleDefaultExportDocx = () => {
    if (onExportDocx) {
      onExportDocx();
    } else {
      exportCoverLetterDocx(
        {
          targetCompany,
          targetPosition,
          subject: activeCoverLetter.subject,
          opening: activeCoverLetter.opening,
          bodyText: activeCoverLetter.body || '',
          closing: activeCoverLetter.closing,
        },
        profile,
        format
      );
    }
  };

  const handleDefaultExportPdf = () => {
    if (onExportPdf) {
      onExportPdf();
    } else {
      const html = buildCoverLetterHtml({
        name: profile.name,
        title: profile.title,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        websiteUrl: profile.websiteUrl,
        targetCompany,
        targetPosition,
        subject: activeCoverLetter.subject,
        opening: activeCoverLetter.opening,
        bodyText: activeCoverLetter.body || '',
        closing: activeCoverLetter.closing,
        date: formattedDate,
      });
      printHtml(html, `Cover Letter - ${profile.name} for ${targetCompany}`, format);
    }
  };

  // Compute diff paragraph list when in diff mode
  const origParas = (origCoverLetter?.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const propParas = paragraphs;
  const maxParasLen = Math.max(origParas.length, propParas.length);

  // Formulate contact items matching Rezi layout
  const contactItems: React.ReactNode[] = [
    profile.phone && <span key="phone">{profile.phone}</span>,
    profile.email && (
      <a
        key="email"
        href={`mailto:${profile.email}`}
        className="hover:underline text-slate-800 dark:text-slate-200 print:text-black print:no-underline"
      >
        {profile.email}
      </a>
    ),
    profile.location && <span key="loc">{profile.location}</span>,
    profile.linkedinUrl && (
      <a
        key="li"
        href={normalizeLinkedInUrl(profile.linkedinUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-slate-800 dark:text-slate-200 print:text-black print:no-underline"
      >
        {formatLinkedInDisplay(profile.linkedinUrl)}
      </a>
    ),
    profile.githubUrl && (
      <a
        key="gh"
        href={normalizeGitHubUrl(profile.githubUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-slate-800 dark:text-slate-200 print:text-black print:no-underline"
      >
        {formatGitHubDisplay(profile.githubUrl)}
      </a>
    ),
    profile.websiteUrl && (
      <a
        key="web"
        href={normalizeUrl(profile.websiteUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-slate-800 dark:text-slate-200 print:text-black print:no-underline"
      >
        {formatDisplayUrl(profile.websiteUrl)}
      </a>
    ),
  ].filter(Boolean);

  const marginConfig = MARGIN_CONFIG[format.margin] || MARGIN_CONFIG.normal;
  const fontStack = FONT_FAMILY_STACKS[format.fontFamily] || FONT_FAMILY_STACKS.Inter;
  const lineHeight = LINE_SPACING_CSS[format.lineSpacing] || 1.35;

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

      {/* Reusable Document Formatting Toolbar docked above live canvas */}
      {showToolbar && !isDiffMode && (
        <DocumentToolbar
          documentType="cover_letter"
          settings={format}
          onChange={setFormat}
          onExportDocx={handleDefaultExportDocx}
          onExportPdf={handleDefaultExportPdf}
          pageBudgetPercent={pageBudgetPercent}
          onAutoFit={handleAutoFit}
          extraActions={
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all',
                  isOptimalWordCount
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40 shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {wordCount} Words ({pageDensityPercent}%)
                </span>
              </span>

              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Copy cover letter content"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          }
        />
      )}

      {/* A4 Paper Container — Rezi Minimalist Layout */}
      <div
        id="cover-letter-preview"
        ref={paperRef}
        className="resume-sheet bg-white text-slate-900 shadow-2xl mx-auto rounded-xs print:shadow-none print:m-0 transition-all"
        style={{
          width: '816px',
          minHeight: '1056px',
          padding: marginConfig.paddingPreview,
          fontFamily: fontStack,
          fontSize: `${format.fontSizePt}pt`,
          lineHeight: lineHeight,
          color: '#111827',
          boxSizing: 'border-box',
        }}
      >
        {/* Formal Rezi Header: Candidate Contact Info */}
        <div className="text-center mb-4 pb-2.5 border-b border-gray-300 print:border-black">
          <h1
            className="font-bold tracking-tight text-slate-950 print:text-black uppercase"
            style={{ fontSize: `${Math.round(format.fontSizePt * 1.8)}pt`, letterSpacing: '0.04em' }}
          >
            {profile.name}
          </h1>

          {profile.title && (
            <p className="text-[11px] font-semibold text-slate-700 print:text-black mt-0.5 tracking-wide">
              {profile.title}
            </p>
          )}

          {contactItems.length > 0 && (
            <p className="mt-1 text-[9.5px] text-slate-600 print:text-black leading-snug">
              {contactItems.reduce<React.ReactNode[]>((acc, el, i) => {
                if (i > 0) {
                  acc.push(
                    <span key={`sep-${i}`} className="mx-1.5 text-slate-400 print:text-black">
                      |
                    </span>
                  );
                }
                acc.push(el);
                return acc;
              }, [])}
            </p>
          )}
        </div>

        {/* Date */}
        <div
          className="text-slate-500 print:text-black mb-3"
          style={{ fontSize: `${Math.max(8.5, format.fontSizePt - 1.5)}pt` }}
        >
          {formattedDate}
        </div>

        {/* Recipient Block & Bound Subject Line */}
        <div
          className="mb-4 text-slate-800 print:text-black leading-snug"
          style={{ fontSize: `${format.fontSizePt}pt` }}
        >
          <p className="font-bold text-slate-950 print:text-black">Hiring Team</p>
          <p className="font-semibold text-slate-900 print:text-black">{targetCompany}</p>
          <p className="text-slate-900 print:text-black font-bold mt-2">
            {activeCoverLetter.subject || `Re: Application for ${targetPosition} – ${targetCompany}`}
          </p>
        </div>

        {/* Salutation */}
        <p
          contentEditable={editable && !isDiffMode}
          suppressContentEditableWarning
          onBlur={(e) => handleOpeningBlur(e.currentTarget.innerText.trim())}
          className={clsx(
            'font-bold text-slate-950 print:text-black mb-2.5',
            editable &&
              !isDiffMode &&
              'focus:outline-none focus:ring-1 focus:ring-indigo-400/80 focus:bg-indigo-50/25 rounded-[2px] px-0.5 -mx-0.5 hover:bg-slate-100/60 cursor-text'
          )}
          style={{ fontSize: `${format.fontSizePt}pt` }}
        >
          {activeCoverLetter.opening || `Dear ${targetCompany} Team,`}
        </p>

        {/* 4-Paragraph Narrative Body with Live Inline Editing & In-Situ Diff */}
        <div
          className="space-y-3 text-justify text-slate-800 print:text-black"
          style={{ fontSize: `${format.fontSizePt}pt`, lineHeight }}
        >
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
        <div
          className="mt-5 text-slate-900 print:text-black space-y-1"
          style={{ fontSize: `${format.fontSizePt}pt` }}
        >
          <p
            contentEditable={editable && !isDiffMode}
            suppressContentEditableWarning
            onBlur={(e) => handleClosingBlur(e.currentTarget.innerText.trim())}
            className={clsx(
              'whitespace-pre-line leading-relaxed',
              editable &&
                !isDiffMode &&
                'focus:outline-none focus:ring-1 focus:ring-indigo-400/80 focus:bg-indigo-50/25 rounded-[2px] px-0.5 -mx-0.5 hover:bg-slate-100/60 cursor-text'
            )}
          >
            {activeCoverLetter.closing || `Sincerely,\n${profile.name}`}
          </p>
          {profile.title && (
            <p
              className="text-slate-600 print:text-black font-medium"
              style={{ fontSize: `${Math.max(8.5, format.fontSizePt - 1.5)}pt` }}
            >
              {profile.title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
