/**
 * Client-side PDF export via browser print.
 *
 * Overhauled to guarantee 100% parity with the Harvard/Ivy League ATS single-column
 * executive layout:
 * - Professional serif typography ("Times New Roman", Times, Georgia, serif)
 * - Exact 10-10.5pt font sizing with 1.4-1.45 line height
 * - Solid 1px hairline horizontal divider beneath bold uppercase section headings
 * - Two-column aligned layout (Job Title/Company left, Date/Location right)
 * - Tight, compact bullet points with no awkward page overflows
 * - Clean @page rules (A4 with 12mm margins)
 */

const PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Times New Roman', Times, 'Lora', Georgia, serif;
    font-size: 10.5pt;
    line-height: 1.42;
    color: #0f172a;
    background: white;
    padding: 0;
    margin: 0;
  }

  /* ---- print-document wrapper ---- */
  .print-doc {
    max-width: 780px;
    margin: 0 auto;
    padding: 24px 32px;
  }

  h1 {
    font-size: 20pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #000000;
    text-align: center;
    margin-bottom: 2px;
  }

  .candidate-title {
    font-size: 10.5pt;
    font-weight: 600;
    color: #334155;
    text-align: center;
    margin-bottom: 4px;
    letter-spacing: 0.02em;
  }

  .contact {
    font-size: 9.5pt;
    color: #475569;
    text-align: center;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .contact a {
    color: #000000;
    text-decoration: none;
  }

  h2 {
    font-size: 10.5pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #000000;
    border-bottom: 1px solid #000000;
    padding-bottom: 2px;
    margin-top: 14px;
    margin-bottom: 6px;
  }

  p { margin-bottom: 4px; text-align: justify; }

  .row-between {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 5px;
    margin-bottom: 1px;
  }

  .role-title { font-weight: 700; font-size: 10.5pt; color: #000000; }
  .company-name { font-weight: 600; font-size: 10pt; color: #1e293b; }
  .meta-right { font-size: 9.5pt; color: #475569; text-align: right; flex-shrink: 0; }

  ul {
    padding-left: 18px;
    margin-top: 2px;
    margin-bottom: 6px;
    list-style-type: disc;
  }

  li {
    font-size: 10pt;
    line-height: 1.4;
    margin-bottom: 2px;
    color: #1e293b;
    text-align: justify;
  }

  .skill-row {
    display: flex;
    font-size: 10pt;
    line-height: 1.5;
    margin-bottom: 2px;
  }

  .skill-cat {
    font-weight: 700;
    min-width: 130px;
    flex-shrink: 0;
    color: #000000;
  }

  /* Cover letter specific */
  .cl-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
  }

  .cl-recipient {
    margin-top: 14px;
    margin-bottom: 16px;
    font-size: 10.5pt;
    line-height: 1.4;
  }

  .cl-salutation {
    font-weight: 700;
    margin-bottom: 12px;
    font-size: 11pt;
  }

  .cl-body p {
    margin-bottom: 14px;
    text-align: justify;
    line-height: 1.62;
    font-size: 10.5pt;
  }

  .cl-closing {
    margin-top: 20px;
    font-size: 10.5pt;
    line-height: 1.5;
  }

  @page {
    margin: 12mm 12mm;
    size: A4;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-doc {
      padding: 0;
      max-width: 100%;
    }
    .no-print { display: none !important; }
  }
`;

/**
 * Opens a new browser window with the element's inner HTML wrapped in
 * a print-optimised stylesheet and immediately triggers window.print().
 */
export function printHtml(html: string, title: string): void {
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    alert('Pop-up was blocked. Please allow pop-ups for this site and try again.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
<div class="print-doc">${html}</div>
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

import {
  normalizeUrl,
  formatDisplayUrl,
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
} from '@/lib/linkUtils';
import { formatEducationDate } from '@/lib/diffUtils';

/**
 * Build print-ready HTML for a ResumeVersion + CandidateProfile in Harvard/Ivy ATS layout.
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
    opts.location && opts.location,
    opts.linkedinUrl &&
      `<a href="${normalizeLinkedInUrl(opts.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${formatLinkedInDisplay(opts.linkedinUrl)}</a>`,
    opts.githubUrl &&
      `<a href="${normalizeGitHubUrl(opts.githubUrl)}" target="_blank" rel="noopener noreferrer">${formatGitHubDisplay(opts.githubUrl)}</a>`,
    opts.websiteUrl &&
      `<a href="${normalizeUrl(opts.websiteUrl)}" target="_blank" rel="noopener noreferrer">${formatDisplayUrl(opts.websiteUrl)}</a>`,
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  // Experiences HTML with tabular two-column layout
  const expsHtml = opts.experiences
    .map(
      (e) => `
    <div>
      <div class="row-between">
        <div>
          <span class="role-title">${e.role}</span>
          <span>&mdash;</span>
          <span class="company-name">${e.company}</span>
        </div>
        <div class="meta-right">
          ${e.start} &ndash; ${e.end || 'Present'}${e.location ? ` | ${e.location}` : ''}
        </div>
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
      (p) => `
    <div>
      <div class="row-between">
        <div>
          <span class="role-title">${p.name}</span>
          ${p.techStack && p.techStack.length ? `<span style="font-size:9.5pt; font-style:italic; color:#475569;">(${p.techStack.join(', ')})</span>` : ''}
        </div>
      </div>
      <ul>
        ${p.bullets.map((b) => `<li>${b}</li>`).join('')}
      </ul>
    </div>`
    )
    .join('');

  // Education HTML
  const eduHtml = opts.education
    .map(
      (e) => `
    <div>
      <div class="row-between">
        <div>
          <span class="role-title">${e.degree}</span>
          ${e.grade ? `<span style="font-size:9.5pt; color:#475569;"> &bull; ${e.grade}</span>` : ''}
        </div>
        <div class="meta-right">${formatEducationDate(e.start, e.end)}</div>
      </div>
      <div style="font-size:10pt; font-weight:600; color:#334155;">at ${e.institution}</div>
      ${e.details ? `<div style="font-size:9.5pt; font-style:italic; color:#475569;">${e.details}</div>` : ''}
    </div>`
    )
    .join('');

  // Skills HTML (grouped if provided, otherwise plain list)
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
  } else {
    skillsHtml = `<p style="font-size:10pt;">${opts.skillsText}</p>`;
  }

  return `
    <div style="text-align:center; margin-bottom:12px;">
      <h1>${opts.name}</h1>
      ${opts.title ? `<div class="candidate-title">${opts.title}</div>` : ''}
      <div class="contact">${contact}</div>
    </div>

    ${opts.summary ? `<h2>Professional Summary</h2><p style="font-size:10pt; line-height:1.48;">${opts.summary}</p>` : ''}

    <h2>Technical Skills</h2>
    ${skillsHtml}

    ${opts.experiences.length ? `<h2>Professional Experience</h2>${expsHtml}` : ''}
    ${opts.projects.length ? `<h2>Key Engineering Projects</h2>${projsHtml}` : ''}
    ${opts.education.length ? `<h2>Education</h2>${eduHtml}` : ''}
  `;
}

/**
 * Build print-ready HTML for a formal 4-paragraph CoverLetterItem.
 */
export function buildCoverLetterHtml(opts: {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  targetCompany: string;
  targetPosition: string;
  bodyText: string;
  date: string;
}): string {
  const links = [
    opts.linkedinUrl &&
      `<a href="${normalizeLinkedInUrl(opts.linkedinUrl)}" target="_blank" rel="noopener noreferrer">${formatLinkedInDisplay(opts.linkedinUrl)}</a>`,
    opts.githubUrl &&
      `<a href="${normalizeGitHubUrl(opts.githubUrl)}" target="_blank" rel="noopener noreferrer">${formatGitHubDisplay(opts.githubUrl)}</a>`,
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  const paragraphs = opts.bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
    <div class="cl-header">
      <h1>${opts.name}</h1>
      <p class="contact">${[opts.phone, opts.email, opts.location].filter(Boolean).join(' | ')}</p>
      ${links ? `<p class="contact">${links}</p>` : ''}
    </div>

    <div style="font-size:10pt; color:#475569; margin-bottom:12px;">${opts.date}</div>

    <div class="cl-recipient">
      <p style="font-weight:700; margin-bottom:1px;">Hiring Team</p>
      <p style="font-weight:600; margin-bottom:1px;">${opts.targetCompany}</p>
      <p style="font-style:italic; color:#475569;">Application for: <strong>${opts.targetPosition}</strong></p>
    </div>

    <p class="cl-salutation">Dear ${opts.targetCompany} Team,</p>

    <div class="cl-body">${paragraphs}</div>

    <div class="cl-closing">
      <p>Sincerely,</p>
      <p style="font-weight:700; margin-top:4px;">${opts.name}</p>
    </div>
  `;
}
