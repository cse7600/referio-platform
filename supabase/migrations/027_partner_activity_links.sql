-- Migration 027: Partner Activity Links (복수 활동 링크 지원)
-- 2026-04-02

-- 1. partner_activity_links 테이블 생성
CREATE TABLE IF NOT EXISTS partner_activity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  url text NOT NULL,
  title text,
  auto_detected boolean NOT NULL DEFAULT false,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_partner_activity_links_partner_id
  ON partner_activity_links(partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_activity_links_program_id
  ON partner_activity_links(program_id);

-- 3. RLS
ALTER TABLE partner_activity_links ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_bypass" ON partner_activity_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. 기존 activity_link 데이터 마이그레이션 (값이 있는 경우만)
INSERT INTO partner_activity_links (partner_id, url, auto_detected, discovered_at)
SELECT id, activity_link, false, now()
FROM partners
WHERE activity_link IS NOT NULL AND activity_link != '';
