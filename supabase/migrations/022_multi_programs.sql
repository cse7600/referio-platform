-- =============================================
-- 022: Multi-Program Support
-- Separates program info from advertisers table into a dedicated programs table.
-- Allows one advertiser to have N programs.
-- Strategy: non-destructive migration — existing APIs remain functional after Phase 1.
-- =============================================

-- ─────────────────────────────────────────────
-- STEP 1: Create programs table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- Program identity
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  -- Links
  homepage_url TEXT,
  landing_url TEXT,

  -- Activity guide content
  activity_guide TEXT,
  content_sources TEXT,
  prohibited_activities TEXT,
  precautions TEXT,

  -- Commission defaults (can be overridden per partner in partner_programs)
  default_lead_commission DECIMAL(10,2) DEFAULT 0,
  default_contract_commission DECIMAL(10,2) DEFAULT 0,

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_programs_advertiser ON programs(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_programs_is_public ON programs(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_programs_category ON programs(category) WHERE category IS NOT NULL;

-- RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on programs" ON programs USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE programs IS 'One advertiser can have multiple programs. Separated from advertisers table in migration 022.';

-- ─────────────────────────────────────────────
-- STEP 2: Migrate existing advertiser data → programs table
-- One program per advertiser, preserving all existing content.
-- program_name / program_description from advertisers table become the first program.
-- Advertisers without program_name get a default name from company_name.
-- ─────────────────────────────────────────────
INSERT INTO programs (
  advertiser_id,
  name,
  description,
  category,
  homepage_url,
  landing_url,
  activity_guide,
  content_sources,
  prohibited_activities,
  precautions,
  default_lead_commission,
  default_contract_commission,
  is_active,
  is_public,
  created_at,
  updated_at
)
SELECT
  id AS advertiser_id,
  COALESCE(NULLIF(program_name, ''), company_name || ' 파트너 프로그램') AS name,
  program_description AS description,
  category,
  homepage_url,
  landing_url,
  activity_guide,
  content_sources,
  prohibited_activities,
  precautions,
  COALESCE(default_lead_commission, 0),
  COALESCE(default_contract_commission, 0),
  true AS is_active,
  COALESCE(is_public, false) AS is_public,
  created_at,
  updated_at
FROM advertisers
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- STEP 3: Add program_id column to partner_programs
-- NULL-allowed initially to keep existing rows valid.
-- Will be backfilled in Step 4.
-- ─────────────────────────────────────────────
ALTER TABLE partner_programs
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pp_program ON partner_programs(program_id);

COMMENT ON COLUMN partner_programs.program_id IS 'FK to programs table. NULL for legacy rows migrated before 022.';

-- ─────────────────────────────────────────────
-- STEP 4: Backfill partner_programs.program_id
-- Match each partner_programs row to the single program that belongs to the same advertiser.
-- This is safe because every advertiser had exactly one program before this migration.
-- ─────────────────────────────────────────────
UPDATE partner_programs pp
SET program_id = p.id
FROM programs p
WHERE p.advertiser_id = pp.advertiser_id
  AND pp.program_id IS NULL;

-- ─────────────────────────────────────────────
-- STEP 5: Add (partner_id, program_id) unique constraint
-- This enforces "one enrollment per partner per program" going forward.
-- The legacy (partner_id, advertiser_id) unique constraint is intentionally
-- kept intact for backward compatibility with existing API queries.
-- ─────────────────────────────────────────────

-- Partial unique index: only enforce uniqueness where program_id IS NOT NULL.
-- This avoids conflicts with any legacy NULL rows during the transition period.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pp_partner_program
  ON partner_programs(partner_id, program_id)
  WHERE program_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- STEP 6: Deprecate program-related columns on advertisers table
-- Do NOT drop — existing APIs (Phase 1 compatibility) still read these columns.
-- They will be dropped in a future migration after Phase 2/3 API migration.
-- ─────────────────────────────────────────────
COMMENT ON COLUMN advertisers.program_name IS '[DEPRECATED since 022] Moved to programs.name. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.program_description IS '[DEPRECATED since 022] Moved to programs.description. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.default_lead_commission IS '[DEPRECATED since 022] Moved to programs.default_lead_commission. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.default_contract_commission IS '[DEPRECATED since 022] Moved to programs.default_contract_commission. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.is_public IS '[DEPRECATED since 022] Moved to programs.is_public. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.category IS '[DEPRECATED since 022] Moved to programs.category. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.homepage_url IS '[DEPRECATED since 022] Moved to programs.homepage_url. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.landing_url IS '[DEPRECATED since 022] Moved to programs.landing_url. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.activity_guide IS '[DEPRECATED since 022] Moved to programs.activity_guide. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.content_sources IS '[DEPRECATED since 022] Moved to programs.content_sources. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.prohibited_activities IS '[DEPRECATED since 022] Moved to programs.prohibited_activities. Will be removed after Phase 3.';
COMMENT ON COLUMN advertisers.precautions IS '[DEPRECATED since 022] Moved to programs.precautions. Will be removed after Phase 3.';
