import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getPartner(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  return partner
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const partner = await getPartner(supabase)
    if (!partner) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { error } = await supabase
      .from('coming_soon_interests')
      .insert({ coming_soon_id: id, partner_id: partner.id })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: '이미 예약하셨습니다' }, { status: 409 })
      return NextResponse.json({ error: '예약에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('interest POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const partner = await getPartner(supabase)
    if (!partner) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    await supabase
      .from('coming_soon_interests')
      .delete()
      .eq('coming_soon_id', id)
      .eq('partner_id', partner.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('interest DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
