-- Reports table for advertiser report editor
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '제목 없음',
  content JSONB,  -- Tiptap editor JSON content
  report_data JSONB,  -- Snapshot of stats at time of save
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by advertiser
CREATE INDEX IF NOT EXISTS idx_reports_advertiser_id ON reports(advertiser_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_reports_updated_at();

-- RLS: advertisers can only access their own reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
