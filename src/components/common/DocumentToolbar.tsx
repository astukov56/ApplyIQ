'use client';

import React from 'react';
import type {
  FontFamily,
  LineSpacing,
  MarginPreset,
  DensityPreset,
  ResumeFormatSettings,
} from '@/types/resumeFormat';
import {
  FONT_SIZE_PRESETS,
  COVER_LETTER_FONT_SIZE_PRESETS,
  DENSITY_CONFIG,
} from '@/types/resumeFormat';
import {
  Type,
  Minus,
  Plus,
  AlignJustify,
  Maximize2,
  FileCode,
  Printer,
  UploadCloud,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Sliders,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export type DocumentType = 'resume' | 'cover_letter';

export interface DocumentToolbarProps {
  documentType?: DocumentType;
  settings: ResumeFormatSettings;
  onChange: (updated: ResumeFormatSettings) => void;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
  onUploadClick?: () => void;
  onResetClick?: () => void;
  isSaving?: boolean;
  className?: string;
  extraActions?: React.ReactNode;
  /** Page budget height ratio or percentage (e.g. 98% or 105%) */
  pageBudgetPercent?: number;
  /** Callback to automatically apply compact density and narrow margins to fit on 1 page */
  onAutoFit?: () => void;
}

const FONT_OPTIONS: Array<{ value: FontFamily; label: string; fontClass: string }> = [
  { value: 'Inter', label: 'Inter (Modern ATS)', fontClass: 'font-sans' },
  { value: 'Calibri', label: 'Calibri (Clean ATS)', fontClass: 'font-sans' },
  { value: 'Arial', label: 'Arial (Standard)', fontClass: 'font-sans' },
  { value: 'Times New Roman', label: 'Times New Roman', fontClass: 'font-serif' },
  { value: 'Garamond', label: 'Garamond (Executive)', fontClass: 'font-serif' },
];

const LINE_SPACING_OPTIONS: Array<{ value: LineSpacing; label: string }> = [
  { value: '1.0', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.20', label: '1.20' },
  { value: '1.25', label: '1.25' },
  { value: '1.30', label: '1.30' },
  { value: '1.5', label: '1.5' },
];

const MARGIN_OPTIONS: Array<{ value: MarginPreset; label: string; short: string }> = [
  { value: 'narrow', label: 'Narrow (12mm)', short: '12mm' },
  { value: 'normal', label: 'Normal (15mm)', short: '15mm' },
  { value: 'wide', label: 'Wide (20mm)', short: '20mm' },
];

const DENSITY_OPTIONS: Array<{ value: DensityPreset; label: string; short: string }> = [
  { value: 'compact', label: 'Compact (9.5pt)', short: 'Compact' },
  { value: 'balanced', label: 'Balanced (10.5pt)', short: 'Balanced' },
  { value: 'comfortable', label: 'Comfortable (11pt)', short: 'Comfortable' },
];

export function DocumentToolbar({
  documentType = 'resume',
  settings,
  onChange,
  onExportDocx,
  onExportPdf,
  onUploadClick,
  onResetClick,
  isSaving = false,
  className = '',
  extraActions,
  pageBudgetPercent,
  onAutoFit,
}: DocumentToolbarProps) {
  const setFont = (fontFamily: FontFamily) => {
    onChange({ ...settings, fontFamily });
  };

  const adjustFontSize = (delta: number) => {
    const next = Math.round((settings.fontSizePt + delta) * 10) / 10;
    const min = documentType === 'cover_letter' ? 9.0 : 8.5;
    const max = documentType === 'cover_letter' ? 14.0 : 13.5;
    if (next >= min && next <= max) {
      onChange({ ...settings, fontSizePt: next });
    }
  };

  const setFontSizeValue = (size: number) => {
    onChange({ ...settings, fontSizePt: size });
  };

  const setLineSpacing = (lineSpacing: LineSpacing) => {
    onChange({ ...settings, lineSpacing });
  };

  const setMargin = (margin: MarginPreset) => {
    onChange({ ...settings, margin });
  };

  const setDensity = (density: DensityPreset) => {
    const cfg = DENSITY_CONFIG[density] || DENSITY_CONFIG.balanced;
    onChange({
      ...settings,
      density,
      fontSizePt: cfg.fontSizePt,
      lineSpacing: cfg.lineSpacing,
    });
  };

  const isCoverLetter = documentType === 'cover_letter';
  const isOverflowing = pageBudgetPercent !== undefined && pageBudgetPercent > 100;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 p-2 sm:px-3 sm:py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm text-xs print:hidden select-none transition-all ${className}`}
      role="toolbar"
      aria-label={`${isCoverLetter ? 'Cover letter' : 'Resume'} typography and formatting toolbar`}
    >
      {/* Left Group: Typography & Page Layout controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Font Family Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <Type className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <select
            value={settings.fontFamily}
            onChange={(e) => setFont(e.target.value as FontFamily)}
            className="bg-transparent font-medium text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-xs pr-1"
            title="Font Family"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Stepper & Quick Presets */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => adjustFontSize(-0.5)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Decrease Font Size (-0.5pt)"
            aria-label="Decrease Font Size"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="px-1.5 font-semibold text-slate-800 dark:text-slate-100 min-w-[3.2rem] text-center text-xs">
            {settings.fontSizePt} pt
          </span>
          <button
            type="button"
            onClick={() => adjustFontSize(0.5)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Increase Font Size (+0.5pt)"
            aria-label="Increase Font Size"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* Quick Preset Buttons */}
          <div className="hidden md:flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-200 dark:border-slate-700">
            {isCoverLetter ? (
              <>
                {(['10pt', '11pt', '12pt'] as const).map((presetKey) => {
                  const sizeVal = COVER_LETTER_FONT_SIZE_PRESETS[presetKey];
                  const isActive = settings.fontSizePt === sizeVal;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setFontSizeValue(sizeVal)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                      title={`${presetKey} font preset`}
                    >
                      {presetKey}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {(['compact', 'regular', 'spacious'] as const).map((presetKey) => {
                  const sizeVal = FONT_SIZE_PRESETS[presetKey];
                  const isActive = settings.fontSizePt === sizeVal;
                  const label = presetKey === 'compact' ? '9.5' : presetKey === 'regular' ? '10.5' : '11.5';
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setFontSizeValue(sizeVal)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                      title={`${presetKey} (${sizeVal}pt)`}
                    >
                      {label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Line Spacing Selector */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <AlignJustify className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-400 hidden sm:inline mr-0.5">Line:</span>
          <div className="flex items-center gap-0.5">
            {LINE_SPACING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLineSpacing(opt.value)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  settings.lineSpacing === opt.value
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
                title={`Line Spacing ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Margin Selector */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <Maximize2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-400 hidden sm:inline mr-0.5">Margin:</span>
          <div className="flex items-center gap-0.5">
            {MARGIN_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMargin(m.value)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  settings.margin === m.value
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
                title={m.label}
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Density Presets (Compact, Balanced, Comfortable) */}
        {!isCoverLetter && (
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400 hidden sm:inline mr-0.5">Density:</span>
            <div className="flex items-center gap-0.5">
              {DENSITY_OPTIONS.map((d) => {
                const current = settings.density || 'balanced';
                const isNormalizedActive =
                  current === d.value ||
                  (d.value === 'balanced' && current === 'normal') ||
                  (d.value === 'comfortable' && current === 'spacious');
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDensity(d.value)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      isNormalizedActive
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                    title={`${d.label} preset`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Group: Document status & 1-Click Export Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Page Budget / 1-Page A4 ATS Shield Indicator */}
        {pageBudgetPercent !== undefined && (
          <div className="flex items-center gap-1.5">
            <div
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                isOverflowing
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              }`}
              title={
                isOverflowing
                  ? `Resume length is ${pageBudgetPercent}% of 1 A4 page. Exceeds standard 1-page budget.`
                  : `Resume length is ${pageBudgetPercent}% of 1 A4 page. Fits cleanly on 1 page.`
              }
            >
              {isOverflowing ? (
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              )}
              <span>{pageBudgetPercent}%</span>
              <span className="font-normal text-[10px] opacity-75 hidden sm:inline">A4</span>
            </div>

            {/* Auto-Fit Action when overflowing */}
            {isOverflowing && onAutoFit && (
              <button
                type="button"
                onClick={onAutoFit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-95 cursor-pointer animate-in fade-in duration-150"
                title="Automatically adjust font size, line spacing, and margins to fit on 1 page"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Fit 1-Page</span>
              </button>
            )}
          </div>
        )}

        {/* Persistence Status */}
        {isSaving ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
            <span className="hidden sm:inline">Saving…</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="hidden sm:inline">Saved</span>
          </span>
        )}

        {/* Upload / Replace Action */}
        {onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 transition-colors cursor-pointer"
            title="Upload or replace with a new resume file"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">Upload / Replace</span>
          </button>
        )}

        {/* Start Over Action */}
        {onResetClick && (
          <button
            type="button"
            onClick={onResetClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 transition-colors cursor-pointer"
            title="Reset to blank"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        )}

        {/* Extra actions if passed */}
        {extraActions}

        {/* 1-Click Export Word (.docx) */}
        {onExportDocx && (
          <button
            type="button"
            onClick={onExportDocx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            title="Export Word (.docx) with current formatting settings"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Word (.docx)</span>
          </button>
        )}

        {/* 1-Click Export PDF */}
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs transition-colors cursor-pointer"
            title="Print or export PDF with current formatting settings"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}
