-- 018: Referio 어필리에이트 캠페인 (파트너/광고주 모집)
-- Referio 자체 성장을 위한 두 가지 어필리에이트 캠페인 관리

-- 1. 캠페인 정의 테이블
CREATE TABLE IF NOT EXISTS referio_campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL CHECK (type IN ('partner_recruitment', 'advertiser_recruitment')),
  name           TEXT NOT NULL,
  description    TEXT,
  landing_path   TEXT NOT NULL,

  -- 보상 조건
  reward_trigger TEXT NOT NULL DEFAULT 'signup'
    CHECK (reward_trigger IN ('signup', 'paid_plan')),
  reward_type    TEXT NOT NULL DEFAULT 'fixed'
    CHECK (reward_type IN ('fixed', 'recurring_percentage')),
  reward_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,

  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 프로모터별 추적 링크 테이블
CREATE TABLE IF NOT EXISTS referio_affiliate_links (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id            UUID NOT NULL REFERENCES referio_campaigns(id) ON DELETE CASCADE,

  -- 프로모터 정보
  promoter_type          TEXT NOT NULL DEFAULT 'external'
    CHECK (promoter_type IN ('partner', 'advertiser', 'external')),
  promoter_partner_id    UUID REFERENCES partners(id),
  promoter_advertiser_id UUID REFERENCES advertisers(id),
  promoter_name          TEXT NOT NULL,
  promoter_email         TEXT,
  note                   TEXT,

  -- 링크 식별자
  short_code             TEXT UNIQUE NOT NULL,

  -- 성과 집계 (빠른 조회용 캐시)
  click_count            INT DEFAULT 0,
  conversion_count       INT DEFAULT 0,

  is_active              BOOLEAN DEFAULT true,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referio_affiliate_links_campaign
  ON referio_affiliate_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_referio_affiliate_links_short_code
  ON referio_affiliate_links(short_code);

-- 3. 클릭/전환 이벤트 테이블
CREATE TABLE IF NOT EXISTS referio_affiliate_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id               UUID NOT NULL REFERENCES referio_affiliate_links(id) ON DELETE CASCADE,

  event_type            TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'paid')),

  -- 클릭 추적 정보
  ip_address            TEXT,
  user_agent            TEXT,
  referrer              TEXT,

  -- 전환 정보 (signup/paid 이벤트일 때 사용)
  converted_entity_id   UUID,
  converted_entity_type TEXT CHECK (converted_entity_type IN ('partner', 'advertiser')),
  reward_amount         DECIMAL(12,2),
  reward_status         TEXT DEFAULT 'pending'
    CHECK (reward_status IN ('pending', 'approved', 'paid', 'rejected')),
  notes                 TEXT,

  occurred_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referio_affiliate_events_link
  ON referio_affiliate_events(link_id);
CREATE INDEX IF NOT EXISTS idx_referio_affiliate_events_type
  ON referio_affiliate_events(event_type);

-- 4. RLS 활성화 (API 레벨에서 인증 처리)
ALTER TABLE referio_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE referio_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referio_affiliate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on referio_campaigns"
  ON referio_campaigns USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on referio_affiliate_links"
  ON referio_affiliate_links USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on referio_affiliate_events"
  ON referio_affiliate_events USING (true) WITH CHECK (true);

-- 5. updated_at 자동 갱신 트리거
DROP TRIGGER IF EXISTS update_referio_campaigns_updated_at ON referio_campaigns;
CREATE TRIGGER update_referio_campaigns_updated_at
  BEFORE UPDATE ON referio_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referio_affiliate_links_updated_at ON referio_affiliate_links;
CREATE TRIGGER update_referio_affiliate_links_updated_at
  BEFORE UPDATE ON referio_affiliate_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 기본 캠페인 2개 삽입
INSERT INTO referio_campaigns (type, name, description, landing_path, reward_trigger, reward_type, reward_amount)
VALUES
  (
    'partner_recruitment',
    '파트너 모집 캠페인',
    '새 파트너를 Referio에 소개해주세요. 가입 완료 시 보상을 드립니다.',
    '/join/partner',
    'signup',
    'fixed',
    50000
  ),
  (
    'advertiser_recruitment',
    '광고주 모집 캠페인',
    '새 광고주를 Referio에 소개해주세요. 유료 플랜 시작 시 보상을 드립니다.',
    '/join/advertiser',
    'paid_plan',
    'fixed',
    100000
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE referio_campaigns IS 'Referio 자체 어필리에이트 캠페인 (파트너/광고주 모집)';
COMMENT ON TABLE referio_affiliate_links IS '캠페인별 프로모터 추적 링크';
COMMENT ON TABLE referio_affiliate_events IS '클릭 및 전환 이벤트 로그';
