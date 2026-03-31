-- Migration 025: violation_logs table
-- Admin이 파트너 위반 경고를 발급할 때 기록하는 테이블

CREATE TABLE IF NOT EXISTS violation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  program_id UUID REFERENCES partner_programs(id),
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_violation_logs_partner_id ON violation_logs(partner_id);
