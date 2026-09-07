'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { MasterResume } from '@/types/resume';
import type { CandidateProfile } from '@/types/profile';
import {
  ResumeFormatSettings,
  DEFAULT_FORMAT_SETTINGS,
  DENSITY_CONFIG,
  getSavedFormatSettings,
  saveFormatSettings,
} from '@/types/resumeFormat';
import { ResumeFormattingToolbar } from '@/components/resume/ResumeFormattingToolbar';
import { ResumeSheet } from '@/components/resume/ResumeSheet';

export interface MasterResumePreviewProps {
  masterResume: MasterResume;
  profile: CandidateProfile;
  onChange: (updates: Partial<MasterResume> & Partial<CandidateProfile>) => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  onUploadClick?: () => void;
  onResetClick?: () => void;
  formatSettings?: ResumeFormatSettings;
  onFormatChange?: (settings: ResumeFormatSettings) => void;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
}

export function MasterResumePreview({
  masterResume,
  profile,
  onChange,
  isSaving = false,
  onUploadClick,
  onResetClick,
  formatSettings: externalFormatSettings,
  onFormatChange,
  onExportDocx,
  onExportPdf,
}: MasterResumePreviewProps) {
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
  }, [format, masterResume, profile]);

  const handleAutoFit = () => {
    // Automatically apply compact density preset and narrow margins to pull within 1 page
    const compactCfg = DENSITY_CONFIG.compact;
    setFormat({
      ...format,
      density: 'compact',
      fontSizePt: compactCfg.fontSizePt,
      lineSpacing: compactCfg.lineSpacing,
      margin: 'narrow',
    });
  };

  return (
    <div className="space-y-3">
      {/* Microsoft Word-Style Formatting Ribbon Toolbar */}
      <ResumeFormattingToolbar
        settings={format}
        onChange={setFormat}
        onExportDocx={onExportDocx}
        onExportPdf={onExportPdf}
        onUploadClick={onUploadClick}
        onResetClick={onResetClick}
        isSaving={isSaving}
        pageBudgetPercent={pageBudgetPercent}
        onAutoFit={handleAutoFit}
      />

      {/* Shared Canonical Rezi Minimalist ATS Resume Sheet */}
      <ResumeSheet
        id="master-resume-preview"
        data={masterResume}
        profile={profile}
        formatting={format}
        editable={true}
        onDataChange={(updates) => onChange(updates)}
        onProfileChange={(profileUpdates) => onChange(profileUpdates)}
        innerRef={paperRef}
      />
    </div>
  );
}
