import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 })

    const { data: items, error } = await supabase
      .from('coming_soon_advertisers')
      .select('id, brand_name, brand_logo_url, brand_image_url, description, category, expected_launch_date, status, created_at')
      .eq('status', 'visible')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })

    const ids = (items || []).map(i => i.id)
    let myInterestIds = new Set<string>()
    let interestCounts: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: interests } = await supabase
        .from('coming_soon_interests')
        .select('coming_soon_id, partner_id')
        .in('coming_soon_id', ids)

      for (const row of interests || []) {
        interestCounts[row.coming_soon_id] = (interestCounts[row.coming_soon_id] || 0) + 1
        if (row.partner_id === partner.id) myInterestIds.add(row.coming_soon_id)
      }
    }

    const result = (items || []).map(item => ({
      ...item,
      interest_count: interestCounts[item.id] || 0,
      my_interest: myInterestIds.has(item.id),
    }))

    return NextResponse.json({ items: result })
  } catch (error) {
    console.error('coming-soon GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
