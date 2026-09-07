/**
 * Formatting and typography configuration for ATS-optimized resume rendering and exports.
 */

export type FontFamily = 'Calibri' | 'Inter' | 'Arial' | 'Times New Roman' | 'Garamond';
export type FontSizePreset = 'compact' | 'regular' | 'spacious';
export type LineSpacing = '1.0' | '1.15' | '1.20' | '1.25' | '1.30' | '1.5';
export type MarginPreset = 'compact' | 'narrow' | 'normal' | 'wide';
export type DensityPreset = 'compact' | 'balanced' | 'normal' | 'comfortable' | 'spacious';

export interface ResumeFormatSettings {
  fontFamily: FontFamily;
  fontSizePt: number;
  lineSpacing: LineSpacing;
  margin: MarginPreset;
  density?: DensityPreset;
}

export const DEFAULT_FORMAT_SETTINGS: ResumeFormatSettings = {
  fontFamily: 'Inter',
  fontSizePt: 10.5,
  lineSpacing: '1.20',
  margin: 'normal',
  density: 'balanced',
};

export const FONT_FAMILY_STACKS: Record<FontFamily, string> = {
  Calibri: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif',
  Inter: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  Arial: 'Arial, Helvetica, "Helvetica Neue", sans-serif',
  'Times New Roman': '"Times New Roman", Times, "Cambria", Georgia, serif',
  Garamond: 'Garamond, "EB Garamond", "Baskerville", Georgia, serif',
};

export const FONT_SIZE_PRESETS: Record<FontSizePreset, number> = {
  compact: 9.5,
  regular: 10.5,
  spacious: 11.5,
};

export type CoverLetterFontSizePreset = '10pt' | '11pt' | '12pt';

export const COVER_LETTER_FONT_SIZE_PRESETS: Record<CoverLetterFontSizePreset, number> = {
  '10pt': 10.0,
  '11pt': 11.0,
  '12pt': 12.0,
};

export const DEFAULT_COVER_LETTER_FORMAT_SETTINGS: ResumeFormatSettings = {
  fontFamily: 'Inter',
  fontSizePt: 11.0,
  lineSpacing: '1.25',
  margin: 'normal',
  density: 'normal',
};

export interface DensitySettings {
  fontSizePt: number;
  lineSpacing: LineSpacing;
  lineHeight: number;
  sectionMarginBottomPx: number;
  bulletSpacingClass: string;
  bulletMarginBottomPx: number;
  sectionMarginDocxTwips: number;
  bulletMarginDocxTwips: number;
  label: string;
}

export const DENSITY_CONFIG: Record<DensityPreset, DensitySettings> = {
  compact: {
    fontSizePt: 9.5,
    lineSpacing: '1.15',
    lineHeight: 1.20,
    sectionMarginBottomPx: 12,
    bulletSpacingClass: 'space-y-1.5',
    bulletMarginBottomPx: 3,
    sectionMarginDocxTwips: 100,
    bulletMarginDocxTwips: 10,
    label: 'Compact (9.5pt)',
  },
  balanced: {
    fontSizePt: 10.5,
    lineSpacing: '1.20',
    lineHeight: 1.25,
    sectionMarginBottomPx: 16,
    bulletSpacingClass: 'space-y-2',
    bulletMarginBottomPx: 4,
    sectionMarginDocxTwips: 140,
    bulletMarginDocxTwips: 15,
    label: 'Balanced (10.5pt)',
  },
  normal: {
    fontSizePt: 10.5,
    lineSpacing: '1.20',
    lineHeight: 1.25,
    sectionMarginBottomPx: 16,
    bulletSpacingClass: 'space-y-2',
    bulletMarginBottomPx: 4,
    sectionMarginDocxTwips: 140,
    bulletMarginDocxTwips: 15,
    label: 'Balanced (10.5pt)',
  },
  comfortable: {
    fontSizePt: 11.0,
    lineSpacing: '1.25',
    lineHeight: 1.35,
    sectionMarginBottomPx: 20,
    bulletSpacingClass: 'space-y-2.5',
    bulletMarginBottomPx: 6,
    sectionMarginDocxTwips: 180,
    bulletMarginDocxTwips: 25,
    label: 'Comfortable (11pt)',
  },
  spacious: {
    fontSizePt: 11.0,
    lineSpacing: '1.25',
    lineHeight: 1.35,
    sectionMarginBottomPx: 20,
    bulletSpacingClass: 'space-y-2.5',
    bulletMarginBottomPx: 6,
    sectionMarginDocxTwips: 180,
    bulletMarginDocxTwips: 25,
    label: 'Comfortable (11pt)',
  },
};

export const MARGIN_CONFIG: Record<
  MarginPreset,
  {
    label: string;
    paddingPreview: string;
    paddingMm: string;
    paddingClass: string;
    twips: number;
    inches: string;
    description: string;
  }
> = {
  compact: {
    label: 'Narrow (12mm / 0.5")',
    paddingPreview: '12mm 15mm',
    paddingMm: '12mm',
    paddingClass: 'p-[12mm]',
    twips: 720,
    inches: '0.5in',
    description: '12mm margins for strict 1-page budget',
  },
  narrow: {
    label: 'Narrow (12mm / 0.5")',
    paddingPreview: '12mm 15mm',
    paddingMm: '12mm',
    paddingClass: 'p-[12mm]',
    twips: 720,
    inches: '0.5in',
    description: '12mm margins for strict 1-page budget',
  },
  normal: {
    label: 'Normal (15mm / 0.6")',
    paddingPreview: '15mm 18mm',
    paddingMm: '15mm',
    paddingClass: 'p-[15mm]',
    twips: 1080,
    inches: '0.75in',
    description: 'Standard 15mm ATS margins',
  },
  wide: {
    label: 'Wide (20mm / 0.8")',
    paddingPreview: '20mm 22mm',
    paddingMm: '20mm',
    paddingClass: 'p-[20mm]',
    twips: 1440,
    inches: '1.0in',
    description: 'Executive 20mm balanced margins',
  },
};

export const LINE_SPACING_CSS: Record<LineSpacing, number> = {
  '1.0': 1.15,
  '1.15': 1.20,
  '1.20': 1.25,
  '1.25': 1.25,
  '1.30': 1.35,
  '1.5': 1.5,
};

export const LINE_SPACING_DOCX: Record<LineSpacing, number> = {
  '1.0': 240,
  '1.15': 276,
  '1.20': 288,
  '1.25': 300,
  '1.30': 312,
  '1.5': 360,
};

const STORAGE_KEY_RESUME_FORMAT = 'applyiq_format_settings_resume';
const STORAGE_KEY_LETTER_FORMAT = 'applyiq_format_settings_cover_letter';

export function getSavedFormatSettings(
  typeOrSettings: 'resume' | 'cover_letter' = 'resume',
  fallback?: ResumeFormatSettings
): ResumeFormatSettings {
  const type = typeOrSettings === 'cover_letter' ? 'cover_letter' : 'resume';
  const defaultFallback =
    fallback || (type === 'cover_letter' ? DEFAULT_COVER_LETTER_FORMAT_SETTINGS : DEFAULT_FORMAT_SETTINGS);
  if (typeof window === 'undefined') {
    return defaultFallback;
  }
  try {
    const key = type === 'cover_letter' ? STORAGE_KEY_LETTER_FORMAT : STORAGE_KEY_RESUME_FORMAT;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...defaultFallback,
          ...parsed,
        };
      }
    }
  } catch (_) {}
  return defaultFallback;
}

export function saveFormatSettings(
  arg1: ResumeFormatSettings | 'resume' | 'cover_letter',
  arg2?: ResumeFormatSettings | 'resume' | 'cover_letter'
): void {
  if (typeof window === 'undefined') return;
  let settings: ResumeFormatSettings | undefined;
  let type: 'resume' | 'cover_letter' = 'resume';

  if (typeof arg1 === 'string') {
    type = arg1 === 'cover_letter' ? 'cover_letter' : 'resume';
    settings = arg2 as ResumeFormatSettings;
  } else {
    settings = arg1;
    type = (arg2 as string) === 'cover_letter' ? 'cover_letter' : 'resume';
  }

  if (!settings) return;

  try {
    const key = type === 'cover_letter' ? STORAGE_KEY_LETTER_FORMAT : STORAGE_KEY_RESUME_FORMAT;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (_) {}
}
