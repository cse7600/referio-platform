-- =============================================================================
-- Referio Platform — RLS (Row Level Security) Policies
-- Created: 2026-03-23
-- Purpose: Restrict data access per user role (partner, advertiser, admin)
--
-- IMPORTANT: Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Admin access uses service_role key which bypasses RLS entirely.
-- =============================================================================

-- ─── 1. Enable RLS on all tables ────────────────────────────────────────────

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_integrations ENABLE ROW LEVEL SECURITY;

-- ─── 2. partners table ──────────────────────────────────────────────────────
-- Partners can only read/update their own row (matched by auth.uid())

-- Drop existing policies if any
DROP POLICY IF EXISTS "Partners: select own" ON partners;
DROP POLICY IF EXISTS "Partners: update own" ON partners;

CREATE POLICY "Partners: select own"
  ON partners FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Partners: update own"
  ON partners FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ─── 3. referrals table ─────────────────────────────────────────────────────
-- Partners see their own referrals (partner_id match)
-- Advertisers cannot use anon key — they use separate cookie auth
-- Only service_role (admin) can see all

DROP POLICY IF EXISTS "Referrals: partner select own" ON referrals;
DROP POLICY IF EXISTS "Referrals: partner insert" ON referrals;

CREATE POLICY "Referrals: partner select own"
  ON referrals FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE auth_user_id = auth.uid()
    )
  );

-- Allow anonymous inserts for inquiry form (no auth required)
-- The inquiry API uses service_role, so this policy is for edge cases
DROP POLICY IF EXISTS "Referrals: anon insert via inquiry" ON referrals;
CREATE POLICY "Referrals: anon insert via inquiry"
  ON referrals FOR INSERT
  WITH CHECK (true);

-- ─── 4. settlements table ───────────────────────────────────────────────────
-- Partners can only see their own settlements

DROP POLICY IF EXISTS "Settlements: partner select own" ON settlements;

CREATE POLICY "Settlements: partner select own"
  ON settlements FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE auth_user_id = auth.uid()
    )
  );

-- ─── 5. advertisers table ───────────────────────────────────────────────────
-- Advertisers use cookie-based auth (not Supabase Auth)
-- No anon key access allowed — admin uses service_role
-- Block all anon access

DROP POLICY IF EXISTS "Advertisers: deny anon" ON advertisers;

CREATE POLICY "Advertisers: deny anon"
  ON advertisers FOR SELECT
  USING (false);

-- ─── 6. partner_programs table ──────────────────────────────────────────────
-- Partners see their own programs

DROP POLICY IF EXISTS "Partner programs: partner select own" ON partner_programs;

CREATE POLICY "Partner programs: partner select own"
  ON partner_programs FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE auth_user_id = auth.uid()
    )
  );

-- ─── 7. campaigns table ─────────────────────────────────────────────────────
-- Campaigns are read-only for partners (they need to see reward amounts)

DROP POLICY IF EXISTS "Campaigns: authenticated read" ON campaigns;

CREATE POLICY "Campaigns: authenticated read"
  ON campaigns FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── 8. webhook_integrations table ──────────────────────────────────────────
-- Only admin (service_role) should access webhook configs
-- Block all anon/authenticated access

DROP POLICY IF EXISTS "Webhooks: deny all" ON webhook_integrations;

CREATE POLICY "Webhooks: deny all"
  ON webhook_integrations FOR SELECT
  USING (false);

-- =============================================================================
-- NOTES:
-- - service_role key bypasses ALL RLS policies (used by admin API routes)
-- - Advertiser dashboard uses its own cookie-based session, NOT Supabase Auth
-- - Inquiry form inserts are handled by API routes using service_role
-- - To verify: SELECT * FROM pg_policies WHERE tablename = 'partners';
-- =============================================================================
