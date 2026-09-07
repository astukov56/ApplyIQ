/**
 * Client-side DOCX export utilities.
 * Rezi-Style ATS-Optimized Minimalist Layout:
 * - Native paragraph borders (0.5pt / 6-size hairline rules in subtle gray #CCCCCC)
 * - Right-aligned tab-stops (TabStopType.RIGHT) for clean date/location alignment without invisible tables
 * - Dynamic font family (Calibri, Inter, Arial, Times New Roman, Garamond)
 * - Dynamic base font size, margins, and line spacing
 * - Centered candidate name & compact contact row with pipe separators
 * - Grouped inline technical skills
 * - Clean hanging-indent bullet points
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ExternalHyperlink,
  UnderlineType,
  TabStopType,
  Tab,
} from 'docx';
import type { ResumeVersion, CoverLetterItem, CandidateProfile } from '@/types';
import {
  ResumeFormatSettings,
  DEFAULT_FORMAT_SETTINGS,
  MARGIN_CONFIG,
  LINE_SPACING_DOCX,
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
import { extractGroupedSkills } from './exportPdf';

// ---------------------------------------------------------------------------
// Helpers & Styling Constants
// ---------------------------------------------------------------------------

const COLOR_BLACK = '111827';
const COLOR_MUTED = '4B5563';
const COLOR_LINK = '111827'; // Clean dark link with underline for maximum ATS readability

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\-. ]/g, '').trim() || 'export';
}

function sectionHeading(
  title: string,
  fontFamily: string,
  headingHalfPts: number,
  spacingBefore: number = 140
): Paragraph {
  return new Paragraph({
    text: title.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    border: {
      bottom: {
        color: 'D1D5DB', // Crisp subtle hairline rule (#D1D5DB / 0.5pt)
        space: 2,
        style: BorderStyle.SINGLE,
        size: 4, // 0.5pt clean subtle hairline rule
      },
    },
    spacing: { before: spacingBefore, after: 100 },
    run: {
      bold: true,
      size: headingHalfPts,
      font: fontFamily,
      color: COLOR_BLACK,
    },
  });
}

function bulletPoint(
  text: string,
  fontFamily: string,
  bodyHalfPts: number,
  lineSpacingTwips: number,
  spacingAfter: number = 40
): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { before: 0, after: spacingAfter, line: lineSpacingTwips },
    run: {
      size: bodyHalfPts,
      font: fontFamily,
      color: COLOR_BLACK,
    },
  });
}

/**
 * Creates a two-column aligned paragraph using a right-aligned tab-stop instead of an invisible table.
 */
function twoColumnParagraph({
  leftRuns,
  rightRuns,
  tabPosition,
  spacingBefore = 40,
  spacingAfter = 10,
  lineSpacingTwips,
}: {
  leftRuns: Array<TextRun | ExternalHyperlink>;
  rightRuns: Array<TextRun | ExternalHyperlink>;
  tabPosition: number;
  spacingBefore?: number;
  spacingAfter?: number;
  lineSpacingTwips?: number;
}): Paragraph {
  return new Paragraph({
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: tabPosition,
      },
    ],
    children: [
      ...leftRuns,
      new TextRun({ children: [new Tab()] }),
      ...rightRuns,
    ],
    spacing: {
      before: spacingBefore,
      after: spacingAfter,
      line: lineSpacingTwips,
    },
  });
}

// ---------------------------------------------------------------------------
// Export ResumeVersion as .docx (Rezi ATS Minimalist Format)
// ---------------------------------------------------------------------------
export async function exportResumeVersionDocx(
  version: ResumeVersion,
  profile: CandidateProfile,
  formatSettings: ResumeFormatSettings = DEFAULT_FORMAT_SETTINGS
): Promise<void> {
  const docElements: Array<Paragraph> = [];

  const font = formatSettings.fontFamily || 'Inter';
  const baseSize = Math.round(formatSettings.fontSizePt * 2); // In half-points (e.g. 10.5pt = 21)
  const nameSize = Math.round(formatSettings.fontSizePt * 1.8 * 2); // ~38 half-points (19pt)
  const titleSize = Math.round((formatSettings.fontSizePt + 0.5) * 2); // ~22 half-points (11pt)
  const headingSize = Math.round((formatSettings.fontSizePt + 1) * 2); // ~23 half-points (11.5pt)
  const subSize = Math.round((formatSettings.fontSizePt - 1) * 2); // ~19 half-points (9.5pt)
  const density = formatSettings.density || 'balanced';
  const densityConfig = DENSITY_CONFIG[density] || DENSITY_CONFIG.balanced;
  const lineSpacing = LINE_SPACING_DOCX[formatSettings.lineSpacing] || 276;
  const marginTwips = MARGIN_CONFIG[formatSettings.margin]?.twips || 1080;

  // Standard A4 width = 11906 twips, height = 16838 twips.
  // Right tab position is flush with right page margin
  const rightTabPosition = Math.max(7500, 11906 - marginTwips * 2);
  const sectionSpacingBefore = densityConfig.sectionMarginDocxTwips || 140;
  const bulletSpacingAfter = densityConfig.bulletMarginDocxTwips || 40;

  // =========================================================================
  // 1. HEADER (Candidate Name, Title, and Compact Contact Row)
  // =========================================================================
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: (profile.name || 'Candidate Name').toUpperCase(),
          bold: true,
          size: nameSize,
          font,
          color: COLOR_BLACK,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 20 },
    })
  );

  if (profile.title) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: profile.title,
            bold: true,
            size: titleSize,
            font,
            color: COLOR_MUTED,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
      })
    );
  }

  // Build clickable contact elements with pipe separators
  const contactRuns: Array<TextRun | ExternalHyperlink> = [];

  const addContactItem = (element: TextRun | ExternalHyperlink) => {
    if (contactRuns.length > 0) {
      contactRuns.push(
        new TextRun({
          text: '  |  ',
          size: subSize,
          font,
          color: '9CA3AF',
        })
      );
    }
    contactRuns.push(element);
  };

  if (profile.phone) {
    addContactItem(
      new TextRun({
        text: profile.phone,
        size: subSize,
        font,
        color: COLOR_MUTED,
      })
    );
  }

  if (profile.email) {
    addContactItem(
      new ExternalHyperlink({
        link: `mailto:${profile.email}`,
        children: [
          new TextRun({
            text: profile.email,
            size: subSize,
            font,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  if (profile.linkedinUrl) {
    addContactItem(
      new ExternalHyperlink({
        link: normalizeLinkedInUrl(profile.linkedinUrl),
        children: [
          new TextRun({
            text: formatLinkedInDisplay(profile.linkedinUrl),
            size: subSize,
            font,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  if (profile.githubUrl) {
    addContactItem(
      new ExternalHyperlink({
        link: normalizeGitHubUrl(profile.githubUrl),
        children: [
          new TextRun({
            text: formatGitHubDisplay(profile.githubUrl),
            size: subSize,
            font,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  if (profile.websiteUrl) {
    const raw = profile.websiteUrl;
    addContactItem(
      new ExternalHyperlink({
        link: normalizeUrl(raw),
        children: [
          new TextRun({
            text: formatDisplayUrl(raw),
            size: subSize,
            font,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  if (profile.location) {
    addContactItem(
      new TextRun({
        text: profile.location,
        size: subSize,
        font,
        color: COLOR_MUTED,
      })
    );
  }

  if (contactRuns.length > 0) {
    docElements.push(
      new Paragraph({
        children: contactRuns,
        alignment: AlignmentType.CENTER,
        spacing: { before: 10, after: 90 },
      })
    );
  }

  // =========================================================================
  // 2. PROFESSIONAL SUMMARY
  // =========================================================================
  const summaryText = version.summary || profile.summary;
  if (summaryText && summaryText.trim()) {
    docElements.push(sectionHeading('Professional Summary', font, headingSize, sectionSpacingBefore));
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: summaryText.trim(),
            size: baseSize,
            font,
            color: COLOR_BLACK,
          }),
        ],
        spacing: { before: 20, after: 60, line: lineSpacing },
      })
    );
  }

  // =========================================================================
  // 3. TECHNICAL SKILLS (Grouped Inline with Bold Labels)
  // Preserves categorized UI structure: Languages, Frameworks, Cloud & DB, Tools & Other
  // =========================================================================
  const categories = extractGroupedSkills(version);

  if (Object.keys(categories).length > 0) {
    docElements.push(sectionHeading('Technical Skills', font, headingSize, sectionSpacingBefore));

    for (const [catName, skillsList] of Object.entries(categories)) {
      if (!skillsList || skillsList.length === 0) continue;
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${catName}: `,
              bold: true,
              size: baseSize,
              font,
              color: COLOR_BLACK,
            }),
            new TextRun({
              text: skillsList.join(', '),
              size: baseSize,
              font,
              color: COLOR_BLACK,
            }),
          ],
          spacing: { before: 15, after: 15, line: lineSpacing },
        })
      );
    }
  }

  // =========================================================================
  // 4. WORK EXPERIENCE (Organization/Title left, Date/Location right via Tab-Stops)
  // =========================================================================
  if (version.experiences && version.experiences.length > 0) {
    docElements.push(sectionHeading('Experience', font, headingSize, sectionSpacingBefore));

    for (const exp of version.experiences) {
      const dateText = exp.endDate
        ? `${exp.startDate} – ${exp.endDate}`
        : exp.startDate || '';

      // Line 1: Role (Bold) on left, Date on right
      docElements.push(
        twoColumnParagraph({
          leftRuns: [
            new TextRun({
              text: exp.role || 'Role Title',
              bold: true,
              size: baseSize,
              font,
              color: COLOR_BLACK,
            }),
          ],
          rightRuns: [
            new TextRun({
              text: dateText,
              bold: true,
              size: baseSize,
              font,
              color: COLOR_MUTED,
            }),
          ],
          tabPosition: rightTabPosition,
          spacingBefore: 40,
          spacingAfter: 10,
          lineSpacingTwips: lineSpacing,
        })
      );

      // Line 2: Company (Semibold / Italic) on left, Location on right
      docElements.push(
        twoColumnParagraph({
          leftRuns: [
            new TextRun({
              text: exp.company || 'Company Name',
              italics: true,
              size: baseSize,
              font,
              color: COLOR_MUTED,
            }),
          ],
          rightRuns: [
            new TextRun({
              text: exp.location || '',
              italics: true,
              size: subSize,
              font,
              color: COLOR_MUTED,
            }),
          ],
          tabPosition: rightTabPosition,
          spacingBefore: 0,
          spacingAfter: 20,
          lineSpacingTwips: lineSpacing,
        })
      );

      // Bullets
      for (const highlight of exp.highlights || []) {
        if (!highlight.trim()) continue;
        docElements.push(bulletPoint(highlight, font, baseSize, lineSpacing, bulletSpacingAfter));
      }
    }
  }

  // =========================================================================
  // 4. PROJECTS
  // =========================================================================
  const projects =
    version.tailoredProjects && version.tailoredProjects.length > 0
      ? version.tailoredProjects
      : (version.projects || []).map((p) => ({
          name: p.title,
          techStack: p.techStack,
          githubUrl: p.githubUrl,
          liveUrl: p.liveUrl,
          bullets: [p.description],
        }));

  if (projects.length > 0) {
    docElements.push(sectionHeading('Projects', font, headingSize, sectionSpacingBefore));

    for (const proj of projects) {
      const leftParts: Array<TextRun | ExternalHyperlink> = [
        new TextRun({
          text: proj.name,
          bold: true,
          size: baseSize,
          font,
          color: COLOR_BLACK,
        }),
      ];

      const tech = (proj as { techStack?: string[] }).techStack;
      if (tech && tech.length > 0) {
        leftParts.push(
          new TextRun({
            text: `  |  ${tech.join(', ')}`,
            italics: true,
            size: subSize,
            font,
            color: COLOR_MUTED,
          })
        );
      }

      const pLinks: Array<TextRun | ExternalHyperlink> = [];
      const pGithub = (proj as { githubUrl?: string }).githubUrl;
      const pLive = (proj as { liveUrl?: string }).liveUrl;

      if (pGithub) {
        pLinks.push(
          new ExternalHyperlink({
            link: normalizeUrl(pGithub),
            children: [
              new TextRun({
                text: 'Code',
                size: subSize,
                font,
                color: COLOR_LINK,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          })
        );
      }

      if (pLive) {
        if (pLinks.length > 0) {
          pLinks.push(new TextRun({ text: '  |  ', size: subSize, font, color: '9CA3AF' }));
        }
        pLinks.push(
          new ExternalHyperlink({
            link: normalizeUrl(pLive),
            children: [
              new TextRun({
                text: 'Live Demo',
                size: subSize,
                font,
                color: COLOR_LINK,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          })
        );
      }

      docElements.push(
        twoColumnParagraph({
          leftRuns: leftParts,
          rightRuns: pLinks,
          tabPosition: rightTabPosition,
          spacingBefore: 40,
          spacingAfter: 15,
          lineSpacingTwips: lineSpacing,
        })
      );

      for (const b of proj.bullets || []) {
        if (!b?.trim()) continue;
        docElements.push(bulletPoint(b, font, baseSize, lineSpacing, bulletSpacingAfter));
      }
    }
  }

  // =========================================================================
  // 5. EDUCATION
  // =========================================================================
  if (version.education && version.education.length > 0) {
    docElements.push(sectionHeading('Education', font, headingSize, sectionSpacingBefore));

    for (const edu of version.education) {
      const dateDisplay = formatEducationDate(edu.startDate, edu.endDate);
      const degreeText = edu.fieldOfStudy
        ? `${edu.degree} in ${edu.fieldOfStudy}`
        : edu.degree;

      // Line 1: Degree & Field (Bold) on left, Date on right
      docElements.push(
        twoColumnParagraph({
          leftRuns: [
            new TextRun({
              text: degreeText,
              bold: true,
              size: baseSize,
              font,
              color: COLOR_BLACK,
            }),
          ],
          rightRuns: [
            new TextRun({
              text: dateDisplay,
              bold: true,
              size: baseSize,
              font,
              color: COLOR_MUTED,
            }),
          ],
          tabPosition: rightTabPosition,
          spacingBefore: 40,
          spacingAfter: 10,
          lineSpacingTwips: lineSpacing,
        })
      );

      // Line 2: Institution on left, Grade / Details on right
      docElements.push(
        twoColumnParagraph({
          leftRuns: [
            new TextRun({
              text: edu.institution,
              italics: true,
              size: baseSize,
              font,
              color: COLOR_MUTED,
            }),
          ],
          rightRuns: [
            new TextRun({
              text: edu.grade ? `GPA/Grade: ${edu.grade}` : '',
              italics: true,
              size: subSize,
              font,
              color: COLOR_MUTED,
            }),
          ],
          tabPosition: rightTabPosition,
          spacingBefore: 0,
          spacingAfter: 20,
          lineSpacingTwips: lineSpacing,
        })
      );
    }
  }

  // =========================================================================
  // Build and Trigger Download
  // =========================================================================
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font, size: baseSize, color: COLOR_BLACK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: marginTwips,
              right: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
            },
          },
        },
        children: docElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeName(version.title || profile.name || 'Resume')}.docx`);
}

/** Alias for exportResumeVersionDocx specifically for tailored snapshots */
export const exportTailoredResumeDocx = exportResumeVersionDocx;

// ---------------------------------------------------------------------------
// Export CoverLetter as .docx with Rezi Minimalist Design
// ---------------------------------------------------------------------------
export type CoverLetterExportInput =
  | CoverLetterItem
  | {
      id?: string;
      targetCompany?: string;
      targetPosition?: string;
      targetLocation?: string;
      recipientName?: string;
      subject?: string;
      opening?: string;
      bodyText?: string;
      body?: string;
      closing?: string;
      dateGenerated?: string;
    };

export async function exportCoverLetterDocx(
  letter: CoverLetterExportInput,
  profile: CandidateProfile,
  formatSettings: ResumeFormatSettings = DEFAULT_FORMAT_SETTINGS
): Promise<void> {
  const rawDate = ('dateGenerated' in letter && letter.dateGenerated) || Date.now();
  const today = new Date(rawDate).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const font = formatSettings.fontFamily || 'Inter';
  const baseSize = Math.round(formatSettings.fontSizePt * 2);
  const nameSize = Math.round(formatSettings.fontSizePt * 1.8 * 2);
  const subSize = Math.round(Math.max(8.5, formatSettings.fontSizePt - 1.5) * 2);
  const marginTwips = MARGIN_CONFIG[formatSettings.margin]?.twips || 1080;
  const lineSpacing = LINE_SPACING_DOCX[formatSettings.lineSpacing] || 300;

  // Contact items row
  const contactParts: string[] = [
    profile.phone,
    profile.email,
    profile.location,
    profile.linkedinUrl ? formatLinkedInDisplay(profile.linkedinUrl) : '',
    profile.githubUrl ? formatGitHubDisplay(profile.githubUrl) : '',
    profile.websiteUrl ? formatDisplayUrl(profile.websiteUrl) : '',
  ].filter(Boolean);

  const headerParagraphs: Paragraph[] = [
    // 1. Full Candidate Name
    new Paragraph({
      children: [
        new TextRun({
          text: (profile.name || 'Candidate Name').toUpperCase(),
          bold: true,
          size: nameSize,
          font,
          color: COLOR_BLACK,
          characterSpacing: 40,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    }),
  ];

  // Optional candidate professional title
  if (profile.title) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: profile.title,
            bold: true,
            size: subSize + 2,
            font,
            color: COLOR_MUTED,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
      })
    );
  }

  // Contact row with hairline bottom rule matching Rezi design
  headerParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactParts.join('  |  '),
          size: subSize,
          font,
          color: COLOR_MUTED,
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6, // 0.75 pt hairline
          color: 'CCCCCC',
        },
      },
      spacing: { after: 220 },
    })
  );

  const targetCompany = letter.targetCompany || 'The Hiring Organization';
  const targetPosition = letter.targetPosition || 'Position';
  const targetLocation = 'targetLocation' in letter ? letter.targetLocation : '';
  const recipient = ('recipientName' in letter && letter.recipientName) || 'Hiring Team';
  const subject =
    ('subject' in letter && letter.subject) ||
    `Re: Application for ${targetPosition} – ${targetCompany}`;
  const opening =
    ('opening' in letter && letter.opening) || `Dear ${targetCompany} Team,`;

  const metaParagraphs: Paragraph[] = [
    // Date
    new Paragraph({
      children: [
        new TextRun({
          text: today,
          size: subSize + 1,
          font,
          color: COLOR_MUTED,
        }),
      ],
      spacing: { after: 120 },
    }),

    // Recipient & Company Block
    new Paragraph({
      children: [
        new TextRun({
          text: `${recipient}\n${targetCompany}${targetLocation ? `\n${targetLocation}` : ''}`,
          bold: true,
          size: baseSize,
          font,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { after: 120 },
    }),

    // Bound Subject Line
    new Paragraph({
      children: [
        new TextRun({
          text: subject,
          bold: true,
          size: baseSize,
          font,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { after: 140 },
    }),

    // Salutation
    new Paragraph({
      children: [
        new TextRun({
          text: opening,
          bold: true,
          size: baseSize,
          font,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { after: 120 },
    }),
  ];

  // Body content: normalize between bodyText and body
  const rawBody = ('bodyText' in letter && letter.bodyText) || ('body' in letter && letter.body) || '';
  const bodyParagraphs = rawBody
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const contentParagraphs: Paragraph[] = bodyParagraphs.map(
    (bp) =>
      new Paragraph({
        children: [
          new TextRun({
            text: bp,
            size: baseSize,
            font,
            color: COLOR_BLACK,
          }),
        ],
        spacing: { before: 40, after: 120, line: lineSpacing },
        alignment: AlignmentType.LEFT,
      })
  );

  // Sign-off Block
  const closingText =
    ('closing' in letter && letter.closing) || `Sincerely,\n${profile.name || 'Candidate'}`;

  const closingParagraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: closingText,
          size: baseSize,
          font,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { before: 140, after: 30 },
    }),
  ];

  if (profile.title) {
    closingParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: profile.title,
            size: subSize,
            font,
            color: COLOR_MUTED,
          }),
        ],
        spacing: { before: 10 },
      })
    );
  }

  const allParagraphs: Paragraph[] = [
    ...headerParagraphs,
    ...metaParagraphs,
    ...contentParagraphs,
    ...closingParagraphs,
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font, size: baseSize, color: COLOR_BLACK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: marginTwips,
              right: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
            },
          },
        },
        children: allParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const companySlug = safeName(targetCompany || 'Company');
  downloadBlob(blob, `Cover-Letter-${companySlug}-${safeName(profile.name || 'Candidate')}.docx`);
}

