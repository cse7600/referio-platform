import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const masterEmail = process.env.MASTER_ADMIN_EMAIL
  if (!masterEmail || user.email !== masterEmail) return null
  return { user, supabase }
}

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: items, error } = await auth.supabase
      .from('coming_soon_advertisers')
      .select('id, brand_name, brand_logo_url, brand_image_url, description, category, expected_launch_date, status, advertiser_id, created_at')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })

    const ids = (items || []).map(i => i.id)
    let interestCounts: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: interests } = await auth.supabase
        .from('coming_soon_interests')
        .select('coming_soon_id')
        .in('coming_soon_id', ids)

      for (const row of interests || []) {
        interestCounts[row.coming_soon_id] = (interestCounts[row.coming_soon_id] || 0) + 1
      }
    }

    const result = (items || []).map(item => ({
      ...item,
      interest_count: interestCounts[item.id] || 0,
    }))

    return NextResponse.json({ items: result })
  } catch (error) {
    console.error('admin coming-soon GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()
    const { brand_name, brand_logo_url, brand_image_url, description, category, expected_launch_date, status } = body

    if (!brand_name?.trim()) return NextResponse.json({ error: '브랜드명은 필수입니다' }, { status: 400 })
    if (!['hidden', 'visible'].includes(status)) {
      return NextResponse.json({ error: '상태는 hidden 또는 visible만 가능합니다' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('coming_soon_advertisers')
      .insert({
        brand_name: brand_name.trim(),
        brand_logo_url: brand_logo_url || null,
        brand_image_url: brand_image_url || null,
        description: description || null,
        category: category || null,
        expected_launch_date: expected_launch_date || null,
        status,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 500 })
    return NextResponse.json({ success: true, item: data }, { status: 201 })
  } catch (error) {
    console.error('admin coming-soon POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
