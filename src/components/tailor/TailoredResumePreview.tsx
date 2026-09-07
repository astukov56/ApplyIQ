'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ResumeVersion } from '@/types/resume';
import type { CandidateProfile } from '@/types/profile';
import type { StagedModification } from '@/types/tailor';
import {
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import type { ResumeFormatSettings } from '@/types/resumeFormat';
import {
  DEFAULT_FORMAT_SETTINGS,
  DENSITY_CONFIG,
  getSavedFormatSettings,
  saveFormatSettings,
} from '@/types/resumeFormat';
import { DocumentToolbar } from '@/components/common/DocumentToolbar';
import { ResumeSheet } from '@/components/resume/ResumeSheet';

export interface TailoredResumePreviewProps {
  resume: ResumeVersion;
  profile: CandidateProfile;
  /** Set of matched keywords to highlight */
  highlightKeywords?: Set<string>;
  /** Optional interactive controls toolbar */
  showControls?: boolean;
  /** Whether inline live-editing is enabled */
  editable?: boolean;
  /** Callback fired whenever resume content is modified inline */
  onChange?: (updatedResume: ResumeVersion) => void;
  /** Active staged modification awaiting review */
  stagedDiff?: StagedModification | null;
  /** Accept staged modification callback */
  onAcceptStaged?: () => void;
  /** Reject staged modification callback */
  onRejectStaged?: () => void;
  /** Optional layout formatting settings (font, spacing, margins) */
  formatSettings?: ResumeFormatSettings;
  onFormatChange?: (settings: ResumeFormatSettings) => void;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
}

export function TailoredResumePreview({
  resume,
  profile,
  highlightKeywords = new Set(),
  showControls = false,
  editable = true,
  onChange,
  stagedDiff = null,
  onAcceptStaged,
  onRejectStaged,
  formatSettings: externalFormatSettings,
  onFormatChange,
  onExportDocx,
  onExportPdf,
}: TailoredResumePreviewProps) {
  const [internalFormat, setInternalFormat] = useState<ResumeFormatSettings>(() => {
    return getSavedFormatSettings('resume', DEFAULT_FORMAT_SETTINGS);
  });
  const format = externalFormatSettings || internalFormat;
  const setFormat = (newSettings: ResumeFormatSettings) => {
    saveFormatSettings('resume', newSettings);
    if (onFormatChange) {
      onFormatChange(newSettings);
    } else {
      setInternalFormat(newSettings);
    }
  };

  // 1-Page A4 Height Monitoring (A4 standard height = 1123px at 96 DPI / 297mm)
  const A4_HEIGHT_PX = 1123;
  const paperRef = useRef<HTMLDivElement>(null);
  const [pageBudgetPercent, setPageBudgetPercent] = useState<number>(100);

  useEffect(() => {
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
  }, [format, resume, profile, stagedDiff]);

  const handleAutoFit = () => {
    const compactCfg = DENSITY_CONFIG.compact;
    setFormat({
      ...format,
      density: 'compact',
      fontSizePt: compactCfg.fontSizePt,
      lineSpacing: compactCfg.lineSpacing,
      margin: 'narrow',
    });
  };

  const [enableHighlight, setEnableHighlight] = useState(true);
  const kw = new Set([...highlightKeywords].map((k) => k.toLowerCase()));

  const isDiffMode = Boolean(stagedDiff && stagedDiff.proposedResume);
  const activeResume: ResumeVersion =
    isDiffMode && stagedDiff?.proposedResume ? stagedDiff.proposedResume : resume;

  const handleDataChange = (updated: Partial<ResumeVersion>) => {
    if (onChange && !isDiffMode) {
      onChange({
        ...activeResume,
        ...updated,
        id: activeResume.id,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-3 relative">
      {/* Floating Review Toolbar when AI changes are staged */}
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

      {/* Top controls bar with DocumentToolbar */}
      {showControls && !isDiffMode && (
        <DocumentToolbar
          documentType="resume"
          settings={format}
          onChange={setFormat}
          onExportDocx={onExportDocx}
          onExportPdf={onExportPdf}
          pageBudgetPercent={pageBudgetPercent}
          onAutoFit={handleAutoFit}
          extraActions={
            kw.size > 0 ? (
              <button
                type="button"
                onClick={() => setEnableHighlight((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 font-medium cursor-pointer transition-colors"
              >
                {enableHighlight ? <Eye className="w-3.5 h-3.5 text-amber-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{enableHighlight ? 'Keywords' : 'Clean View'}</span>
              </button>
            ) : null
          }
        />
      )}

      {/* Shared Canonical Rezi Minimalist ATS Resume Sheet */}
      <ResumeSheet
        id="tailored-resume-preview"
        data={activeResume}
        profile={profile}
        formatting={format}
        editable={editable && !isDiffMode}
        onDataChange={handleDataChange}
        stagedDiff={stagedDiff}
        highlightKeywords={kw}
        enableHighlight={enableHighlight}
        innerRef={paperRef}
      />
    </div>
  );
}
