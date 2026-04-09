import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get('promotion_id');

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

    let query = supabase
      .from('partner_promotion_participations')
      .select(`
        id,
        promotion_id,
        post_url,
        post_note,
        submitted_at,
        participated_at,
        promotion:partner_promotions (
          id,
          title,
          promotion_type,
          reward_description,
          status
        )
      `)
      .eq('partner_id', partner.id);

    if (promotionId) {
      query = query.eq('promotion_id', promotionId);
    }

    const { data: participations, error } = await query
      .order('submitted_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ participations: participations || [] });
  } catch (error) {
    console.error('Partner participations GET error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
