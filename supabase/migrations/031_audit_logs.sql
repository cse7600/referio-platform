-- Migration 031: Audit Logs + Login Rate Limiting
-- Purpose: PIPA compliance (6-month audit trail) + brute-force prevention

-- ============================================================
-- 1. Audit Logs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'advertiser', 'partner', 'system')),
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- RLS: service_role only (no anonymous/authenticated access)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_audit_logs"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-purge records older than 6 months (run via cron or manual)
-- NOTE: Supabase pg_cron can schedule: SELECT delete_old_audit_logs();
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Login Attempts Table (Rate Limiting)
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  attempt_count INT DEFAULT 1,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_address, email)
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(ip_address, email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_locked ON login_attempts(locked_until)
  WHERE locked_until IS NOT NULL;

-- RLS: service_role only
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_login_attempts"
  ON login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup function for expired lockouts
CREATE OR REPLACE FUNCTION cleanup_expired_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE locked_until IS NOT NULL AND locked_until < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
