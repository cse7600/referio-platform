import { NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EventTrackingConfig } from '@/types/database';

/**
 * GET /api/advertiser/events
 * Returns tracking event aggregates for event_tracking / hybrid advertisers
 * - Funnel summary (dynamic events from type_config)
 * - Per-partner breakdown
 * - Recent events stream
 */
export async function GET() {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guard: event_tracking or hybrid only
    if (session.advertiserType !== 'event_tracking' && session.advertiserType !== 'hybrid') {
      return NextResponse.json({ error: 'Not authorized for this view' }, { status: 403 });
    }

    const advertiserUuid = session.advertiserUuid;
    const config = session.typeConfig as EventTrackingConfig;
    const funnelEvents = config?.funnel_events || ['install', 'sign_up', 'subscribe'];

    const admin = createAdminClient();

    // 1. Funnel summary: aggregate by event_type
    const { data: funnelData, error: funnelError } = await admin
      .from('tracking_events')
      .select('event_type')
      .eq('advertiser_id', advertiserUuid);

    if (funnelError) {
      console.error('Funnel query error:', funnelError);
      return NextResponse.json({ error: 'Failed to fetch funnel data' }, { status: 500 });
    }

    // Build dynamic funnel counts from type_config
    const funnelCounts: Record<string, number> = {};
    for (const event of funnelEvents) {
      funnelCounts[event] = 0;
    }
    for (const row of funnelData || []) {
      const et = row.event_type;
      if (et in funnelCounts) {
        funnelCounts[et]++;
      }
    }

    // Calculate conversion rates between consecutive funnel steps
    const conversionRates: Record<string, number> = {};
    for (let i = 1; i < funnelEvents.length; i++) {
      const prev = funnelEvents[i - 1];
      const curr = funnelEvents[i];
      const key = `${prev}_to_${curr}`;
      conversionRates[key] = funnelCounts[prev] > 0
        ? Math.round((funnelCounts[curr] / funnelCounts[prev]) * 1000) / 10
        : 0;
    }

    // 2. Per-partner breakdown
    const { data: partnerEvents, error: partnerError } = await admin
      .from('tracking_events')
      .select('sub_id, event_type')
      .eq('advertiser_id', advertiserUuid)
      .not('sub_id', 'is', null);

    if (partnerError) {
      console.error('Partner events query error:', partnerError);
      return NextResponse.json({ error: 'Failed to fetch partner data' }, { status: 500 });
    }

    // Get partner names from partner_programs
    const { data: programs } = await admin
      .from('partner_programs')
      .select('referral_code, partners!inner(name)')
      .eq('advertiser_id', advertiserUuid);

    const partnerNameMap: Record<string, string> = {};
    for (const p of programs || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partnerData = p.partners as any;
      const name = Array.isArray(partnerData) ? partnerData[0]?.name : partnerData?.name;
      partnerNameMap[p.referral_code] = name || p.referral_code;
    }

    // Get settlement totals per partner
    const { data: settlements } = await admin
      .from('settlements')
      .select('partner_id, amount')
      .eq('advertiser_id', advertiserUuid);

    // Map partner_id to sub_id via partner_programs
    const { data: ppMapping } = await admin
      .from('partner_programs')
      .select('referral_code, partner_id')
      .eq('advertiser_id', advertiserUuid);

    const partnerIdToSubId: Record<string, string> = {};
    for (const pp of ppMapping || []) {
      if (pp.partner_id) {
        partnerIdToSubId[pp.partner_id] = pp.referral_code;
      }
    }

    const settlementBySubId: Record<string, number> = {};
    for (const s of settlements || []) {
      if (s.partner_id) {
        const sid = partnerIdToSubId[s.partner_id];
        if (sid) {
          settlementBySubId[sid] = (settlementBySubId[sid] || 0) + (s.amount || 0);
        }
      }
    }

    // Aggregate per sub_id with dynamic funnel events
    const partnerMap: Record<string, Record<string, number>> = {};
    for (const row of partnerEvents || []) {
      if (!row.sub_id) continue;
      if (!partnerMap[row.sub_id]) {
        partnerMap[row.sub_id] = {};
        for (const event of funnelEvents) {
          partnerMap[row.sub_id][event] = 0;
        }
      }
      const et = row.event_type;
      if (et in partnerMap[row.sub_id]) {
        partnerMap[row.sub_id][et]++;
      }
    }

    const conversionEvent = config?.conversion_event || funnelEvents[funnelEvents.length - 1];
    const preConversionEvent = funnelEvents.length >= 2
      ? funnelEvents[funnelEvents.length - 2]
      : null;

    const partnerBreakdown = Object.entries(partnerMap)
      .map(([subId, counts]) => {
        const convRate = preConversionEvent && counts[preConversionEvent] > 0
          ? Math.round((counts[conversionEvent] / counts[preConversionEvent]) * 1000) / 10
          : 0;
        return {
          sub_id: subId,
          partner_name: partnerNameMap[subId] || subId,
          event_counts: counts,
          conversion_rate: convRate,
          settlement_amount: settlementBySubId[subId] || 0,
        };
      })
      .sort((a, b) => (b.event_counts[conversionEvent] || 0) - (a.event_counts[conversionEvent] || 0));

    // 3. Recent events (last 20)
    const { data: recentEvents, error: recentError } = await admin
      .from('tracking_events')
      .select('id, event_type, user_identifier, sub_id, created_at')
      .eq('advertiser_id', advertiserUuid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentError) {
      console.error('Recent events query error:', recentError);
    }

    return NextResponse.json({
      funnel_events: funnelEvents,
      funnel: {
        ...funnelCounts,
        ...conversionRates,
      },
      partners: partnerBreakdown,
      recent_events: (recentEvents || []).map((e) => ({
        id: e.id,
        event_type: e.event_type,
        user_identifier: maskIdentifier(e.user_identifier),
        sub_id: e.sub_id,
        partner_name: e.sub_id ? (partnerNameMap[e.sub_id] || e.sub_id) : null,
        created_at: e.created_at,
      })),
    });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Mask user identifier for privacy: show first chars + ****
 */
function maskIdentifier(identifier: string | null): string {
  if (!identifier) return '****';
  if (identifier.length <= 8) return identifier.slice(0, 4) + '****';
  return identifier.slice(0, identifier.length - 4) + '****';
}
