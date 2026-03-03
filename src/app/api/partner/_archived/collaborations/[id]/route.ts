import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 협업 상세 + 메시지
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const { data: collab, error } = await supabase
      .from('content_collaborations')
      .select('*, advertisers(company_name)')
      .eq('id', id)
      .eq('partner_id', partner.id)
      .single()

    if (error || !collab) {
      return NextResponse.json({ error: '협업을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: messages } = await supabase
      .from('collaboration_messages')
      .select('*')
      .eq('collaboration_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ collaboration: collab, messages: messages || [] })
  } catch (error) {
    console.error('Partner collaboration detail error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 상태 변경 (accepted, declined, in_progress, submitted)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { status, decline_reason, deliverable_url, deliverable_note } = body

    // 현재 협업 조회
    const { data: collab, error: fetchError } = await supabase
      .from('content_collaborations')
      .select('*')
      .eq('id', id)
      .eq('partner_id', partner.id)
      .single()

    if (fetchError || !collab) {
      return NextResponse.json({ error: '협업을 찾을 수 없습니다' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

    if (status === 'accepted') {
      if (collab.status !== 'requested') {
        return NextResponse.json({ error: '요청 상태에서만 수락 가능합니다' }, { status: 400 })
      }
      updateData.accepted_at = new Date().toISOString()
    } else if (status === 'declined') {
      if (collab.status !== 'requested') {
        return NextResponse.json({ error: '요청 상태에서만 거절 가능합니다' }, { status: 400 })
      }
      updateData.decline_reason = decline_reason || null

      // 크레딧 환불
      const budget = Number(collab.budget)
      const { data: advertiser } = await supabase
        .from('advertisers')
        .select('credit_balance')
        .eq('id', collab.advertiser_id)
        .single()

      const currentBalance = Number(advertiser?.credit_balance) || 0
      const newBalance = currentBalance + budget

      await supabase
        .from('advertisers')
        .update({ credit_balance: newBalance })
        .eq('id', collab.advertiser_id)

      await supabase.from('credit_transactions').insert({
        advertiser_id: collab.advertiser_id,
        type: 'charge',
        amount: budget,
        balance_after: newBalance,
        description: `콘텐츠 협업 거절 환불: ${collab.title}`,
        created_by: 'system',
      })
    } else if (status === 'in_progress') {
      if (collab.status !== 'accepted') {
        return NextResponse.json({ error: '수락된 상태에서만 작업 시작 가능합니다' }, { status: 400 })
      }
    } else if (status === 'submitted') {
      if (!['in_progress', 'revision'].includes(collab.status)) {
        return NextResponse.json({ error: '진행 중이거나 수정 요청 상태에서만 제출 가능합니다' }, { status: 400 })
      }
      updateData.deliverable_url = deliverable_url || null
      updateData.deliverable_note = deliverable_note || null
      updateData.submitted_at = new Date().toISOString()
    } else {
      return NextResponse.json({ error: '유효하지 않은 상태입니다' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('content_collaborations')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Partner collaboration update error:', updateError)
      return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Partner collaboration PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 메시지 전송
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요' }, { status: 400 })
    }

    // 협업 소유 확인
    const { data: collab } = await supabase
      .from('content_collaborations')
      .select('id')
      .eq('id', id)
      .eq('partner_id', partner.id)
      .single()

    if (!collab) {
      return NextResponse.json({ error: '협업을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: msg, error } = await supabase
      .from('collaboration_messages')
      .insert({
        collaboration_id: id,
        sender_type: 'partner',
        sender_id: partner.id,
        message: message.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Partner message create error:', error)
      return NextResponse.json({ error: '메시지 전송에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: msg })
  } catch (error) {
    console.error('Partner message POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
