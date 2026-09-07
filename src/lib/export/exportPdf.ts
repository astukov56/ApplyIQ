/**
 * Client-side PDF export via browser print.
 *
 * Emulates Rezi's modern, minimalist ATS-optimized layout:
 * - Dynamic ATS font stacks (Calibri, Inter, Arial, Times New Roman, Garamond)
 * - Dynamic font sizing, line spacing, and margin presets
 * - Clean dark typography (#111827) with crisp hairline horizontal rules (#d1d5db)
 * - Two-column aligned layout (Role/Organization left, Date/Location right flush)
 * - Compact hanging-indent bullet points with tight line height
 * - Grouped inline technical skills
 */

import type { ResumeVersion, CandidateProfile, SkillItem } from '@/types';
import {
  ResumeFormatSettings,
  DEFAULT_FORMAT_SETTINGS,
  FONT_FAMILY_STACKS,
  MARGIN_CONFIG,
  LINE_SPACING_CSS,
  DENSITY_CONFIG,
} from '@/types/resumeFormat';
import {
  normalizeUrl,
  formatDisplayUrl,
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
} from '@/lib/linkUtils';
import { formatEducationDate } from '@/lib/diffUtils';

export function generatePrintStyles(formatSettings: ResumeFormatSettings = DEFAULT_FORMAT_SETTINGS): string {
  const fontStack = FONT_FAMILY_STACKS[formatSettings.fontFamily] || FONT_FAMILY_STACKS.Inter;
  const fontSize = formatSettings.fontSizePt || 10.5;
  const density = formatSettings.density || 'balanced';
  const densityConfig = DENSITY_CONFIG[density] || DENSITY_CONFIG.balanced;
  const lineHeight = densityConfig.lineHeight || LINE_SPACING_CSS[formatSettings.lineSpacing] || 1.25;
  const marginConfig = MARGIN_CONFIG[formatSettings.margin] || MARGIN_CONFIG.normal;

  return `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: ${fontStack};
    font-size: ${fontSize}pt;
    line-height: ${lineHeight};
    color: #111827;
    background: white;
    padding: 0;
    margin: 0;
  }

  /* ---- print-document wrapper ---- */
  .print-doc, .resume-sheet {
    width: 210mm;
    max-width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: ${marginConfig.paddingPreview};
    box-sizing: border-box;
  }

  h1 {
    font-size: ${Math.round(fontSize * 1.8)}pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #111827;
    text-align: center;
    margin-bottom: 2px;
  }

  .candidate-title {
    font-size: ${fontSize}pt;
    font-weight: 600;
    color: #374151;
    text-align: center;
    margin-bottom: 4px;
    letter-spacing: 0.02em;
  }

  .contact {
    font-size: ${Math.max(8.5, fontSize - 1.5)}pt;
    color: #4b5563;
    text-align: center;
    margin-bottom: 12px;
    line-height: 1.35;
  }

  .contact a {
    color: #111827;
    text-decoration: underline;
  }

  h2 {
    font-size: ${fontSize + 0.5}pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #111827;
    border-bottom: 1px solid #d1d5db;
    padding-bottom: 2px;
    margin-top: ${densityConfig.sectionMarginBottomPx}px;
    margin-bottom: ${Math.round(densityConfig.sectionMarginBottomPx * 0.5)}px;
  }

  p {
    margin-bottom: 4px;
    line-height: ${lineHeight};
  }

  .row-between {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 4px;
    margin-bottom: 1px;
  }

  .role-title {
    font-weight: 700;
    font-size: ${fontSize}pt;
    color: #111827;
  }

  .company-name {
    font-weight: 600;
    font-size: ${fontSize}pt;
    color: #374151;
    font-style: italic;
  }

  .meta-right {
    font-size: ${Math.max(8.5, fontSize - 1)}pt;
    color: #4b5563;
    text-align: right;
    flex-shrink: 0;
    margin-left: 8px;
  }

  ul {
    padding-left: 18px;
    margin-top: 2px;
    margin-bottom: 4px;
    list-style-type: disc;
  }

  li {
    font-size: ${fontSize}pt;
    line-height: ${lineHeight};
    margin-bottom: ${densityConfig.bulletMarginBottomPx}px;
    color: #1f2937;
    text-align: justify;
  }

  .skill-row {
    display: flex;
    align-items: baseline;
    font-size: ${fontSize}pt;
    line-height: ${lineHeight};
    margin-bottom: 3px;
    color: #111827;
  }

  .skill-cat {
    min-width: 140px;
    font-weight: 700;
    color: #111827;
    margin-right: 8px;
    flex-shrink: 0;
  }

  /* Cover letter specific */
  .cl-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #d1d5db;
  }

  .cl-recipient {
    margin-top: 14px;
    margin-bottom: 16px;
    font-size: ${fontSize}pt;
    line-height: 1.4;
  }

  .cl-salutation {
    font-weight: 700;
    margin-bottom: 12px;
    font-size: ${fontSize + 0.5}pt;
  }

  .cl-body p {
    margin-bottom: 14px;
    text-align: justify;
    line-height: ${Math.max(1.4, lineHeight * 1.15)};
    font-size: ${fontSize}pt;
  }

  .cl-closing {
    margin-top: 20px;
    font-size: ${fontSize}pt;
    line-height: 1.5;
  }

  @page {
    size: A4 portrait;
    margin: 0; /* Strips browser default header (title, date) & footer (URL, page numbers) */
  }

  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Apply page padding directly to the printable sheet instead of the page */
    .print-doc, .resume-sheet {
      padding: 12mm 15mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      align-content: flex-start !important;
    }

    .print-doc > div, .resume-sheet > div {
      justify-content: flex-start !important;
      align-content: flex-start !important;
      height: auto !important;
    }

    /* Ensure sections never push a solitary break */
    section, .resume-section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .no-print { display: none !important; }
  }
`;
}

/**
 * Opens a new browser window with the element's inner HTML wrapped in
 * a print-optimised stylesheet and immediately triggers window.print().
 */
export function printHtml(
  html: string,
  title: string,
  formatSettings: ResumeFormatSettings = DEFAULT_FORMAT_SETTINGS
): void {
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    alert('Pop-up was blocked. Please allow pop-ups for this site and try again.');
    return;
  }

  const printStyles = generatePrintStyles(formatSettings);

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${printStyles}</style>
</head>
<body>
<div class="print-doc resume-sheet">${html}</div>
<script>
  window.onload = function() {
    window.print();
    window.onafterprint = function() { window.close(); };
  };
</scr${'ipt'}>
</body>
</html>`);
  win.document.close();
}

/**
 * Build print-ready HTML for a ResumeVersion + CandidateProfile in Rezi ATS layout.
 */
export function buildResumeHtml(opts: {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  summary: string;
  skillsText: string;
  skillsGrouped?: Record<string, string[]>;
  experiences: Array<{
    role: string;
    company: string;
    start: string;
    end: string;
    location: string;
    highlights: string[];
  }>;
  projects: Array<{
    name: string;
    techStack?: string[];
    bullets: string[];
    githubUrl?: string;
    liveUrl?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    start: string;
    end: string;
    grade?: string;
    details?: string;
  }>;
}): string {
  const contact = [
    opts.phone && opts.phone,
    opts.email && `<a href="mailto:${opts.email}">${opts.email}</a>`,
    opts.linkedinUrl &&
      `<a href="${normalizeLinkedInUrl(opts.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${formatLinkedInDisplay(opts.linkedinUrl)}</a>`,
    opts.githubUrl &&
      `<a href="${normalizeGitHubUrl(opts.githubUrl)}" target="_blank" rel="noopener noreferrer">${formatGitHubDisplay(opts.githubUrl)}</a>`,
    opts.websiteUrl &&
      `<a href="${normalizeUrl(opts.websiteUrl)}" target="_blank" rel="noopener noreferrer">${formatDisplayUrl(opts.websiteUrl)}</a>`,
    opts.location && opts.location,
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  // Experiences HTML with tabular two-column layout
  const expsHtml = opts.experiences
    .map(
      (e) => `
    <div style="margin-bottom: 6px;">
      <div class="row-between">
        <span class="role-title">${e.role}</span>
        <span class="meta-right">${e.start} &ndash; ${e.end || 'Present'}</span>
      </div>
      <div class="row-between" style="margin-top: 1px;">
        <span class="company-name">${e.company}</span>
        <span class="meta-right">${e.location || ''}</span>
      </div>
      <ul>
        ${e.highlights.map((h) => `<li>${h}</li>`).join('')}
      </ul>
    </div>`
    )
    .join('');

  // Projects HTML
  const projsHtml = opts.projects
    .map(
      (p) => {
        const links: string[] = [];
        if (p.githubUrl) {
          links.push(`<a href="${normalizeUrl(p.githubUrl)}" target="_blank" rel="noopener noreferrer">Code</a>`);
        }
        if (p.liveUrl) {
          links.push(`<a href="${normalizeUrl(p.liveUrl)}" target="_blank" rel="noopener noreferrer">Live Demo</a>`);
        }

        return `
    <div style="margin-bottom: 6px;">
      <div class="row-between">
        <div>
          <span class="role-title">${p.name}</span>
          ${p.techStack && p.techStack.length ? `<span style="font-size:9pt; font-style:italic; color:#4b5563;"> &nbsp;|&nbsp; ${p.techStack.join(', ')}</span>` : ''}
        </div>
        ${links.length ? `<span class="meta-right">${links.join(' &nbsp;|&nbsp; ')}</span>` : ''}
      </div>
      <ul>
        ${p.bullets.map((b) => `<li>${b}</li>`).join('')}
      </ul>
    </div>`;
      }
    )
    .join('');

  // Education HTML
  const eduHtml = opts.education
    .map(
      (e) => `
    <div style="margin-bottom: 4px;">
      <div class="row-between">
        <span class="role-title">${e.degree}</span>
        <span class="meta-right">${formatEducationDate(e.start, e.end)}</span>
      </div>
      <div class="row-between" style="margin-top: 1px;">
        <span class="company-name">${e.institution}</span>
        <span class="meta-right">${e.grade ? `GPA/Grade: ${e.grade}` : ''}</span>
      </div>
      ${e.details ? `<div style="font-size:9pt; color:#4b5563; margin-top: 1px;">${e.details}</div>` : ''}
    </div>`
    )
    .join('');

  // Skills HTML (Grouped inline with bold category label matching UI)
  let skillsHtml = '';
  if (opts.skillsGrouped && Object.keys(opts.skillsGrouped).length > 0) {
    skillsHtml = Object.entries(opts.skillsGrouped)
      .map(
        ([cat, items]) => `
      <div class="skill-row">
        <span class="skill-cat">${cat}:</span>
        <span>${items.join(', ')}</span>
      </div>`
      )
      .join('');
  } else if (opts.skillsText) {
    skillsHtml = `<p>${opts.skillsText}</p>`;
  }

  return `
    <div style="text-align:center; margin-bottom:10px;">
      <h1>${opts.name}</h1>
      ${opts.title ? `<div class="candidate-title">${opts.title}</div>` : ''}
      <div class="contact">${contact}</div>
    </div>

    ${opts.summary ? `<h2>Professional Summary</h2><p style="text-align:justify;">${opts.summary}</p>` : ''}

    ${skillsHtml ? `<h2>Technical Skills</h2>${skillsHtml}` : ''}

    ${opts.experiences && opts.experiences.length ? `<h2>Experience</h2>${expsHtml}` : ''}

    ${opts.projects && opts.projects.length ? `<h2>Projects</h2>${projsHtml}` : ''}

    ${opts.education && opts.education.length ? `<h2>Education</h2>${eduHtml}` : ''}
  `;
}

/**
 * Build print-ready HTML for a CoverLetterItem + CandidateProfile with Rezi Minimalist Design.
 */
export function buildCoverLetterHtml(opts: {
  name: string;
  title?: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  targetCompany: string;
  targetPosition: string;
  targetLocation?: string;
  recipientName?: string;
  subject?: string;
  opening?: string;
  bodyText: string;
  closing?: string;
  date: string;
}): string {
  const contactParts: string[] = [
    opts.phone,
    opts.email && `<a href="mailto:${opts.email}">${opts.email}</a>`,
    opts.location,
    opts.linkedinUrl &&
      `<a href="${normalizeLinkedInUrl(opts.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${formatLinkedInDisplay(opts.linkedinUrl)}</a>`,
    opts.githubUrl &&
      `<a href="${normalizeGitHubUrl(opts.githubUrl)}" target="_blank" rel="noopener noreferrer">${formatGitHubDisplay(opts.githubUrl)}</a>`,
    opts.websiteUrl &&
      `<a href="${normalizeUrl(opts.websiteUrl)}" target="_blank" rel="noopener noreferrer">${formatDisplayUrl(opts.websiteUrl)}</a>`,
  ].filter(Boolean) as string[];

  const contact = contactParts.join(' &nbsp;|&nbsp; ');

  const bodyParagraphs = opts.bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const subject = opts.subject || `Re: Application for ${opts.targetPosition} – ${opts.targetCompany}`;
  const opening = opts.opening || `Dear ${opts.targetCompany} Team,`;
  const closing = opts.closing || `Sincerely,<br/><br/>${opts.name}`;

  return `
    <div class="cl-header">
      <h1>${opts.name}</h1>
      ${opts.title ? `<div class="candidate-title">${opts.title}</div>` : ''}
      <div class="contact" style="margin-bottom:0;">${contact}</div>
    </div>

    <div style="color:#64748b; font-size:9.5pt; margin-bottom:14px;">${opts.date}</div>

    <div class="cl-recipient">
      <strong>${opts.recipientName || 'Hiring Team'}</strong><br/>
      ${opts.targetCompany}${opts.targetLocation ? `<br/>${opts.targetLocation}` : ''}<br/>
      <strong style="display:inline-block; margin-top:8px;">${subject}</strong>
    </div>

    <div class="cl-salutation">${opening}</div>

    <div class="cl-body">
      ${bodyParagraphs}
    </div>

    <div class="cl-closing">
      ${closing.replace(/\n/g, '<br/>')}
      ${opts.title ? `<div style="font-size:9.5pt; color:#4b5563; margin-top:2px;">${opts.title}</div>` : ''}
    </div>
  `;
}

/**
 * Extract canonical skill categories matching the UI:
 * Languages, Frameworks, Cloud & DB, Tools & Other
 */
export function extractGroupedSkills(version: {
  skills?: Array<SkillItem | string>;
  tailoredSkills?:
    | {
        languages?: string[];
        frameworks?: string[];
        cloudAndData?: string[];
        tools?: string[];
      }
    | string[];
}): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  const addSkill = (category: string, name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    if (!result[category]) result[category] = [];
    if (!result[category].includes(trimmed)) {
      result[category].push(trimmed);
    }
  };

  // 1. Structured tailoredSkills (object format)
  if (
    version.tailoredSkills &&
    typeof version.tailoredSkills === 'object' &&
    !Array.isArray(version.tailoredSkills)
  ) {
    const ts = version.tailoredSkills;
    if (Array.isArray(ts.languages)) ts.languages.forEach((s) => addSkill('Languages', s));
    if (Array.isArray(ts.frameworks)) ts.frameworks.forEach((s) => addSkill('Frameworks', s));
    if (Array.isArray(ts.cloudAndData)) ts.cloudAndData.forEach((s) => addSkill('Cloud & DB', s));
    if (Array.isArray(ts.tools)) ts.tools.forEach((s) => addSkill('Tools & Other', s));
  }

  // 2. Structured skills array (SkillItem or strings)
  if (Array.isArray(version.skills) && version.skills.length > 0) {
    for (const item of version.skills) {
      if (typeof item === 'string') {
        addSkill('Core Technologies', item);
      } else if (item && typeof item === 'object') {
        let cat: string = item.category || 'Tools & Other';
        if (cat === 'Frameworks & Libraries') cat = 'Frameworks';
        if (cat === 'Cloud & Databases' || cat === 'Cloud & Data') cat = 'Cloud & DB';
        if (cat === 'Developer Tools' || cat === 'Tools') cat = 'Tools & Other';
        addSkill(cat, item.name);
      }
    }
  }

  // 3. Flat tailoredSkills array
  if (Array.isArray(version.tailoredSkills) && version.tailoredSkills.length > 0) {
    for (const s of version.tailoredSkills) {
      if (typeof s === 'string') {
        addSkill('Core Technologies', s);
      }
    }
  }

  return result;
}

/**
 * High-level export function for ResumeVersion + CandidateProfile to PDF.
 * Guarantees zero browser print headers/footers and preserved category-grouped skills.
 */
export function exportResumeVersionPdf(
  version: ResumeVersion,
  profile: CandidateProfile,
  formatSettings: ResumeFormatSettings = DEFAULT_FORMAT_SETTINGS
): void {
  const grouped = extractGroupedSkills(version);
  const skillsText = Object.values(grouped).flat().join(', ');

  const html = buildResumeHtml({
    name: profile.name,
    title: profile.title,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    websiteUrl: profile.websiteUrl,
    summary: version.summary,
    skillsText,
    skillsGrouped: grouped,
    experiences: (version.experiences || []).map((e) => ({
      role: e.role,
      company: e.company,
      start: e.startDate,
      end: e.endDate,
      location: e.location,
      highlights: e.highlights,
    })),
    projects: ((version.tailoredProjects as any) ?? version.projects?.map((p) => ({
      name: p.title,
      bullets: p.highlights || [p.description],
      techStack: p.techStack,
      githubUrl: p.githubUrl,
      liveUrl: p.liveUrl,
    })) ?? []),
    education: (version.education || []).map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      start: edu.startDate,
      end: edu.endDate,
      grade: edu.grade,
      details: edu.details,
    })),
  });

  printHtml(html, `${profile.name} - ${version.title || 'Resume'}`, formatSettings);
}

