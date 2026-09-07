import React from 'react';

export interface WordDiffToken {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Token-level LCS (Longest Common Subsequence) diff algorithm.
 * Compares two strings at the word/whitespace level and produces an array of WordDiffTokens.
 */
export function diffWords(textA: string = '', textB: string = ''): WordDiffToken[] {
  if (textA === textB) {
    return [{ value: textA }];
  }
  if (!textA) {
    return [{ value: textB, added: true }];
  }
  if (!textB) {
    return [{ value: textA, removed: true }];
  }

  // Tokenize by words and whitespace
  const tokensA = textA.split(/(\s+)/).filter(Boolean);
  const tokensB = textB.split(/(\s+)/).filter(Boolean);

  const m = tokensA.length;
  const n = tokensB.length;

  // DP table for LCS length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to extract diff tokens
  const result: WordDiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      result.unshift({ value: tokensA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ value: tokensB[j - 1], added: true });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ value: tokensA[i - 1], removed: true });
      i--;
    }
  }

  // Consolidate adjacent tokens of the same type
  const consolidated: WordDiffToken[] = [];
  for (const token of result) {
    const prev = consolidated[consolidated.length - 1];
    if (
      prev &&
      ((prev.added && token.added) ||
        (prev.removed && token.removed) ||
        (!prev.added && !prev.removed && !token.added && !token.removed))
    ) {
      prev.value += token.value;
    } else {
      consolidated.push({ ...token });
    }
  }

  return consolidated;
}

/**
 * Renders in-situ word diff with soft green additions and soft red strikethrough deletions.
 * In print mode (@media print), deletions are hidden (print:hidden) and additions are rendered plainly.
 */
export function renderInSituTextDiff(textA: string = '', textB: string = ''): React.ReactNode {
  const tokens = diffWords(textA, textB);

  return React.createElement(
    React.Fragment,
    null,
    tokens.map((token, idx) => {
      if (token.added) {
        return React.createElement(
          'ins',
          {
            key: idx,
            className:
              'bg-emerald-50 text-emerald-800 border-b border-emerald-400 no-underline px-0.5 rounded-[1px] font-medium print:bg-transparent print:text-black print:border-none print:font-normal',
          },
          token.value
        );
      }
      if (token.removed) {
        return React.createElement(
          'del',
          {
            key: idx,
            className:
              'bg-rose-50 text-rose-700 line-through px-0.5 rounded-[1px] print:hidden',
          },
          token.value
        );
      }
      return React.createElement('span', { key: idx }, token.value);
    })
  );
}

/**
 * Formats education dates cleanly:
 * - Identical years or single graduation year: "Graduated 2025"
 * - In progress or future year: "Expected Graduation 2026"
 * - Multi-year span: "2021 – 2024 (Graduated 2024)"
 */
export function formatEducationDate(startDate?: string, endDate?: string): string {
  const rawStart = (startDate || '').trim();
  const rawEnd = (endDate || '').trim();
  if (!rawStart && !rawEnd) return '';

  const currentYear = new Date().getFullYear();

  // Check for in-progress or expected
  const isExpected =
    rawEnd.toLowerCase().includes('present') ||
    rawEnd.toLowerCase().includes('progress') ||
    rawEnd.toLowerCase().includes('expected');

  const startYearMatch = rawStart.match(/\b(20\d{2}|19\d{2})\b/);
  const endYearMatch = rawEnd.match(/\b(20\d{2}|19\d{2})\b/);

  const startYear = startYearMatch ? parseInt(startYearMatch[1], 10) : null;
  const endYear = endYearMatch ? parseInt(endYearMatch[1], 10) : null;

  if (isExpected) {
    const year = endYear || (startYear ? startYear + 3 : currentYear + 1);
    return `Expected Graduation ${year}`;
  }

  if (endYear && endYear > currentYear) {
    return `Expected Graduation ${endYear}`;
  }

  if (startYear && endYear && startYear !== endYear) {
    return `${startYear} – ${endYear} (Graduated ${endYear})`;
  }

  const gradYear = endYear || startYear || rawEnd || rawStart;
  return `Graduated ${gradYear}`;
}

import type { CoverLetterResult, SectionDiff } from '@/types/tailor';

/**
 * Computes section-level and paragraph-level diffs between two CoverLetterResult snapshots.
 */
export function computeCoverLetterDiff(
  original: CoverLetterResult,
  proposed: CoverLetterResult
): SectionDiff[] {
  const sections: SectionDiff[] = [];

  const origParas = (original.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const propParas = (proposed.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const maxLen = Math.max(origParas.length, propParas.length);

  for (let idx = 0; idx < maxLen; idx++) {
    const origP = origParas[idx];
    const propP = propParas[idx];

    if (!origP && propP) {
      sections.push({
        section: 'Cover Letter',
        title: `Paragraph ${idx + 1} (Added)`,
        diffs: [{ type: 'added', text: propP }],
      });
    } else if (origP && !propP) {
      sections.push({
        section: 'Cover Letter',
        title: `Paragraph ${idx + 1} (Removed)`,
        diffs: [{ type: 'removed', text: origP }],
      });
    } else if (origP && propP && origP !== propP) {
      sections.push({
        section: 'Cover Letter',
        title: `Paragraph ${idx + 1}`,
        diffs: [
          { type: 'removed', text: origP },
          { type: 'added', text: propP },
        ],
      });
    }
  }

  return sections;
}
