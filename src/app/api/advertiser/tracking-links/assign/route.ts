import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/advertiser/tracking-links/assign
 * Assign an unassigned tracking link to a partner program
 * Only for event_tracking / hybrid advertisers
 *
 * Body: { partner_program_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.advertiserType !== 'event_tracking' && session.advertiserType !== 'hybrid') {
      return NextResponse.json(
        { error: 'This feature requires event tracking configuration' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { partner_program_id } = body;

    if (!partner_program_id) {
      return NextResponse.json(
        { error: 'partner_program_id is required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify partner_program belongs to this advertiser
    const { data: program, error: progError } = await admin
      .from('partner_programs')
      .select('id, partner_id, referral_code, tracking_link_url')
      .eq('id', partner_program_id)
      .eq('advertiser_id', session.advertiserUuid)
      .single();

    if (progError || !program) {
      return NextResponse.json(
        { error: 'Partner program not found' },
        { status: 404 }
      );
    }

    // Check if already assigned
    if (program.tracking_link_url) {
      return NextResponse.json({
        success: true,
        action: 'already_assigned',
        tracking_link_url: program.tracking_link_url,
      });
    }

    // Pick one unassigned link
    const { data: link, error: linkError } = await admin
      .from('tracking_links')
      .select('id, tracking_url, sub_id')
      .eq('advertiser_id', session.advertiserUuid)
      .eq('status', 'unassigned')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'No unassigned tracking links available. Generate more links first.' },
        { status: 409 }
      );
    }

    // Assign: update tracking_links status + partner_programs.tracking_link_url
    const now = new Date().toISOString();

    const { error: updateLinkError } = await admin
      .from('tracking_links')
      .update({
        partner_program_id: partner_program_id,
        status: 'assigned',
        assigned_at: now,
        updated_at: now,
      })
      .eq('id', link.id);

    if (updateLinkError) {
      return NextResponse.json(
        { error: `Failed to update tracking link: ${updateLinkError.message}` },
        { status: 500 }
      );
    }

    const { error: updateProgError } = await admin
      .from('partner_programs')
      .update({ tracking_link_url: link.tracking_url })
      .eq('id', partner_program_id);

    if (updateProgError) {
      // Rollback tracking_links assignment
      await admin
        .from('tracking_links')
        .update({ partner_program_id: null, status: 'unassigned', assigned_at: null })
        .eq('id', link.id);

      return NextResponse.json(
        { error: `Failed to update partner program: ${updateProgError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: 'assigned',
      tracking_link_id: link.id,
      tracking_url: link.tracking_url,
      sub_id: link.sub_id,
    });
  } catch (error) {
    console.error('Tracking link assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
