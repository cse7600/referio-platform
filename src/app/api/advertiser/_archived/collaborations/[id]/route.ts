import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

// GET: 협업 상세 + 메시지 목록
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: collab, error } = await supabase
      .from('content_collaborations')
      .select('*, partners(name)')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
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
    console.error('Collaboration detail GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: 상태 변경 (completed, revision, cancelled)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const { status, cancel_reason } = await request.json()
    const supabase = await createClient()

    // 현재 협업 조회
    const { data: collab, error: fetchError } = await supabase
      .from('content_collaborations')
      .select('*')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (fetchError || !collab) {
      return NextResponse.json({ error: '협업을 찾을 수 없습니다' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'revision') {
      // 수정 요청 - submitted 상태에서만 가능
      if (collab.status !== 'submitted') {
        return NextResponse.json({ error: '제출된 상태에서만 수정 요청이 가능합니다' }, { status: 400 })
      }
    } else if (status === 'cancelled') {
      updateData.cancel_reason = cancel_reason || null

      // 크레딧 환불
      const budget = Number(collab.budget)
      const { data: advertiser } = await supabase
        .from('advertisers')
        .select('credit_balance')
        .eq('id', session.advertiserUuid)
        .single()

      const currentBalance = Number(advertiser?.credit_balance) || 0
      const newBalance = currentBalance + budget

      await supabase
        .from('advertisers')
        .update({ credit_balance: newBalance })
        .eq('id', session.advertiserUuid)

      await supabase.from('credit_transactions').insert({
        advertiser_id: session.advertiserUuid,
        type: 'charge',
        amount: budget,
        balance_after: newBalance,
        description: `콘텐츠 협업 취소 환불: ${collab.title}`,
        created_by: 'system',
      })
    } else {
      return NextResponse.json({ error: '유효하지 않은 상태입니다' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('content_collaborations')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Collaboration update error:', updateError)
      return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Collaboration PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 메시지 전송
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요' }, { status: 400 })
    }

    const supabase = await createClient()

    // 협업 소유 확인
    const { data: collab } = await supabase
      .from('content_collaborations')
      .select('id')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!collab) {
      return NextResponse.json({ error: '협업을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: msg, error } = await supabase
      .from('collaboration_messages')
      .insert({
        collaboration_id: id,
        sender_type: 'advertiser',
        sender_id: session.advertiserUuid,
        message: message.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Message create error:', error)
      return NextResponse.json({ error: '메시지 전송에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: msg })
  } catch (error) {
    console.error('Message POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
