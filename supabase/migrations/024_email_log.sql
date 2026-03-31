-- Migration: 024_email_log.sql
-- CRM 이메일 발송 로그 테이블
-- 중복 방지, 쿨다운 판단, 이월 추적의 공통 기반

CREATE TABLE IF NOT EXISTS email_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email_type      TEXT NOT NULL,
  -- 이메일 유형 값:
  -- 'onboarding_welcome'        (이메일 1)
  -- 'onboarding_nudge'          (이메일 2, Cron)
  -- 'onboarding_approved'       (이메일 3)
  -- 'activity_nudge'            (이메일 4, Cron)
  -- 'activity_new_program'      (이메일 5)
  -- 'activity_monthly_report'   (이메일 6, Cron)
  -- 'performance_first_lead'    (이메일 7)
  -- 'performance_first_revenue' (이메일 8)
  -- 'performance_tier_upgrade'  (이메일 9)
  -- 'settlement_confirmed'      (이메일 10, 즉시 발송)
  -- 'settlement_info_request'   (이메일 11, 즉시 발송)
  -- 'settlement_paid'           (이메일 12, 즉시 발송)
  -- 'violation_warning'         (이메일 13, 즉시 발송)
  -- 'account_deleted'           (이메일 14, 즉시 발송)
  -- 'program_rejected'          (이메일 15, 즉시 발송)
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_mandatory    BOOLEAN NOT NULL DEFAULT false,
  program_id      UUID REFERENCES partner_programs(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'sent',
  -- 'sent' | 'deferred' | 'failed'
  deferred_reason TEXT
  -- 'daily_limit_exceeded' | 'duplicate_within_24h' | 'lower_priority'
);

CREATE INDEX idx_email_log_partner_sent
  ON email_log (partner_id, sent_at DESC);

CREATE INDEX idx_email_log_partner_type
  ON email_log (partner_id, email_type, sent_at DESC);

CREATE INDEX idx_email_log_deferred
  ON email_log (status, sent_at)
  WHERE status = 'deferred';
