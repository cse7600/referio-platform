-- Migration 029: program_keywords table for Keyword Arsenal feature

-- 0. pg_trgm extension for full-text similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. program_keywords table
CREATE TABLE program_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES partner_programs(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  memo TEXT,
  memo_public BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,
  naver_pc_volume INTEGER,
  naver_mobile_volume INTEGER,
  naver_competition TEXT CHECK (naver_competition IN ('낮음', '중간', '높음')),
  naver_avg_depth NUMERIC(4,1),
  naver_cached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, keyword)
);

-- 2. Indexes optimized for 1M+ rows
CREATE INDEX idx_pk_program_id ON program_keywords(program_id);
CREATE INDEX idx_pk_advertiser_id ON program_keywords(advertiser_id);
CREATE INDEX idx_pk_featured ON program_keywords(program_id, is_featured DESC);
CREATE INDEX idx_pk_naver_cache ON program_keywords(naver_cached_at NULLS FIRST)
  WHERE naver_cached_at IS NULL OR naver_cached_at < NOW() - INTERVAL '30 days';
CREATE INDEX idx_pk_keyword_trgm ON program_keywords USING gin (keyword gin_trgm_ops);

-- 3. RLS — service role bypass only (API uses service role client)
ALTER TABLE program_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON program_keywords FOR ALL USING (true) WITH CHECK (true);

-- 4. updated_at trigger (reuses existing function)
CREATE TRIGGER update_pk_updated_at
  BEFORE UPDATE ON program_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
