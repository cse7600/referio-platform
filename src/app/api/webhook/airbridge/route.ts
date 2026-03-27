import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/webhook/airbridge
 * Receive Airbridge postback events (install, sign_up, subscribe)
 *
 * Funnel: install -> sign_up -> subscribe
 * - install: log only (no referral)
 * - sign_up: log + create referral (user_identifier based, no name/phone)
 * - subscribe: log + update referral to completed (triggers settlement)
 *
 * Headers: X-API-Key (required)
 * Body: Airbridge postback payload
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // Look up webhook_integration by api_key + source=airbridge
    const { data: integration, error: intError } = await admin
      .from('webhook_integrations')
      .select('id, advertiser_id, api_secret, config')
      .eq('api_key', apiKey)
      .eq('source', 'airbridge')
      .eq('is_active', true)
      .single();

    if (intError || !integration) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const advertiserId = integration.advertiser_id;
    const body = await request.json();

    // Extract event data from Airbridge postback payload
    const eventType = body.event_category || body.eventCategory || body.event_type || 'unknown';
    const externalEventId = body.event_uuid || body.eventUUID || body.event_id || `ab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const subId = body.sub_id_1 || body.sub_id || body.campaignParams?.sub_id_1 || null;
    const userIdentifier = body.user?.identifier || body.device?.deviceUUID || body.user_id || null;

    // Idempotency check: external_event_id
    const { data: existingEvent } = await admin
      .from('tracking_events')
      .select('id, processed')
      .eq('advertiser_id', advertiserId)
      .eq('external_event_id', externalEventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        action: 'duplicate_ignored',
        event_id: existingEvent.id,
      });
    }

    // Find tracking link by sub_id to get partner mapping
    let trackingLinkId: string | null = null;
    let partnerProgramId: string | null = null;
    let partnerId: string | null = null;

    if (subId) {
      const { data: trackingLink } = await admin
        .from('tracking_links')
        .select('id, partner_program_id')
        .eq('advertiser_id', advertiserId)
        .eq('sub_id', subId)
        .eq('status', 'assigned')
        .maybeSingle();

      if (trackingLink) {
        trackingLinkId = trackingLink.id;
        partnerProgramId = trackingLink.partner_program_id;

        // Get partner_id from partner_program
        if (partnerProgramId) {
          const { data: program } = await admin
            .from('partner_programs')
            .select('partner_id')
            .eq('id', partnerProgramId)
            .maybeSingle();
          partnerId = program?.partner_id || null;
        }
      }
    }

    // Normalize event type
    const normalizedEvent = normalizeEventType(eventType);

    let referralId: string | null = null;
    let processResult = 'logged';

    if (normalizedEvent === 'install') {
      // Install: log only, no referral creation
      processResult = 'logged';
    } else if (normalizedEvent === 'sign_up') {
      // Sign up: create referral (no name/phone — B2C event tracking)
      const { data: newReferral, error: refError } = await admin
        .from('referrals')
        .insert({
          advertiser_id: advertiserId,
          name: userIdentifier || null,
          phone: null,
          referral_code_input: subId || null,
          partner_id: partnerId,
          contract_status: 'pending',
          is_valid: true,
        })
        .select('id')
        .single();

      if (refError) {
        console.error('Referral creation error:', refError);
        processResult = `error: ${refError.message}`;
      } else {
        referralId = newReferral.id;
        processResult = 'created';
      }
    } else if (normalizedEvent === 'subscribe') {
      // Subscribe: find existing pending referral by user_identifier and complete it
      // This triggers the auto_create_settlement DB trigger
      if (userIdentifier) {
        // Find referral created by sign_up with matching user_identifier
        const { data: pendingRef } = await admin
          .from('referrals')
          .select('id')
          .eq('advertiser_id', advertiserId)
          .eq('name', userIdentifier)
          .eq('contract_status', 'pending')
          .eq('is_valid', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingRef) {
          referralId = pendingRef.id;
          const { error: updateError } = await admin
            .from('referrals')
            .update({
              contract_status: 'completed',
              contracted_at: new Date().toISOString(),
            })
            .eq('id', pendingRef.id);

          processResult = updateError
            ? `error: ${updateError.message}`
            : 'created';
        } else if (partnerId) {
          // Fallback: no matching user_identifier referral, try partner-based match
          const { data: partnerRef } = await admin
            .from('referrals')
            .select('id')
            .eq('advertiser_id', advertiserId)
            .eq('partner_id', partnerId)
            .eq('contract_status', 'pending')
            .eq('is_valid', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (partnerRef) {
            referralId = partnerRef.id;
            const { error: updateError } = await admin
              .from('referrals')
              .update({
                contract_status: 'completed',
                contracted_at: new Date().toISOString(),
              })
              .eq('id', partnerRef.id);

            processResult = updateError
              ? `error: ${updateError.message}`
              : 'created';
          } else {
            // No pending referral at all — create completed directly
            const { data: newRef, error: refError } = await admin
              .from('referrals')
              .insert({
                advertiser_id: advertiserId,
                name: userIdentifier,
                phone: null,
                referral_code_input: subId || null,
                partner_id: partnerId,
                contract_status: 'completed',
                is_valid: true,
                contracted_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (refError) {
              processResult = `error: ${refError.message}`;
            } else {
              referralId = newRef.id;
              processResult = 'created';
            }
          }
        } else {
          processResult = 'subscribe_no_partner';
        }
      } else if (partnerId) {
        // No user_identifier but have partner — partner-based match
        const { data: pendingRef } = await admin
          .from('referrals')
          .select('id')
          .eq('advertiser_id', advertiserId)
          .eq('partner_id', partnerId)
          .eq('contract_status', 'pending')
          .eq('is_valid', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingRef) {
          referralId = pendingRef.id;
          const { error: updateError } = await admin
            .from('referrals')
            .update({
              contract_status: 'completed',
              contracted_at: new Date().toISOString(),
            })
            .eq('id', pendingRef.id);

          processResult = updateError
            ? `error: ${updateError.message}`
            : 'created';
        } else {
          processResult = 'subscribe_no_pending_referral';
        }
      } else {
        processResult = 'subscribe_no_partner';
      }
    }

    // Save tracking event log
    const { data: savedEvent, error: eventError } = await admin
      .from('tracking_events')
      .insert({
        advertiser_id: advertiserId,
        provider: 'airbridge',
        external_event_id: externalEventId,
        event_type: normalizedEvent,
        sub_id: subId,
        referral_id: referralId,
        tracking_link_id: trackingLinkId,
        user_identifier: userIdentifier,
        raw_payload: body,
        processed: processResult !== 'logged',
        process_result: processResult,
      })
      .select('id')
      .single();

    if (eventError) {
      // Unique constraint violation = duplicate (race condition)
      if (eventError.code === '23505') {
        return NextResponse.json({
          success: true,
          action: 'duplicate_ignored',
        });
      }
      console.error('Tracking event insert error:', eventError);
      return NextResponse.json(
        { error: 'Failed to save event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: processResult,
      event_id: savedEvent?.id,
      referral_id: referralId,
      partner_matched: !!partnerId,
    });
  } catch (error) {
    console.error('Airbridge webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize Airbridge event types to internal names
 * Funnel: install -> sign_up -> subscribe
 */
function normalizeEventType(eventType: string): string {
  const lower = eventType.toLowerCase();
  if (lower.includes('install') || lower === 'airbridge.install') {
    return 'install';
  }
  if (lower.includes('sign_up') || lower.includes('signup') || lower === 'airbridge.sign_up') {
    return 'sign_up';
  }
  if (lower.includes('subscribe') || lower === 'airbridge.subscribe') {
    return 'subscribe';
  }
  return lower;
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
