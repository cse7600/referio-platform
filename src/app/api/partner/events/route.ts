import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const advertiserId = searchParams.get('advertiser_id')

    // Fetch advertiser IDs this partner is approved for
    const { data: myPrograms } = await supabase
      .from('partner_programs')
      .select('advertiser_id')
      .eq('partner_id', partner.id)
      .eq('status', 'approved')

    const myAdvertiserIds = (myPrograms || []).map((p: { advertiser_id: string }) => p.advertiser_id)

    if (myAdvertiserIds.length === 0) {
      return NextResponse.json({ events: [] })
    }

    let query = supabase
      .from('partner_promotions')
      .select('id, advertiser_id, title, description, promotion_type, reward_description, start_date, end_date, status, banner_image_url, banner_bg_color, event_link_url, created_at')
      .eq('status', 'active')
      .eq('is_visible_to_partners', true)
      .in('advertiser_id', myAdvertiserIds)
      .order('created_at', { ascending: false })

    if (advertiserId && myAdvertiserIds.includes(advertiserId)) {
      query = query.eq('advertiser_id', advertiserId)
    }

    const { data: promotions, error } = await query

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    // Fetch my participations
    const promotionIds = (promotions || []).map(p => p.id)
    let participatedIds = new Set<string>()

    if (promotionIds.length > 0) {
      const { data: participations } = await supabase
        .from('partner_promotion_participations')
        .select('promotion_id')
        .eq('partner_id', partner.id)
        .in('promotion_id', promotionIds)

      participatedIds = new Set((participations || []).map(p => p.promotion_id))
    }

    const result = (promotions || []).map(p => ({
      ...p,
      participated: participatedIds.has(p.id),
    }))

    return NextResponse.json({ events: result })
  } catch (error) {
    console.error('Partner events GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
