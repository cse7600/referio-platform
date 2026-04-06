/**
 * Airbridge 실제 트래킹 링크 생성 스크립트 (밀리의서재)
 * 실행: node scripts/generate-millie-tracking-links.js
 *
 * 수동 URL(abr.ge) → 실제 Airbridge API 생성 URL(short.millie.co.kr) 교체
 */

const AIRBRIDGE_API_TOKEN = '035e98f131b14e80950ad0115ee2d6c2';
const SUPABASE_URL = 'https://eqdnirtgmevhobmycxzn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY 환경변수 필요');
  console.error('실행: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/generate-millie-tracking-links.js');
  process.exit(1);
}

// 5개 파트너 정보 (tracking_links.id, sub_id, partner_program_id)
const PARTNERS = [
  { trackingLinkId: 'ac558db3-b525-4475-b3ce-7d9755ae5686', subId: 'MIL_KIM001', partnerProgramId: '6530adfc-6f31-4a9b-a823-7dba9948cd63' },
  { trackingLinkId: '05a9e985-3ec1-41d2-9a05-ae9a52086368', subId: 'MIL_LEE002', partnerProgramId: 'bb48750f-69c3-414d-a539-23c693289661' },
  { trackingLinkId: '42e75f85-a571-412f-a776-8534a28e92d4', subId: 'MIL_PARK003', partnerProgramId: 'de2e56e6-72ca-46c7-8a1f-92e39b924930' },
  { trackingLinkId: '799fd7e8-bdc2-4811-a21c-f7bc50658c7b', subId: 'MIL_CHOI004', partnerProgramId: '794d460a-f08b-49ae-ad5e-124b20f7241c' },
  { trackingLinkId: '30c2f10d-4a3e-4259-bc0a-85f0758ed58d', subId: 'MIL_JUNG005', partnerProgramId: '97ad9de6-dd1c-45e1-bf88-a099b4af50a5' },
];

async function createAirbridgeLink(subId) {
  const res = await fetch('https://api.airbridge.io/v1/tracking-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AIRBRIDGE_API_TOKEN}`,
    },
    body: JSON.stringify({
      channel: 'referio',
      campaignParams: {
        campaign: 'partner-referral',
        sub_id: subId,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airbridge API 실패 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const link = data.data.trackingLink;
  return {
    shortUrl: link.shortUrl,
    clickUrl: link.link.click,
    shortId: link.shortId,
    airbridgeLinkId: link.id,
    trackingTemplateId: link.trackingTemplateId,
  };
}

async function updateSupabase(trackingLinkId, partnerProgramId, urls) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // tracking_links 업데이트
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/tracking_links?id=eq.${trackingLinkId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      tracking_url: urls.shortUrl,
      metadata: {
        airbridge_link_id: urls.airbridgeLinkId,
        short_id: urls.shortId,
        short_url: urls.shortUrl,
        click_url: urls.clickUrl,
        tracking_template_id: urls.trackingTemplateId,
        channel: 'referio',
        campaign: 'partner-referral',
      },
    }),
  });
  if (!r1.ok) throw new Error(`tracking_links 업데이트 실패: ${await r1.text()}`);

  // partner_programs 업데이트
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/partner_programs?id=eq.${partnerProgramId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ tracking_link_url: urls.shortUrl }),
  });
  if (!r2.ok) throw new Error(`partner_programs 업데이트 실패: ${await r2.text()}`);
}

async function main() {
  console.log('=== 밀리의서재 Airbridge 트래킹 링크 생성 ===\n');

  for (const partner of PARTNERS) {
    process.stdout.write(`${partner.subId}: 생성 중... `);
    try {
      const urls = await createAirbridgeLink(partner.subId);
      await updateSupabase(partner.trackingLinkId, partner.partnerProgramId, urls);
      console.log(`완료 → ${urls.shortUrl}`);
    } catch (err) {
      console.log(`실패 → ${err.message}`);
    }
    // API rate limit 방지
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n=== 완료 ===');
}

main();
