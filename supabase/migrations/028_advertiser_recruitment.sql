-- Migration 028: 광고주 모집 기능
-- Coming Soon 광고주 + 파트너 광고주 요청

-- 1. Coming Soon 광고주
CREATE TABLE IF NOT EXISTS coming_soon_advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  brand_logo_url TEXT,
  brand_image_url TEXT,
  description TEXT,
  category TEXT,
  expected_launch_date DATE,
  status TEXT NOT NULL DEFAULT 'hidden' CHECK (status IN ('hidden', 'visible', 'launched')),
  advertiser_id UUID REFERENCES advertisers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coming_soon_status ON coming_soon_advertisers(status);

-- 2. 사전 예약 (Coming Soon 관심 등록)
CREATE TABLE IF NOT EXISTS coming_soon_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coming_soon_id UUID NOT NULL REFERENCES coming_soon_advertisers(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coming_soon_id, partner_id)
);

CREATE INDEX idx_coming_soon_interests_partner ON coming_soon_interests(partner_id);
CREATE INDEX idx_coming_soon_interests_coming_soon ON coming_soon_interests(coming_soon_id);

-- 3. 파트너 광고주 요청
CREATE TABLE IF NOT EXISTS advertiser_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  brand_url TEXT,
  description TEXT,
  requested_by UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advertiser_requests_status ON advertiser_requests(status);
CREATE INDEX idx_advertiser_requests_requester ON advertiser_requests(requested_by);

-- 4. 공감 투표
CREATE TABLE IF NOT EXISTS advertiser_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES advertiser_requests(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, partner_id)
);

CREATE INDEX idx_request_votes_request ON advertiser_request_votes(request_id);
CREATE INDEX idx_request_votes_partner ON advertiser_request_votes(partner_id);

-- updated_at 자동 갱신
CREATE TRIGGER update_coming_soon_updated_at
  BEFORE UPDATE ON coming_soon_advertisers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertiser_requests_updated_at
  BEFORE UPDATE ON advertiser_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
