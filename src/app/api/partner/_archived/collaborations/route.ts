import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 파트너의 협업 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 파트너 ID 조회
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('content_collaborations')
      .select('*, advertisers(company_name)')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Partner collaborations GET error:', error)
      return NextResponse.json({ error: '협업 목록 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ collaborations: data || [] })
  } catch (error) {
    console.error('Partner collaborations GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
