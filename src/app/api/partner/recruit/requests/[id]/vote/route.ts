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

    // approved 요청에만 투표 가능
    const { data: request } = await supabase
      .from('advertiser_requests')
      .select('id, requested_by, status')
      .eq('id', id)
      .single()

    if (!request || request.status !== 'approved') {
      return NextResponse.json({ error: '존재하지 않거나 공개되지 않은 요청입니다' }, { status: 404 })
    }

    if (request.requested_by === partner.id) {
      return NextResponse.json({ error: '자신의 요청에는 공감할 수 없습니다' }, { status: 403 })
    }

    const { error } = await supabase
      .from('advertiser_request_votes')
      .insert({ request_id: id, partner_id: partner.id })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: '이미 공감하셨습니다' }, { status: 409 })
      return NextResponse.json({ error: '공감에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('vote POST error:', error)
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
      .from('advertiser_request_votes')
      .delete()
      .eq('request_id', id)
      .eq('partner_id', partner.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('vote DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
