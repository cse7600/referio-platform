-- Channel tracking for referrals
-- Allows partners to track which marketing channel each referral came from
-- Usage: ?ref=CODE&ch=blog (or youtube, instagram, cafe, etc.)

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS channel TEXT;

-- Optional index for analytics queries by channel
CREATE INDEX IF NOT EXISTS idx_referrals_channel ON referrals (channel) WHERE channel IS NOT NULL;

COMMENT ON COLUMN referrals.channel IS 'Marketing channel tag (e.g. blog, youtube, instagram) passed via ?ch= URL param';
