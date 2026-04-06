import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL
  if (!masterEmail || user.email !== masterEmail) return null
  return { user, supabase }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()
    const { status, admin_note } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'approved 또는 rejected만 가능합니다' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status }
    if (admin_note !== undefined) updates.admin_note = admin_note

    const { error } = await auth.supabase
      .from('advertiser_requests')
      .update(updates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('admin requests PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
