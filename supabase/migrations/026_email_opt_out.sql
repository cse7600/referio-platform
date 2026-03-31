-- Migration 026: email_opted_out column
-- 파트너가 마케팅 이메일 수신거부를 선택할 수 있게 하는 컬럼

ALTER TABLE partners ADD COLUMN IF NOT EXISTS email_opted_out BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN partners.email_opted_out IS '마케팅 이메일 수신거부 여부. true이면 마케팅/활동 이메일 발송 제외. 필수 통지(정산, 계약) 이메일은 무관하게 발송됨.';
