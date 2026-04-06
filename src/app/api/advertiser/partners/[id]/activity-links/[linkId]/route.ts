import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession, canManage } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { id, linkId } = await params;
    const supabase = createAdminClient();

    // Verify partner belongs to this advertiser before deleting
    const { data: enrollment, error: enrollErr } = await supabase
      .from('partner_programs')
      .select('id')
      .eq('partner_id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single();

    if (enrollErr || !enrollment) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 });
    }

    const { error } = await supabase
      .from('partner_activity_links')
      .delete()
      .eq('id', linkId)
      .eq('partner_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('activity-links DELETE error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
