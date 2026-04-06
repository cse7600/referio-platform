import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getPartner(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { partner: null, user: null }
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single()
  return { partner, user }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { partner } = await getPartner(supabase)
    if (!partner) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    // 다른 파트너: approved만, 본인: pending + approved
    const { data: requests, error } = await supabase
      .from('advertiser_requests')
      .select(`
        id, brand_name, brand_url, description, requested_by, status, created_at,
        partners!requested_by(name)
      `)
      .or(`status.eq.approved,and(requested_by.eq.${partner.id},status.eq.pending)`)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })

    const ids = (requests || []).map(r => r.id)
    let voteCounts: Record<string, number> = {}
    let myVoteIds = new Set<string>()

    if (ids.length > 0) {
      const { data: votes } = await supabase
        .from('advertiser_request_votes')
        .select('request_id, partner_id')
        .in('request_id', ids)

      for (const v of votes || []) {
        voteCounts[v.request_id] = (voteCounts[v.request_id] || 0) + 1
        if (v.partner_id === partner.id) myVoteIds.add(v.request_id)
      }
    }

    // 오늘 KST 기준 내 요청 수
    const todayKst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    todayKst.setHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
      .from('advertiser_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requested_by', partner.id)
      .gte('created_at', todayKst.toISOString())

    const result = (requests || []).map(r => ({
      id: r.id,
      brand_name: r.brand_name,
      brand_url: r.brand_url,
      description: r.description,
      requested_by: r.requested_by,
      requester_name: (r.partners as unknown as { name: string } | null)?.name || '',
      status: r.status,
      created_at: r.created_at,
      vote_count: voteCounts[r.id] || 0,
      my_vote: myVoteIds.has(r.id),
      is_mine: r.requested_by === partner.id,
    }))

    return NextResponse.json({ requests: result, today_request_count: todayCount || 0 })
  } catch (error) {
    console.error('requests GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { partner } = await getPartner(supabase)
    if (!partner) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    // 일일 한도 확인 (하루 3건)
    const todayKst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    todayKst.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('advertiser_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requested_by', partner.id)
      .gte('created_at', todayKst.toISOString())

    if ((count || 0) >= 3) {
      return NextResponse.json(
        { error: 'daily_limit_exceeded', message: '하루 최대 3건까지 요청 가능합니다' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { brand_name, brand_url, description } = body

    if (!brand_name || brand_name.trim().length === 0) {
      return NextResponse.json({ error: '브랜드명은 필수입니다' }, { status: 400 })
    }
    if (brand_name.trim().length > 100) {
      return NextResponse.json({ error: '브랜드명은 100자 이하로 입력해주세요' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('advertiser_requests')
      .insert({
        brand_name: brand_name.trim(),
        brand_url: brand_url?.trim() || null,
        description: description?.trim() || null,
        requested_by: partner.id,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: '요청 등록에 실패했습니다' }, { status: 500 })

    return NextResponse.json({ success: true, request: data }, { status: 201 })
  } catch (error) {
    console.error('requests POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
