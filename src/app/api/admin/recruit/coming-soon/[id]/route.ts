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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()

    // launched 전환 시 advertiser_id 필수
    if (body.status === 'launched' && !body.advertiser_id) {
      return NextResponse.json({ error: 'launched 전환 시 advertiser_id가 필요합니다' }, { status: 400 })
    }

    // 기존 상태 확인 — launched는 되돌릴 수 없음
    const { data: existing } = await auth.supabase
      .from('coming_soon_advertisers')
      .select('status')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: '항목을 찾을 수 없습니다' }, { status: 404 })
    if (existing.status === 'launched' && body.status !== 'launched') {
      return NextResponse.json({ error: 'launched 상태는 변경할 수 없습니다' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    const allowed = ['brand_name', 'brand_logo_url', 'brand_image_url', 'description', 'category', 'expected_launch_date', 'status', 'advertiser_id']
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { error } = await auth.supabase
      .from('coming_soon_advertisers')
      .update(updates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('admin coming-soon PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: existing } = await auth.supabase
      .from('coming_soon_advertisers')
      .select('status')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: '항목을 찾을 수 없습니다' }, { status: 404 })
    if (existing.status === 'launched') {
      return NextResponse.json({ error: '런칭 완료된 항목은 삭제할 수 없습니다' }, { status: 400 })
    }

    const { error } = await auth.supabase
      .from('coming_soon_advertisers')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('admin coming-soon DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
