import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

// GET: fetch single report
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ report: data })
  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PATCH: update report
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
    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content = body.content
    if (body.report_data !== undefined) updates.report_data = body.report_data

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .select()
      .single()

    if (error) {
      console.error('Report update error:', error)
      return NextResponse.json({ error: '리포트 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ report: data })
  } catch (error) {
    console.error('Report update API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: delete report
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)

    if (error) {
      console.error('Report delete error:', error)
      return NextResponse.json({ error: '리포트 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Report delete API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
