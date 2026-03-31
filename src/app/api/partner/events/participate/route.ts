import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const { promotion_id, note } = body

    if (!promotion_id) {
      return NextResponse.json({ error: 'promotion_id가 필요합니다' }, { status: 400 })
    }

    // Verify event is active and visible
    const { data: promotion } = await supabase
      .from('partner_promotions')
      .select('id, status, is_visible_to_partners')
      .eq('id', promotion_id)
      .single()

    if (!promotion || promotion.status !== 'active' || !promotion.is_visible_to_partners) {
      return NextResponse.json({ error: '참여할 수 없는 이벤트입니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('partner_promotion_participations')
      .insert({
        promotion_id,
        partner_id: partner.id,
        note: note || null,
      })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 참여한 이벤트입니다' }, { status: 409 })
      }
      return NextResponse.json({ error: '참여에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Partner events participate error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
