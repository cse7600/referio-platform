-- 023: 이벤트 시스템 DB 스키마 확장

-- partner_promotions에 배너 및 링크 관련 컬럼 추가
ALTER TABLE partner_promotions
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_bg_color TEXT DEFAULT '#EEF2FF',
  ADD COLUMN IF NOT EXISTS event_link_url TEXT;

-- promotion_type에 'post_verification' 추가
-- 기존 CHECK 제약 제거 후 재생성
ALTER TABLE partner_promotions
  DROP CONSTRAINT IF EXISTS partner_promotions_promotion_type_check;
ALTER TABLE partner_promotions
  ADD CONSTRAINT partner_promotions_promotion_type_check
  CHECK (promotion_type IN ('event', 'bonus', 'ranking', 'post_verification'));

-- partner_promotion_participations 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS partner_promotion_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES partner_promotions(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  note TEXT,
  post_url TEXT,
  post_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (promotion_id, partner_id)
);

-- 이미 테이블이 존재하는 경우를 위해 게시물 인증 필드 추가
ALTER TABLE partner_promotion_participations
  ADD COLUMN IF NOT EXISTS post_url TEXT,
  ADD COLUMN IF NOT EXISTS post_note TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_participations_promotion ON partner_promotion_participations(promotion_id);
CREATE INDEX IF NOT EXISTS idx_participations_partner ON partner_promotion_participations(partner_id);

-- RLS (테이블이 이미 있을 경우 ENABLE은 멱등적으로 동작)
ALTER TABLE partner_promotion_participations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'partner_promotion_participations'
    AND policyname = 'Allow all on partner_promotion_participations'
  ) THEN
    CREATE POLICY "Allow all on partner_promotion_participations"
      ON partner_promotion_participations USING (true) WITH CHECK (true);
  END IF;
END $$;
