-- Fix advertiser signup issues
-- Root cause: advertisers table had "deny anon" SELECT policy (qual=false)
-- and NO INSERT policy → signup completely blocked

-- Drop the blocking policy
DROP POLICY IF EXISTS "Advertisers: deny anon" ON advertisers;

-- Add permissive policies for advertisers (auth handled at API level)
CREATE POLICY "Allow all on advertisers"
  ON advertisers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add permissive policies for advertiser_sessions
CREATE POLICY "Allow all on advertiser sessions"
  ON advertiser_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
