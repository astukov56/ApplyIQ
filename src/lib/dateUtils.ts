/**
 * Date formatting utilities using native Intl.DateTimeFormat.
 * All dates in the app are stored as ISO 8601 strings.
 */

/**
 * Formats an ISO 8601 date or datetime string into a human-readable date.
 * e.g. "2026-08-10" or "2026-08-10T09:00:00.000Z" → "10 Aug 2026"
 *
 * Returns the raw string as a fallback if parsing fails (guards against
 * legacy data that may have stored relative strings like "1 day ago").
 */
export function formatDate(isoString: string | undefined | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    // Gracefully fall back for non-parseable values
    return isoString;
  }
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats an ISO 8601 datetime string with time included.
 * e.g. "2026-08-14T14:30:00.000Z" → "14 Aug 2026, 12:30 pm"
 */
export function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Returns a relative "time ago" description for recent timestamps and a
 * formatted date for older ones.
 * e.g. "2 days ago" or "10 Aug 2026"
 */
export function formatRelativeDate(isoString: string | undefined | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return isoString;
  }
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 21) return '2 weeks ago';
  if (diffDays < 28) return '3 weeks ago';
  return formatDate(isoString);
}
