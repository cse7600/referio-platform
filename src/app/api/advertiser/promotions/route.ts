import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession, canManage } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('partner_promotions')
      .select('*')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ promotions: data || [] })
  } catch (error) {
    console.error('Promotions GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title, description, promotion_type, reward_description,
      start_date, end_date, condition_type, condition_value,
      status, is_visible_to_partners,
    } = body

    if (!title || !promotion_type) {
      return NextResponse.json({ error: '제목과 유형은 필수입니다' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('partner_promotions')
      .insert({
        advertiser_id: session.advertiserUuid,
        title,
        description: description || null,
        promotion_type,
        reward_description: reward_description || null,
        start_date: start_date || null,
        end_date: end_date || null,
        condition_type: condition_type || 'none',
        condition_value: condition_value || {},
        status: status || 'active',
        is_visible_to_partners: is_visible_to_partners !== false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '생성에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ promotion: data }, { status: 201 })
  } catch (error) {
    console.error('Promotions POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('partner_promotions')
      .update(updateData)
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)

    if (error) {
      return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Promotions PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
