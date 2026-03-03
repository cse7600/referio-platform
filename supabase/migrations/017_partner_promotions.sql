-- 017: 파트너 이벤트/프로모션 시스템

CREATE TABLE IF NOT EXISTS partner_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('event', 'bonus', 'ranking')),
  reward_description TEXT,
  start_date DATE,
  end_date DATE,
  condition_type TEXT CHECK (condition_type IN ('publish', 'lead_count', 'ranking', 'none')),
  condition_value JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'draft')),
  is_visible_to_partners BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_advertiser ON partner_promotions(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON partner_promotions(status);

ALTER TABLE partner_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on partner_promotions" ON partner_promotions USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_promotions_updated_at ON partner_promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON partner_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
