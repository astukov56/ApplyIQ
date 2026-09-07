/**
 * ApplyIQ Client-Side Privacy-First Telemetry Beacon
 *
 * Lightweight, zero-dependency, non-blocking telemetry tracker for recruiter visits,
 * referral sources, and high-intent candidate document interactions.
 * Uses navigator.sendBeacon with fetch keepalive fallback.
 * Zero PII: collects only anonymous session IDs, paths, and referrer platforms.
 */

import type { HighIntentEventName, TelemetryReferrerSource } from '@/types/analytics';

const ENDPOINT = '/api/telemetry';

/**
 * Retrieves or initializes an anonymous ephemeral session ID for the recruiter's browsing session.
 */
export function getTelemetrySessionId(): string {
  if (typeof window === 'undefined') return 'server_session';

  try {
    let sid = sessionStorage.getItem('applyiq_sid');
    if (!sid) {
      sid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ses_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('applyiq_sid', sid);
    }
    return sid;
  } catch {
    return 'ephemeral_fallback';
  }
}

/**
 * Normalizes referrer strings and UTM parameters into structured categories.
 */
export function categorizeReferrer(
  rawReferrer?: string,
  search?: string
): { source: TelemetryReferrerSource; label: string } {
  const params = new URLSearchParams(search || (typeof window !== 'undefined' ? window.location.search : ''));
  const utmSource = params.get('utm_source') || params.get('source') || params.get('ref') || '';
  const lowerUtm = utmSource.toLowerCase();

  if (lowerUtm.includes('resume') || lowerUtm.includes('cv') || lowerUtm.includes('pdf')) {
    return { source: 'resume', label: 'Candidate Resume (PDF/QR)' };
  }
  if (lowerUtm.includes('linkedin')) {
    return { source: 'linkedin', label: 'LinkedIn Inbound / Message' };
  }
  if (lowerUtm.includes('github')) {
    return { source: 'github', label: 'GitHub Profile / README' };
  }
  if (lowerUtm.includes('email') || lowerUtm.includes('mail')) {
    return { source: 'email', label: 'Direct Email Outreach' };
  }

  const ref = (rawReferrer || (typeof document !== 'undefined' ? document.referrer : '')).toLowerCase();

  if (ref.includes('linkedin.com')) {
    return { source: 'linkedin', label: 'LinkedIn Platform' };
  }
  if (ref.includes('github.com')) {
    return { source: 'github', label: 'GitHub Repository / Profile' };
  }
  if (ref.includes('mail.') || ref.includes('outlook.') || ref.includes('gmail.')) {
    return { source: 'email', label: 'Email Client / Webmail' };
  }
  if (ref.includes('seek.com.au') || ref.includes('seek.co.nz')) {
    return { source: 'other', label: 'SEEK Application Referral' };
  }

  if (!ref) {
    return { source: 'direct', label: 'Direct Portfolio Link / Resume PDF' };
  }

  try {
    const parsed = new URL(ref);
    return { source: 'other', label: parsed.hostname.replace(/^www\./, '') };
  } catch {
    return { source: 'other', label: 'External Referral' };
  }
}

/**
 * Non-blocking transmitter using navigator.sendBeacon or fetch keepalive.
 */
function sendBeaconSafe(payload: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  const dataStr = JSON.stringify(payload);

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([dataStr], { type: 'application/json' });
    const success = navigator.sendBeacon(ENDPOINT, blob);
    if (success) return;
  }

  // Fallback to fetch with keepalive: true (non-blocking)
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: dataStr,
      keepalive: true,
    }).catch(() => {
      // Fail silently without disrupting UI
    });
  } catch {
    // Fail silently
  }
}

/**
 * Log a page view beacon.
 */
export function trackPageView(pathOverride?: string): void {
  if (typeof window === 'undefined') return;

  const path = pathOverride || window.location.pathname;
  const referrerInfo = categorizeReferrer();
  const sessionId = getTelemetrySessionId();

  // Detect simple device category
  let deviceType = 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua)) deviceType = 'tablet';
  else if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'mobile';

  sendBeaconSafe({
    type: 'page_view',
    sessionId,
    path,
    referrer: document.referrer || '',
    referrerSource: referrerInfo.source,
    deviceType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log a high-intent engagement event.
 */
export function trackEngagementEvent(
  eventName: HighIntentEventName,
  metadata: Record<string, any> = {}
): void {
  if (typeof window === 'undefined') return;

  const path = window.location.pathname;
  const sessionId = getTelemetrySessionId();

  sendBeaconSafe({
    type: 'event',
    sessionId,
    eventName,
    path,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

// Convenience helpers
export const trackResumeDownload = (format: 'pdf' | 'docx', targetRole?: string) => {
  trackEngagementEvent(format === 'pdf' ? 'download_resume_pdf' : 'download_resume_docx', {
    format,
    targetRole: targetRole || 'Software Engineer',
    timestamp: new Date().toISOString(),
  });
};

export const trackTailorStudioOpen = (role?: string, company?: string) => {
  trackEngagementEvent('open_tailor_studio', {
    role: role || '',
    company: company || '',
  });
};

export const trackCoverLetterExport = (jobId?: string) => {
  trackEngagementEvent('export_cover_letter', {
    jobId: jobId || '',
  });
};

export const trackGitHubClick = () => {
  trackEngagementEvent('view_github', {
    destination: 'https://github.com',
  });
};
