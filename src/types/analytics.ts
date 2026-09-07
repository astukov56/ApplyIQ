import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod Schemas for Legacy / Pipeline Analytics
// ---------------------------------------------------------------------------

export const AnalyticsKPIsSchema = z.object({
  totalApplications: z.number(),
  activeInterviews: z.number(),
  totalOffers: z.number(),
  overallInterviewRate: z.number(),
  avgAtsScore: z.number(),
  avgResponseDays: z.number(),
});

export const FunnelStageSchema = z.object({
  stage: z.enum(['wishlist', 'applied', 'interviewing', 'offer', 'rejected']),
  label: z.string(),
  count: z.number(),
  conversionRate: z.number(),
  dropRate: z.number(),
});

export const ScoreCorrelationSchema = z.object({
  scoreBracket: z.enum(['90-100%', '80-89%', '70-79%', '<70%']),
  appliedCount: z.number(),
  interviewCount: z.number(),
  conversionRate: z.number(),
});

export const VelocityDataSchema = z.object({
  period: z.string(),
  appliedCount: z.number(),
  interviewCount: z.number(),
});

export const SkillBreakdownSchema = z.object({
  topMatchedSkills: z.array(
    z.object({
      skill: z.string(),
      frequency: z.number(),
    })
  ),
  topMissingGaps: z.array(
    z.object({
      skill: z.string(),
      frequency: z.number(),
      suggestedAction: z.string(),
    })
  ),
});

export const AnalyticsSummarySchema = z.object({
  kpis: AnalyticsKPIsSchema,
  funnel: z.array(FunnelStageSchema),
  scoreCorrelation: z.array(ScoreCorrelationSchema),
  velocity: z.array(VelocityDataSchema),
  skillBreakdown: SkillBreakdownSchema,
});

export type AnalyticsKPIs = z.infer<typeof AnalyticsKPIsSchema>;
export type FunnelStage = z.infer<typeof FunnelStageSchema>;
export type ScoreCorrelation = z.infer<typeof ScoreCorrelationSchema>;
export type VelocityData = z.infer<typeof VelocityDataSchema>;
export type SkillBreakdown = z.infer<typeof SkillBreakdownSchema>;
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
export type TimeRangeFilter = '7d' | '14d' | '30d' | 'all';

// ---------------------------------------------------------------------------
// Web Traffic & Recruiter Telemetry Contracts
// ---------------------------------------------------------------------------

export type TelemetryReferrerSource =
  | 'linkedin'
  | 'github'
  | 'resume'
  | 'email'
  | 'direct'
  | 'other';

export type HighIntentEventName =
  | 'download_resume_pdf'
  | 'download_resume_docx'
  | 'open_tailor_studio'
  | 'export_cover_letter'
  | 'view_github'
  | 'view_linkedin'
  | 'view_live_demo'
  | 'copy_contact'
  | 'page_view';

export interface PageViewRecord {
  id?: string;
  sessionId: string;
  path: string;
  referrer?: string;
  referrerSource: TelemetryReferrerSource;
  city?: string;
  country?: string;
  deviceType?: string;
  durationSeconds?: number;
  createdAt?: string;
}

export interface EngagementEventRecord {
  id?: string;
  sessionId: string;
  eventName: HighIntentEventName | string;
  path: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface TrafficKpis {
  totalVisits: number;
  uniqueRecruiters: number;
  resumeDownloads: number;
  avgTimeOnSiteSeconds: number;
  totalPageViews: number;
  bounceRatePercent: number;
}

export interface DailyTrafficPoint {
  date: string; // e.g. "Aug 28" or "2026-08-28"
  pageViews: number;
  uniqueVisitors: number;
}

export interface ReferrerShare {
  source: TelemetryReferrerSource;
  label: string;
  count: number;
  percentage: number;
}

export interface HighIntentActionCount {
  eventName: HighIntentEventName | string;
  label: string;
  count: number;
  conversionPercent: number;
  iconName: 'file-text' | 'download' | 'sparkles' | 'external-link' | 'code' | 'mail';
}

export interface RecentActivityItem {
  id: string;
  type: 'page_view' | 'event';
  title: string;
  description: string;
  location: string;
  timestamp: string;
  relativeTime: string;
  badgeType: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
}

export interface TrafficTelemetrySummary {
  kpis: TrafficKpis;
  dailyTrend: DailyTrafficPoint[];
  referrers: ReferrerShare[];
  highIntentActions: HighIntentActionCount[];
  recentActivity: RecentActivityItem[];
}
