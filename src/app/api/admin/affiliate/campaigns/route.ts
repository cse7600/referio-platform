import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  const isMaster = masterEmail && user.email === masterEmail;
  const isAdmin = user.app_metadata?.role === 'admin';
  if (!isMaster && !isAdmin) return null;
  return user;
}

// GET: 두 캠페인 + 링크 통계 조회
export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: campaigns, error } = await admin
    .from('referio_campaigns')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 캠페인의 링크 수 집계
  const result = await Promise.all(
    (campaigns || []).map(async (campaign) => {
      const { count: linkCount } = await admin
        .from('referio_affiliate_links')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);

      const { data: links } = await admin
        .from('referio_affiliate_links')
        .select('click_count, conversion_count')
        .eq('campaign_id', campaign.id);

      const total_clicks = links?.reduce((sum, l) => sum + (l.click_count || 0), 0) || 0;
      const total_conversions = links?.reduce((sum, l) => sum + (l.conversion_count || 0), 0) || 0;

      return { ...campaign, link_count: linkCount || 0, total_clicks, total_conversions };
    })
  );

  return NextResponse.json({ campaigns: result });
}

// PATCH: 캠페인 설정 수정
export async function PATCH(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, name, description, reward_trigger, reward_type, reward_amount, is_active } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('referio_campaigns')
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(reward_trigger !== undefined && { reward_trigger }),
      ...(reward_type !== undefined && { reward_type }),
      ...(reward_amount !== undefined && { reward_amount }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaign: data });
}
