import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // RLS bypassed — advertiser session already verified above
    const supabase = createAdminClient()

    // partner_programs를 통해 파트너 조회 (다대다 관계)
    const { data: enrollments, error } = await supabase
      .from('partner_programs')
      .select(`
        id,
        status,
        tier,
        referral_code,
        lead_commission,
        contract_commission,
        monthly_fee,
        applied_at,
        approved_at,
        created_at,
        partners!inner(
          id,
          name,
          channels,
          main_channel_link,
          is_active_partner,
          activity_link,
          memo,
          created_at
        )
      `)
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Partners query error:', error)
      return NextResponse.json(
        { error: '파트너 목록 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // 이번 달 리드/계약 통계 조회
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: monthlyReferrals } = await supabase
      .from('referrals')
      .select('partner_id, is_valid, contract_status')
      .eq('advertiser_id', session.advertiserUuid)
      .gte('created_at', monthStart)

    // 파트너별 통계 집계
    const statsMap: Record<string, { lead_count: number; contract_count: number }> = {}
    for (const ref of (monthlyReferrals || [])) {
      if (!ref.partner_id) continue
      if (!statsMap[ref.partner_id]) {
        statsMap[ref.partner_id] = { lead_count: 0, contract_count: 0 }
      }
      if (ref.is_valid) statsMap[ref.partner_id].lead_count++
      if (ref.contract_status === 'completed') statsMap[ref.partner_id].contract_count++
    }

    // 기존 응답 형태와 호환되게 평탄화
    const partners = (enrollments || []).map(e => {
      const partnerData = e.partners as unknown as {
        id: string
        name: string
        channels: string[] | null
        main_channel_link: string | null
        is_active_partner: boolean | null
        activity_link: string | null
        memo: string | null
        created_at: string
      }
      const monthStats = statsMap[partnerData.id] || { lead_count: 0, contract_count: 0 }
      return {
        ...partnerData,
        status: e.status,
        tier: e.tier,
        referral_code: e.referral_code,
        lead_commission: e.lead_commission,
        contract_commission: e.contract_commission,
        monthly_fee: e.monthly_fee,
        program_id: e.id,
        applied_at: e.applied_at,
        approved_at: e.approved_at,
        monthly_lead_count: monthStats.lead_count,
        monthly_contract_count: monthStats.contract_count,
      }
    })

    // 승인된 파트너는 이번 달 리드 수 기준으로 정렬 (랭킹)
    partners.sort((a, b) => {
      if (a.status === 'approved' && b.status !== 'approved') return -1
      if (a.status !== 'approved' && b.status === 'approved') return 1
      return b.monthly_lead_count - a.monthly_lead_count
    })

    return NextResponse.json({ partners })

  } catch (error) {
    console.error('Partners API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
