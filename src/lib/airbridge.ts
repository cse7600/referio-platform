import { createAdminClient } from '@/lib/supabase/admin';

interface AirbridgeTrackingLinkResult {
  shortUrl: string;
  clickUrl: string;
  shortId: string;
  airbridgeLinkId: number;
}

async function createAirbridgeTrackingLink(
  appName: string,
  apiToken: string,
  subId: string
): Promise<AirbridgeTrackingLinkResult> {
  const res = await fetch('https://api.airbridge.io/v1/tracking-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
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
    throw new Error(`Airbridge API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const link = data.data.trackingLink;

  return {
    shortUrl: link.shortUrl,
    clickUrl: link.link.click,
    shortId: link.shortId,
    airbridgeLinkId: link.id,
  };
}

/**
 * 파트너 승인 시 자동으로 Airbridge 트래킹 링크 할당
 * - airbridge 연동 없으면 스킵 (일반 광고주)
 * - tracking_link_url 이미 있으면 스킵
 * - 실패해도 승인 자체는 막지 않음 (에러 반환 없이 console.error만)
 */
export async function autoAssignAirbridgeTrackingLink(
  partnerId: string,
  advertiserId: string
): Promise<void> {
  const admin = createAdminClient();

  // Airbridge 연동 확인
  const { data: integration } = await admin
    .from('webhook_integrations')
    .select('config')
    .eq('advertiser_id', advertiserId)
    .eq('source', 'airbridge')
    .eq('is_active', true)
    .maybeSingle();

  if (!integration) return; // Airbridge 연동 없는 광고주 — 스킵

  const config = integration.config as {
    airbridge?: { app_name: string; tracking_link_api_token: string };
  };
  const appName = config?.airbridge?.app_name;
  const apiToken = config?.airbridge?.tracking_link_api_token;

  if (!appName || !apiToken) return;

  // 파트너 프로그램 조회
  const { data: program } = await admin
    .from('partner_programs')
    .select('id, referral_code, tracking_link_url')
    .eq('partner_id', partnerId)
    .eq('advertiser_id', advertiserId)
    .maybeSingle();

  if (!program) return;
  if (program.tracking_link_url) return; // 이미 있으면 스킵

  try {
    // Airbridge API로 트래킹 링크 생성
    const result = await createAirbridgeTrackingLink(appName, apiToken, program.referral_code);

    // tracking_links 테이블에 삽입
    const { data: inserted, error: insertErr } = await admin
      .from('tracking_links')
      .insert({
        advertiser_id: advertiserId,
        provider: 'airbridge',
        tracking_url: result.shortUrl,
        sub_id: program.referral_code,
        status: 'assigned',
        partner_program_id: program.id,
        assigned_at: new Date().toISOString(),
        metadata: {
          airbridge_link_id: result.airbridgeLinkId,
          short_id: result.shortId,
          short_url: result.shortUrl,
          click_url: result.clickUrl,
          channel: 'referio',
          campaign: 'partner-referral',
        },
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[Airbridge] tracking_links insert error:', insertErr.message);
      return;
    }

    // partner_programs.tracking_link_url 업데이트
    const { error: updateErr } = await admin
      .from('partner_programs')
      .update({ tracking_link_url: result.shortUrl })
      .eq('id', program.id);

    if (updateErr) {
      console.error('[Airbridge] partner_programs update error:', updateErr.message);
    } else {
      console.log(`[Airbridge] Tracking link assigned: ${program.referral_code} → ${result.shortUrl}`);
    }
  } catch (err) {
    console.error('[Airbridge] autoAssignTrackingLink failed:', err instanceof Error ? err.message : err);
  }
}
