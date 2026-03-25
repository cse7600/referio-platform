import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/affiliate/convert — record a conversion event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { short_code, event_type = 'signup', metadata = {} } = body;

    if (!short_code) {
      return NextResponse.json({ error: 'short_code is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Lookup affiliate link
    const { data: link, error } = await admin
      .from('referio_affiliate_links')
      .select('id, campaign_id, is_active, conversion_count')
      .eq('short_code', short_code)
      .single();

    if (error || !link) {
      return NextResponse.json({ error: 'Invalid affiliate code' }, { status: 404 });
    }

    if (!link.is_active) {
      return NextResponse.json({ error: 'Affiliate link is inactive' }, { status: 400 });
    }

    // 2. Record conversion event
    const { error: insertError } = await admin
      .from('referio_affiliate_events')
      .insert({
        link_id: link.id,
        campaign_id: link.campaign_id,
        event_type,
        metadata,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Increment conversion count
    await admin
      .from('referio_affiliate_links')
      .update({
        conversion_count: (link.conversion_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
