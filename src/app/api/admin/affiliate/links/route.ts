import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  const isMaster = masterEmail && user.email === masterEmail;
  const isAdmin = user.app_metadata?.role === 'admin';
  if (!isMaster && !isAdmin) return null;
  return user;
}

function generateShortCode(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = prefix + '_';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET: 전체 링크 목록 (캠페인 정보 포함)
export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: links, error } = await admin
    .from('referio_affiliate_links')
    .select(`
      *,
      referio_campaigns ( id, type, name, landing_path )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links: links || [] });
}

// POST: 새 링크 생성
export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    campaign_id,
    promoter_type,
    promoter_partner_id,
    promoter_advertiser_id,
    promoter_name,
    promoter_email,
    note,
  } = body;

  if (!campaign_id || !promoter_name) {
    return NextResponse.json({ error: '캠페인과 프로모터명은 필수입니다' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 캠페인 타입으로 short_code prefix 결정
  const { data: campaign } = await admin
    .from('referio_campaigns')
    .select('type')
    .eq('id', campaign_id)
    .single();

  const prefix = campaign?.type === 'partner_recruitment' ? 'p' : 'a';

  // 중복 없는 short_code 생성
  let short_code = generateShortCode(prefix);
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await admin
      .from('referio_affiliate_links')
      .select('id')
      .eq('short_code', short_code)
      .maybeSingle();

    if (!existing) break;
    short_code = generateShortCode(prefix);
    attempts++;
  }

  const { data, error } = await admin
    .from('referio_affiliate_links')
    .insert({
      campaign_id,
      promoter_type: promoter_type || 'external',
      promoter_partner_id: promoter_partner_id || null,
      promoter_advertiser_id: promoter_advertiser_id || null,
      promoter_name,
      promoter_email: promoter_email || null,
      note: note || null,
      short_code,
    })
    .select(`*, referio_campaigns ( id, type, name, landing_path )`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ link: data }, { status: 201 });
}

// PATCH: 링크 수정 (활성화/비활성화, 메모 수정)
export async function PATCH(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, is_active, note, promoter_name, promoter_email } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('referio_affiliate_links')
    .update({
      ...(is_active !== undefined && { is_active }),
      ...(note !== undefined && { note }),
      ...(promoter_name !== undefined && { promoter_name }),
      ...(promoter_email !== undefined && { promoter_email }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`*, referio_campaigns ( id, type, name, landing_path )`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ link: data });
}

// DELETE: 링크 삭제
export async function DELETE(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  const { error } = await admin
    .from('referio_affiliate_links')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
