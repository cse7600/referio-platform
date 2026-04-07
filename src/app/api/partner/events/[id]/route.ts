import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: promotion, error } = await supabase
      .from('partner_promotions')
      .select('id, advertiser_id, title, description, promotion_type, reward_description, start_date, end_date, status, banner_image_url, banner_bg_color, event_link_url, created_at, allow_multiple_submissions')
      .eq('id', id)
      .eq('status', 'active')
      .eq('is_visible_to_partners', true)
      .single()

    if (error || !promotion) {
      return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })
    }

    // Check participation count
    const { data: participations } = await supabase
      .from('partner_promotion_participations')
      .select('id')
      .eq('partner_id', partner.id)
      .eq('promotion_id', id)

    const participation_count = (participations || []).length

    return NextResponse.json({
      event: {
        ...promotion,
        participation_count,
        participated: participation_count > 0,
      },
    })
  } catch (error) {
    console.error('Partner event [id] GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
