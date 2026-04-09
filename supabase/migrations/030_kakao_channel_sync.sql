-- Migration 030: 카카오싱크 Phase 2 — 채널 추가 동의 여부 추적
-- 카카오 비즈앱 심사 통과 후 plusfriends scope 동의 파트너 추적용

ALTER TABLE partners ADD COLUMN IF NOT EXISTS kakao_channel_added BOOLEAN DEFAULT false;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS kakao_channel_added_at TIMESTAMPTZ;

COMMENT ON COLUMN partners.kakao_channel_added IS '카카오 채널 추가 동의 여부 (Phase 2 카카오싱크)';
COMMENT ON COLUMN partners.kakao_channel_added_at IS '카카오 채널 추가 동의 시각';

-- 조회 성능 (채널 추가 파트너 목록 필터링용)
CREATE INDEX IF NOT EXISTS idx_partners_kakao_channel ON partners (kakao_channel_added) WHERE kakao_channel_added = true;
