import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

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

    // Verify the promotion belongs to this advertiser
    const { data: promotion } = await supabase
      .from('partner_promotions')
      .select('id')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!promotion) {
      return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('partner_promotion_participations')
      .select(`
        id,
        post_url,
        post_note,
        submitted_at,
        created_at,
        partners (
          name,
          email
        )
      `)
      .eq('promotion_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    const participations = (data || []).map(p => {
      // Supabase join returns array or object depending on relation cardinality
      const raw = p.partners as unknown
      const partner = Array.isArray(raw)
        ? (raw as { name: string; email: string }[])[0]
        : (raw as { name: string; email: string } | null)
      return {
        id: p.id,
        partner_name: partner?.name || '',
        partner_email: partner?.email || '',
        submission_url: p.post_url || null,
        note: p.post_note || null,
        created_at: p.created_at,
      }
    })

    return NextResponse.json({ participations })
  } catch (error) {
    console.error('Promotion participations GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
