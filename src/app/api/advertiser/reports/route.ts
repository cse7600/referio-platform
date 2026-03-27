import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

// GET: list reports for the authenticated advertiser
export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reports')
      .select('id, title, is_template, created_at, updated_at')
      .eq('advertiser_id', session.advertiserUuid)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Reports list error:', error)
      return NextResponse.json({ error: '리포트 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ reports: data })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: create a new report
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, report_data, is_template } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reports')
      .insert({
        advertiser_id: session.advertiserUuid,
        title: title.trim(),
        content: content || {},
        report_data: report_data || {},
        is_template: is_template || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Report create error:', error)
      return NextResponse.json({ error: '리포트 생성 실패' }, { status: 500 })
    }

    return NextResponse.json({ report: data })
  } catch (error) {
    console.error('Report create API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
