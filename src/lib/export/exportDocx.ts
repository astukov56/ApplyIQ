/**
 * Client-side DOCX export utilities.
 * Completely overhauled to strictly follow the standard "Jake's Resume" ATS format:
 * - Bold 20-22pt centered candidate name
 * - Centered contact line with pipe separators & clickable hyperlinks
 * - UPPERCASE bold 11pt section headings with subtle full-width bottom border lines
 * - Two-column aligned layout (Company/Role left, Date/Location right)
 * - Structured Technical Skills with bold category labels on the left followed by colon-separated comma lists
 * - Compact, professional bullet points with tight line spacing
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ExternalHyperlink,
  UnderlineType,
} from 'docx';
import type { ResumeVersion, CoverLetterItem, CandidateProfile } from '@/types';
import {
  normalizeUrl,
  formatDisplayUrl,
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
} from '@/lib/linkUtils';
import { formatEducationDate } from '@/lib/diffUtils';

// ---------------------------------------------------------------------------
// Helpers & Styling Constants
// ---------------------------------------------------------------------------

const FONT_FAMILY = 'Times New Roman';
const COLOR_BLACK = '000000';
const COLOR_GRAY = '444444';
const COLOR_LINK = '0047AB'; // Professional blue for clickable links

// No-border table border definition for 2-column header rows
const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    text: title.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    border: {
      bottom: {
        color: '000000',
        space: 2,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 180, after: 60 },
    run: {
      bold: true,
      size: 22, // 11pt
      font: FONT_FAMILY,
      color: COLOR_BLACK,
    },
  });
}

function bulletPoint(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { before: 15, after: 25 },
    run: {
      size: 20, // 10pt
      font: FONT_FAMILY,
      color: COLOR_BLACK,
    },
  });
}

function twoColumnRow(
  leftChildren: Array<TextRun | ExternalHyperlink>,
  rightChildren: Array<TextRun | ExternalHyperlink>,
  spacingBefore = 60,
  spacingAfter = 20
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                children: leftChildren,
                spacing: { before: spacingBefore, after: spacingAfter },
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                children: rightChildren,
                alignment: AlignmentType.RIGHT,
                spacing: { before: spacingBefore, after: spacingAfter },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

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

// ---------------------------------------------------------------------------
// Export ResumeVersion as .docx (Jake's Resume ATS Format)
// ---------------------------------------------------------------------------
export async function exportResumeVersionDocx(
  version: ResumeVersion,
  profile: CandidateProfile
): Promise<void> {
  const docElements: Array<Paragraph | Table> = [];

  // =========================================================================
  // 1. HEADER (Candidate Name & Clickable Contact Line)
  // =========================================================================
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: (profile.name || 'Candidate Name').toUpperCase(),
          bold: true,
          size: 44, // 22pt
          font: FONT_FAMILY,
          color: COLOR_BLACK,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    })
  );

  // Build clickable contact elements with pipe separators
  const contactRuns: Array<TextRun | ExternalHyperlink> = [];

  const addContactItem = (element: TextRun | ExternalHyperlink) => {
    if (contactRuns.length > 0) {
      contactRuns.push(
        new TextRun({
          text: '  |  ',
          size: 19, // 9.5pt
          font: FONT_FAMILY,
          color: COLOR_GRAY,
        })
      );
    }
    contactRuns.push(element);
  };

  if (profile.phone) {
    addContactItem(
      new TextRun({
        text: profile.phone,
        size: 19,
        font: FONT_FAMILY,
        color: COLOR_BLACK,
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
            size: 19,
            font: FONT_FAMILY,
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
            size: 19,
            font: FONT_FAMILY,
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
            size: 19,
            font: FONT_FAMILY,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  if (profile.websiteUrl) {
    const raw = profile.websiteUrl;
    const cleanDisplay = formatDisplayUrl(raw);
    addContactItem(
      new ExternalHyperlink({
        link: normalizeUrl(raw),
        children: [
          new TextRun({
            text: cleanDisplay,
            size: 19,
            font: FONT_FAMILY,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  if (contactRuns.length > 0) {
    docElements.push(
      new Paragraph({
        children: contactRuns,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  // =========================================================================
  // 2. PROFESSIONAL SUMMARY (if present)
  // =========================================================================
  if (version.summary && version.summary.trim()) {
    docElements.push(sectionHeading('Summary'));
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: version.summary.trim(),
            size: 20, // 10pt
            font: FONT_FAMILY,
            color: COLOR_BLACK,
          }),
        ],
        spacing: { before: 30, after: 60 },
      })
    );
  }

  // =========================================================================
  // 3. EDUCATION
  // =========================================================================
  if (version.education && version.education.length > 0) {
    docElements.push(sectionHeading('Education'));
    for (const edu of version.education) {
      // Row 1: University Name (Bold) | Date Range (Right aligned, Bold)
      const dateDisplay = formatEducationDate(edu.startDate, edu.endDate);

      docElements.push(
        twoColumnRow(
          [
            new TextRun({
              text: edu.institution,
              bold: true,
              size: 21,
              font: FONT_FAMILY,
            }),
          ],
          [
            new TextRun({
              text: dateDisplay,
              bold: true,
              size: 20,
              font: FONT_FAMILY,
            }),
          ],
          60,
          10
        )
      );

      // Row 2: Degree in Field at Institution (Italics) | Grade / Location (Right aligned)
      const degreeText = edu.fieldOfStudy
        ? `${edu.degree} in ${edu.fieldOfStudy} at ${edu.institution}`
        : `${edu.degree} at ${edu.institution}`;

      docElements.push(
        twoColumnRow(
          [
            new TextRun({
              text: degreeText,
              italics: true,
              size: 20,
              font: FONT_FAMILY,
              color: COLOR_GRAY,
            }),
          ],
          [
            new TextRun({
              text: edu.grade ? `GPA/Grade: ${edu.grade}` : '',
              italics: true,
              size: 19,
              font: FONT_FAMILY,
              color: COLOR_GRAY,
            }),
          ],
          10,
          40
        )
      );

      if (edu.details) {
        docElements.push(bulletPoint(edu.details));
      }
    }
  }

  // =========================================================================
  // 4. WORK EXPERIENCE
  // =========================================================================
  if (version.experiences && version.experiences.length > 0) {
    docElements.push(sectionHeading('Experience'));
    for (const exp of version.experiences) {
      // Row 1: Role (Bold) & Company (Italics) | Date Range (Right aligned, Bold)
      docElements.push(
        twoColumnRow(
          [
            new TextRun({
              text: exp.role,
              bold: true,
              size: 21,
              font: FONT_FAMILY,
            }),
            new TextRun({
              text: ` — ${exp.company}`,
              size: 21,
              font: FONT_FAMILY,
            }),
          ],
          [
            new TextRun({
              text: `${exp.startDate} – ${exp.endDate}`,
              bold: true,
              size: 20,
              font: FONT_FAMILY,
            }),
          ],
          80,
          10
        )
      );

      // Location if present
      if (exp.location) {
        docElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.location,
                italics: true,
                size: 19,
                font: FONT_FAMILY,
                color: COLOR_GRAY,
              }),
            ],
            spacing: { before: 0, after: 30 },
          })
        );
      }

      // Highlights / Bullet Points
      for (const hl of exp.highlights || []) {
        docElements.push(bulletPoint(hl));
      }
    }
  }

  // =========================================================================
  // 5. PROJECTS
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
    docElements.push(sectionHeading('Projects'));
    for (const proj of projects) {
      const leftParts: Array<TextRun | ExternalHyperlink> = [
        new TextRun({
          text: proj.name,
          bold: true,
          size: 21,
          font: FONT_FAMILY,
        }),
      ];

      const tech = (proj as { techStack?: string[] }).techStack;
      if (tech && tech.length > 0) {
        leftParts.push(
          new TextRun({
            text: `  |  ${tech.join(', ')}`,
            italics: true,
            size: 19,
            font: FONT_FAMILY,
            color: COLOR_GRAY,
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
                size: 18,
                font: FONT_FAMILY,
                color: COLOR_LINK,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          })
        );
      }
      if (pLive) {
        if (pLinks.length > 0) {
          pLinks.push(new TextRun({ text: ' | ', size: 18, font: FONT_FAMILY, color: COLOR_GRAY }));
        }
        pLinks.push(
          new ExternalHyperlink({
            link: normalizeUrl(pLive),
            children: [
              new TextRun({
                text: 'Live Demo',
                size: 18,
                font: FONT_FAMILY,
                color: COLOR_LINK,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          })
        );
      }

      docElements.push(twoColumnRow(leftParts, pLinks, 70, 20));

      for (const b of proj.bullets || []) {
        docElements.push(bulletPoint(b));
      }
    }
  }

  // =========================================================================
  // 6. TECHNICAL SKILLS (Organized Category Lines with Bold Labels)
  // =========================================================================
  type SkillsMap = { [cat: string]: string[] };
  const categories: SkillsMap = {};

  if (version.tailoredSkills) {
    if (version.tailoredSkills.languages?.length) categories['Languages'] = version.tailoredSkills.languages;
    if (version.tailoredSkills.frameworks?.length) categories['Frameworks & Libraries'] = version.tailoredSkills.frameworks;
    if (version.tailoredSkills.cloudAndData?.length) categories['Cloud & Databases'] = version.tailoredSkills.cloudAndData;
    if (version.tailoredSkills.tools?.length) categories['Developer Tools'] = version.tailoredSkills.tools;
  } else if (version.skills && version.skills.length > 0) {
    for (const s of version.skills) {
      const cat = s.category || 'Tools & Other';
      const cleanCat =
        cat === 'Cloud & DB'
          ? 'Cloud & Databases'
          : cat === 'Tools & Other'
            ? 'Developer Tools'
            : cat;
      if (!categories[cleanCat]) categories[cleanCat] = [];
      categories[cleanCat].push(s.name);
    }
  }

  if (Object.keys(categories).length > 0) {
    docElements.push(sectionHeading('Technical Skills'));

    for (const [catName, skillsList] of Object.entries(categories)) {
      if (!skillsList || skillsList.length === 0) continue;
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${catName}: `,
              bold: true,
              size: 20, // 10pt
              font: FONT_FAMILY,
              color: COLOR_BLACK,
            }),
            new TextRun({
              text: skillsList.join(', '),
              size: 20,
              font: FONT_FAMILY,
              color: COLOR_BLACK,
            }),
          ],
          spacing: { before: 25, after: 25 },
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
          run: { font: FONT_FAMILY, size: 20, color: COLOR_BLACK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              right: 720,  // 0.5 in
              bottom: 720, // 0.5 in
              left: 720,   // 0.5 in
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

// ---------------------------------------------------------------------------
// Export CoverLetterItem as .docx
// ---------------------------------------------------------------------------
export async function exportCoverLetterDocx(
  letter: CoverLetterItem,
  profile: CandidateProfile
): Promise<void> {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const contactRuns: Array<TextRun | ExternalHyperlink> = [];

  const addContactItem = (element: TextRun | ExternalHyperlink) => {
    if (contactRuns.length > 0) {
      contactRuns.push(
        new TextRun({
          text: '  |  ',
          size: 19,
          font: FONT_FAMILY,
          color: COLOR_GRAY,
        })
      );
    }
    contactRuns.push(element);
  };

  if (profile.phone) {
    addContactItem(new TextRun({ text: profile.phone, size: 19, font: FONT_FAMILY, color: COLOR_BLACK }));
  }
  if (profile.email) {
    addContactItem(
      new ExternalHyperlink({
        link: `mailto:${profile.email}`,
        children: [
          new TextRun({
            text: profile.email,
            size: 19,
            font: FONT_FAMILY,
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
            size: 19,
            font: FONT_FAMILY,
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
            size: 19,
            font: FONT_FAMILY,
            color: COLOR_LINK,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    );
  }

  const paragraphs: Paragraph[] = [
    // Header — Candidate Name
    new Paragraph({
      children: [
        new TextRun({
          text: (profile.name || 'Candidate Name').toUpperCase(),
          bold: true,
          size: 40,
          font: FONT_FAMILY,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { after: 30 },
    }),
    // Contact line
    new Paragraph({
      children: contactRuns,
      spacing: { after: 180 },
    }),
    // Horizontal divider
    new Paragraph({
      border: {
        bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 4 },
      },
      spacing: { after: 200 },
    }),
    // Date
    new Paragraph({
      children: [new TextRun({ text: today, size: 20, font: FONT_FAMILY, color: COLOR_GRAY })],
      spacing: { after: 120 },
    }),
    // Recipient
    new Paragraph({
      children: [
        new TextRun({
          text: `${letter.targetCompany || 'Hiring'} Team`,
          bold: true,
          size: 21,
          font: FONT_FAMILY,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Re: Application for ${letter.targetPosition || 'Role'}`,
          italics: true,
          size: 20,
          font: FONT_FAMILY,
          color: COLOR_GRAY,
        }),
      ],
      spacing: { after: 160 },
    }),
    // Salutation
    new Paragraph({
      children: [
        new TextRun({
          text: letter.targetCompany
            ? `Dear ${letter.targetCompany} Team,`
            : (letter.recipientName ? `Dear ${letter.recipientName},` : 'Dear Hiring Team,'),
          bold: true,
          size: 21,
          font: FONT_FAMILY,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { after: 120 },
    }),
    // Body paragraphs
    ...letter.bodyText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => Boolean(p) && !p.startsWith('Dear ') && !p.startsWith('Sincerely'))
      .map(
        (para) =>
          new Paragraph({
            children: [
              new TextRun({
                text: para.replace(/\n/g, ' '),
                size: 21, // 10.5pt
                font: FONT_FAMILY,
                color: COLOR_BLACK,
              }),
            ],
            spacing: { before: 80, after: 140 },
            alignment: AlignmentType.JUSTIFIED,
          })
      ),
    // Sign-off
    new Paragraph({
      children: [
        new TextRun({
          text: `Sincerely,\n${profile.name}`,
          bold: true,
          size: 21,
          font: FONT_FAMILY,
          color: COLOR_BLACK,
        }),
      ],
      spacing: { before: 120, after: 40 },
    }),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT_FAMILY, size: 20, color: COLOR_BLACK } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Cover Letter — ${safeName(letter.targetPosition || 'Application')} at ${safeName(letter.targetCompany || 'Company')}.docx`;
  downloadBlob(blob, filename);
}
