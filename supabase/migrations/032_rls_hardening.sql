-- Migration 032: RLS Policy Hardening
-- Purpose: Replace USING(true) anonymous-access policies with service_role-only policies
-- Context: All API routes use createAdminClient() (service_role), so restricting to
--          service_role maintains existing functionality while blocking direct client access.

-- ============================================================
-- 1. webhook_integrations — advertiser-scoped, sensitive API keys
-- ============================================================
DROP POLICY IF EXISTS "Allow all on webhook_integrations" ON webhook_integrations;

CREATE POLICY "service_role_only_webhook_integrations"
  ON webhook_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. partner_api_keys — partner-scoped, contains API secrets
-- ============================================================
DROP POLICY IF EXISTS "Allow all on partner_api_keys" ON partner_api_keys;

CREATE POLICY "service_role_only_partner_api_keys"
  ON partner_api_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. api_usage_logs — internal usage tracking
-- ============================================================
DROP POLICY IF EXISTS "Allow all on api_usage_logs" ON api_usage_logs;

CREATE POLICY "service_role_only_api_usage_logs"
  ON api_usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. partner_links — partner-scoped UTM tracking links
-- ============================================================
DROP POLICY IF EXISTS "Allow all on partner_links" ON partner_links;

CREATE POLICY "service_role_only_partner_links"
  ON partner_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
