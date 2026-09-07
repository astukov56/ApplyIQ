/**
 * Link normalization and formatting utilities.
 * Ensures URLs always have a valid protocol (https://) for external links
 * to prevent relative path 404 navigation errors.
 */

export function normalizeUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(mailto|tel):/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function formatDisplayUrl(url?: string | null): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

export function normalizeLinkedInUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\/(www\.)?linkedin\.com/i.test(trimmed)) return trimmed;
  if (/^linkedin\.com/i.test(trimmed)) return `https://${trimmed}`;
  if (trimmed.startsWith('in/')) return `https://linkedin.com/${trimmed}`;
  return `https://linkedin.com/in/${trimmed}`;
}

export function formatLinkedInDisplay(url?: string | null): string {
  if (!url) return '';
  const clean = formatDisplayUrl(url);
  if (clean.includes('linkedin.com/in/')) return clean;
  if (clean.includes('linkedin.com/')) return clean.replace('linkedin.com/', 'linkedin.com/in/');
  if (clean.startsWith('in/')) return `linkedin.com/${clean}`;
  return `linkedin.com/in/${clean}`;
}

export function normalizeGitHubUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\/(www\.)?github\.com/i.test(trimmed)) return trimmed;
  if (/^github\.com/i.test(trimmed)) return `https://${trimmed}`;
  return `https://github.com/${trimmed}`;
}

export function formatGitHubDisplay(url?: string | null): string {
  if (!url) return '';
  const clean = formatDisplayUrl(url);
  if (clean.includes('github.com/')) return clean;
  return `github.com/${clean}`;
}
