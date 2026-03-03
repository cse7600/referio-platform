-- 016: 파트너 소셜 채널 정보 추가

-- partners 테이블에 소셜 채널 컬럼 추가
ALTER TABLE partners ADD COLUMN IF NOT EXISTS naver_blog_url TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS threads_url TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS channel_type TEXT CHECK (channel_type IN ('blogger', 'youtuber', 'instagrammer', 'agency', 'offline', 'other'));
ALTER TABLE partners ADD COLUMN IF NOT EXISTS monthly_pv INTEGER;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS subscriber_count INTEGER;
