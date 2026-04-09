import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ participationId: string }> }
) {
  try {
    const { participationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('partner_promotion_participations')
      .select('id')
      .eq('id', participationId)
      .eq('partner_id', partner.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: '참여 내역을 찾을 수 없습니다' }, { status: 404 });
    }

    const body = await request.json();
    const { post_url, post_note } = body;

    if (post_url !== undefined && post_url.trim() === '') {
      return NextResponse.json({ error: 'post_url은 빈 문자열일 수 없습니다' }, { status: 400 });
    }

    const updateData: Record<string, string | null> = {};
    if (post_url !== undefined) updateData.post_url = post_url;
    if (post_note !== undefined) updateData.post_note = post_note ?? null;

    const { data: updated, error } = await supabase
      .from('partner_promotion_participations')
      .update(updateData)
      .eq('id', participationId)
      .eq('partner_id', partner.id)
      .select('id, post_url, post_note')
      .single();

    if (error) {
      return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true, participation: updated });
  } catch (error) {
    console.error('Partner participation PATCH error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ participationId: string }> }
) {
  try {
    const { participationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 });
    }

    // Verify ownership before delete
    const { data: existing } = await supabase
      .from('partner_promotion_participations')
      .select('id')
      .eq('id', participationId)
      .eq('partner_id', partner.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: '참여 내역을 찾을 수 없습니다' }, { status: 404 });
    }

    const { error } = await supabase
      .from('partner_promotion_participations')
      .delete()
      .eq('id', participationId)
      .eq('partner_id', partner.id);

    if (error) {
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Partner participation DELETE error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
