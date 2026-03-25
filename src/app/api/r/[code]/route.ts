import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://referio.puzl.co.kr';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// GET /api/r/[code] — click tracking + redirect
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;

  if (!code) {
    return NextResponse.redirect(BASE_URL);
  }

  const admin = createAdminClient();

  // 1. Lookup affiliate link by short_code
  const { data: link, error } = await admin
    .from('referio_affiliate_links')
    .select('id, campaign_id, short_code, is_active, click_count, referio_campaigns ( landing_path )')
    .eq('short_code', code)
    .single();

  if (error || !link) {
    return NextResponse.redirect(BASE_URL);
  }

  if (!link.is_active) {
    return NextResponse.redirect(BASE_URL);
  }

  // Supabase returns joined relation as object (single) or array
  const campaignRaw = link.referio_campaigns;
  const campaign = Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw;
  const landingPath = (campaign as { landing_path?: string } | null)?.landing_path || '/';

  // 2. Record click event (fire and forget - don't block redirect)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  // Non-blocking: record click + increment counter
  Promise.all([
    admin.from('referio_affiliate_events').insert({
      link_id: link.id,
      event_type: 'click',
      metadata: {
        ip: clientIp,
        user_agent: userAgent,
        referer,
      },
    }),
    admin
      .from('referio_affiliate_links')
      .update({
        click_count: (link.click_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id),
  ]).catch(() => {
    // Silently fail - don't break the redirect
  });

  // 3. Build redirect URL with ref parameter
  const redirectUrl = new URL(landingPath, BASE_URL);
  redirectUrl.searchParams.set('ref', code);

  return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
}
