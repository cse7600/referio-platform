import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession, canManage } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verify partner belongs to this advertiser via partner_programs
    const { data: enrollment, error: enrollErr } = await supabase
      .from('partner_programs')
      .select('id')
      .eq('partner_id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single();

    if (enrollErr || !enrollment) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('partner_activity_links')
      .select('*')
      .eq('partner_id', id)
      .order('discovered_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ links: data ?? [] });

  } catch (error) {
    console.error('activity-links GET error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verify partner belongs to this advertiser via partner_programs
    const { data: enrollment, error: enrollErr } = await supabase
      .from('partner_programs')
      .select('id')
      .eq('partner_id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single();

    if (enrollErr || !enrollment) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 });
    }

    let body: { url?: string; title?: string; program_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { url, title, program_id } = body;

    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('partner_activity_links')
      .insert({
        partner_id: id,
        program_id: program_id ?? null,
        url,
        title: title ?? null,
        auto_detected: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data });

  } catch (error) {
    console.error('activity-links POST error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
