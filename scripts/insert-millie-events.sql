-- Millie tracking_events dummy data
-- Partners mapping:
-- MIL_KIM001: tl=ac558db3-b525-4475-b3ce-7d9755ae5686, pp=6530adfc-6f31-4a9b-a823-7dba9948cd63 | install 18, sign_up 9, subscribe 4
-- MIL_LEE002: tl=05a9e985-3ec1-41d2-9a05-ae9a52086368, pp=bb48750f-69c3-414d-a539-23c693289661 | install 31, sign_up 14, subscribe 7
-- MIL_PARK003: tl=42e75f85-a571-412f-a776-8534a28e92d4, pp=de2e56e6-72ca-46c7-8a1f-92e39b924930 | install 52, sign_up 23, subscribe 11
-- MIL_CHOI004: tl=799fd7e8-bdc2-4811-a21c-f7bc50658c7b, pp=794d460a-f08b-49ae-ad5e-124b20f7241c | install 9, sign_up 3, subscribe 1
-- MIL_JUNG005: tl=30c2f10d-4a3e-4259-bc0a-85f0758ed58d, pp=97ad9de6-dd1c-45e1-bf88-a099b4af50a5 | install 24, sign_up 11, subscribe 5

INSERT INTO tracking_events (advertiser_id, provider, external_event_id, event_type, sub_id, tracking_link_id, user_identifier, raw_payload, processed, process_result, created_at)
SELECT
  'e6d1acf7-2288-46e1-b50a-53f368366f9f',
  'airbridge',
  'dummy_' || sub_id || '_' || event_type || '_' || row_num,
  event_type,
  sub_id,
  tracking_link_id::uuid,
  'millie_user_' || (10000 + floor(random() * 90000)::int),
  json_build_object('event_type', event_type, 'sub_id', sub_id, 'user_id', 'millie_user_' || (10000 + floor(random() * 90000)::int))::jsonb,
  true,
  CASE
    WHEN event_type = 'install' THEN 'logged'
    WHEN event_type = 'sign_up' THEN 'created'
    WHEN event_type = 'subscribe' THEN 'created'
  END,
  NOW() - (random() * interval '14 days') +
  CASE
    WHEN event_type = 'install' THEN interval '0 hours'
    WHEN event_type = 'sign_up' THEN interval '2 hours' + random() * interval '24 hours'
    WHEN event_type = 'subscribe' THEN interval '48 hours' + random() * interval '72 hours'
  END
FROM (
  -- MIL_KIM001 install (18)
  SELECT 'MIL_KIM001' as sub_id, 'ac558db3-b525-4475-b3ce-7d9755ae5686' as tracking_link_id, 'install' as event_type, generate_series(1, 18) as row_num
  UNION ALL
  -- MIL_KIM001 sign_up (9)
  SELECT 'MIL_KIM001', 'ac558db3-b525-4475-b3ce-7d9755ae5686', 'sign_up', generate_series(1, 9)
  UNION ALL
  -- MIL_KIM001 subscribe (4)
  SELECT 'MIL_KIM001', 'ac558db3-b525-4475-b3ce-7d9755ae5686', 'subscribe', generate_series(1, 4)
  UNION ALL
  -- MIL_LEE002 install (31)
  SELECT 'MIL_LEE002', '05a9e985-3ec1-41d2-9a05-ae9a52086368', 'install', generate_series(1, 31)
  UNION ALL
  -- MIL_LEE002 sign_up (14)
  SELECT 'MIL_LEE002', '05a9e985-3ec1-41d2-9a05-ae9a52086368', 'sign_up', generate_series(1, 14)
  UNION ALL
  -- MIL_LEE002 subscribe (7)
  SELECT 'MIL_LEE002', '05a9e985-3ec1-41d2-9a05-ae9a52086368', 'subscribe', generate_series(1, 7)
  UNION ALL
  -- MIL_PARK003 install (52)
  SELECT 'MIL_PARK003', '42e75f85-a571-412f-a776-8534a28e92d4', 'install', generate_series(1, 52)
  UNION ALL
  -- MIL_PARK003 sign_up (23)
  SELECT 'MIL_PARK003', '42e75f85-a571-412f-a776-8534a28e92d4', 'sign_up', generate_series(1, 23)
  UNION ALL
  -- MIL_PARK003 subscribe (11)
  SELECT 'MIL_PARK003', '42e75f85-a571-412f-a776-8534a28e92d4', 'subscribe', generate_series(1, 11)
  UNION ALL
  -- MIL_CHOI004 install (9)
  SELECT 'MIL_CHOI004', '799fd7e8-bdc2-4811-a21c-f7bc50658c7b', 'install', generate_series(1, 9)
  UNION ALL
  -- MIL_CHOI004 sign_up (3)
  SELECT 'MIL_CHOI004', '799fd7e8-bdc2-4811-a21c-f7bc50658c7b', 'sign_up', generate_series(1, 3)
  UNION ALL
  -- MIL_CHOI004 subscribe (1)
  SELECT 'MIL_CHOI004', '799fd7e8-bdc2-4811-a21c-f7bc50658c7b', 'subscribe', generate_series(1, 1)
  UNION ALL
  -- MIL_JUNG005 install (24)
  SELECT 'MIL_JUNG005', '30c2f10d-4a3e-4259-bc0a-85f0758ed58d', 'install', generate_series(1, 24)
  UNION ALL
  -- MIL_JUNG005 sign_up (11)
  SELECT 'MIL_JUNG005', '30c2f10d-4a3e-4259-bc0a-85f0758ed58d', 'sign_up', generate_series(1, 11)
  UNION ALL
  -- MIL_JUNG005 subscribe (5)
  SELECT 'MIL_JUNG005', '30c2f10d-4a3e-4259-bc0a-85f0758ed58d', 'subscribe', generate_series(1, 5)
) events;
