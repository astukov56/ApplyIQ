-- ===========================================================================
-- ApplyIQ Telemetry Schema: Page Views & High-Intent Recruiter Events
-- ===========================================================================

-- 1. Page Views Table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  referrer_source TEXT DEFAULT 'direct', -- 'linkedin', 'github', 'resume', 'email', 'direct', 'other'
  city TEXT,
  country TEXT,
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Engagement Events Table (High-intent interactions: downloads, studio views, exports)
CREATE TABLE IF NOT EXISTS engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL, -- 'download_resume_pdf', 'download_resume_docx', 'open_tailor_studio', 'export_cover_letter', 'view_github', 'view_linkedin'
  path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast aggregation and querying
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views (session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_referrer_source ON page_views (referrer_source);

CREATE INDEX IF NOT EXISTS idx_engagement_events_created_at ON engagement_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_event_name ON engagement_events (event_name);
CREATE INDEX IF NOT EXISTS idx_engagement_events_session_id ON engagement_events (session_id);

-- Enable RLS (Read allowed for analytics, write allowed via anon key or service role)
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts to page_views"
  ON page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous reads to page_views"
  ON page_views FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous inserts to engagement_events"
  ON engagement_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous reads to engagement_events"
  ON engagement_events FOR SELECT
  USING (true);
