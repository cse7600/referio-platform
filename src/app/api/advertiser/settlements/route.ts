import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // 정산 목록 조회 (파트너, 피추천인 정보 포함)
    const { data: settlements, error } = await supabase
      .from('settlements')
      .select(`
        *,
        partners (
          id,
          name
        ),
        referrals (
          id,
          name
        )
      `)
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Settlements query error:', error)
      return NextResponse.json(
        { error: '정산 목록 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // 파트너, 피추천인 이름 추가
    const settlementsWithNames = settlements?.map(s => ({
      ...s,
      partner_name: s.partners?.name || null,
      referral_name: s.referrals?.name || null,
      partners: undefined,
      referrals: undefined,
    }))

    // 통계 계산
    const pendingSettlements = settlements?.filter(s => s.status === 'pending') || []
    const completedSettlements = settlements?.filter(s => s.status === 'completed') || []

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const thisMonthSettlements = completedSettlements.filter(s =>
      s.settled_at && new Date(s.settled_at) >= firstDayOfMonth
    )

    const stats = {
      totalPending: pendingSettlements.length,
      totalPendingAmount: pendingSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalCompleted: completedSettlements.length,
      totalCompletedAmount: completedSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
      thisMonthAmount: thisMonthSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
    }

    return NextResponse.json({
      settlements: settlementsWithNames,
      stats,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=60' },
    })

  } catch (error) {
    console.error('Settlements API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
