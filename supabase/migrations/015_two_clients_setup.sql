-- 015: 두 클라이언트 설정 - 한화비전 키퍼 업데이트 + 세이브택스 신규 생성

-- 1. advertisers 테이블에 category 컬럼 추가 (없으면)
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. 한화비전 키퍼 프로그램 정보 업데이트
UPDATE advertisers SET
  program_name = '한화비전 키퍼 파트너 프로그램',
  program_description = '한화비전 키퍼(KEEPER)는 기업 보안 솔루션 브랜드입니다. 파트너 추천을 통해 고객 상담이 연결되면 커미션을 지급합니다. 유효 리드 1건당 15,000원, 계약 완료 시 추가 20,000원 지급.',
  default_lead_commission = 15000,
  default_contract_commission = 20000,
  category = 'security',
  primary_color = '#ff6a00',
  is_public = true,
  auto_approve_partners = false
WHERE advertiser_id = 'hanwha_vision';

-- 3. 세이브택스 법인설립지원센터 신규 생성
-- 비밀번호: savetax2026! (bcrypt hash)
-- 실제 운영 전 비밀번호 변경 필요
INSERT INTO advertisers (
  advertiser_id,
  company_name,
  user_id,
  password_hash,
  status,
  program_name,
  program_description,
  default_lead_commission,
  default_contract_commission,
  is_public,
  category,
  primary_color,
  contact_email,
  auto_approve_partners
) VALUES (
  'savetax',
  '세이브택스 법인설립지원센터',
  'savetax_admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'active',
  '세이브택스 법인설립 파트너 프로그램',
  '법인설립 상담을 파트너가 연결해드리는 프로그램입니다. 상담 연결 시 커미션을 지급합니다. 커미션 금액은 협의 후 확정 예정.',
  0,
  0,
  true,
  'legal',
  '#2563eb',
  'sales@referio.kr',
  false
)
ON CONFLICT (advertiser_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  program_name = EXCLUDED.program_name,
  program_description = EXCLUDED.program_description,
  category = EXCLUDED.category,
  primary_color = EXCLUDED.primary_color,
  is_public = EXCLUDED.is_public;

-- 4. webhook_integrations에 source 값 'airtable' 추가 지원 (CHECK 제약 수정)
ALTER TABLE webhook_integrations DROP CONSTRAINT IF EXISTS webhook_integrations_source_check;
ALTER TABLE webhook_integrations ADD CONSTRAINT webhook_integrations_source_check
  CHECK (source IN ('recatch', 'salesmap', 'airtable', 'custom'));

-- 5. 한화비전 Airtable 웹훅 설정 추가
INSERT INTO webhook_integrations (
  advertiser_id,
  name,
  source,
  api_key,
  api_secret,
  is_active,
  config
)
SELECT
  a.id,
  'Airtable 연동 (한화비전 키퍼)',
  'airtable',
  'wh_' || encode(gen_random_bytes(16), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  true,
  '{
    "airtable": {
      "name_field": "이름",
      "phone_field": "전화번호",
      "ref_code_field": "추천코드",
      "status_field": "영업상태",
      "valid_values": ["유효"],
      "contract_values": ["계약"],
      "invalid_values": ["무효"],
      "sales_rep_field": "담당자",
      "contract_date_field": "계약일"
    }
  }'::jsonb
FROM advertisers a
WHERE a.advertiser_id = 'hanwha_vision'
  AND NOT EXISTS (
    SELECT 1 FROM webhook_integrations wi
    WHERE wi.advertiser_id = a.id AND wi.source = 'airtable'
  );

-- 6. 세이브택스 Airtable 웹훅 설정 추가
INSERT INTO webhook_integrations (
  advertiser_id,
  name,
  source,
  api_key,
  api_secret,
  is_active,
  config
)
SELECT
  a.id,
  'Airtable 연동 (세이브택스)',
  'airtable',
  'wh_' || encode(gen_random_bytes(16), 'hex'),
  encode(gen_random_bytes(32), 'hex'),
  true,
  '{
    "airtable": {
      "name_field": "이름",
      "phone_field": "전화번호",
      "ref_code_field": "추천코드",
      "status_field": "영업상태",
      "valid_values": ["유효"],
      "contract_values": ["계약"],
      "invalid_values": ["무효"],
      "sales_rep_field": "담당자",
      "contract_date_field": "계약일"
    }
  }'::jsonb
FROM advertisers a
WHERE a.advertiser_id = 'savetax'
  AND NOT EXISTS (
    SELECT 1 FROM webhook_integrations wi
    WHERE wi.advertiser_id = a.id AND wi.source = 'airtable'
  );
