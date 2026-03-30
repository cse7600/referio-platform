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

    const supabase = createAdminClient()

    // Fetch settlements with partner + referral info
    const { data: settlements, error } = await supabase
      .from('settlements')
      .select(`
        *,
        partners (
          id,
          name,
          email,
          bank_name,
          bank_account,
          account_holder,
          ssn_encrypted
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

    // Group settlements by partner
    const partnerMap = new Map<string, {
      partner_id: string
      partner_name: string
      partner_email: string
      bank_name: string | null
      bank_account: string | null
      account_holder: string | null
      has_ssn: boolean
      total_amount: number
      pending_amount: number
      settlement_count: number
      settlements: Array<{
        id: string
        type: string | null
        referral_id: string | null
        referral_name: string | null
        amount: number
        status: string
        settled_at: string | null
        note: string | null
        created_at: string
      }>
    }>()

    for (const s of settlements || []) {
      const partnerId = s.partner_id
      const partner = s.partners as {
        id: string
        name: string
        email: string
        bank_name: string | null
        bank_account: string | null
        account_holder: string | null
        ssn_encrypted: string | null
      } | null

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          partner_id: partnerId,
          partner_name: partner?.name || '(알 수 없음)',
          partner_email: partner?.email || '',
          bank_name: partner?.bank_name || null,
          bank_account: partner?.bank_account || null,
          account_holder: partner?.account_holder || null,
          has_ssn: !!partner?.ssn_encrypted,
          total_amount: 0,
          pending_amount: 0,
          settlement_count: 0,
          settlements: [],
        })
      }

      const group = partnerMap.get(partnerId)!
      group.total_amount += s.amount || 0
      if (s.status === 'pending') {
        group.pending_amount += s.amount || 0
      }
      group.settlement_count += 1
      group.settlements.push({
        id: s.id,
        type: s.type || null,
        referral_id: s.referral_id,
        referral_name: (s.referrals as { id: string; name: string } | null)?.name || null,
        amount: s.amount,
        status: s.status,
        settled_at: s.settled_at,
        note: s.note,
        created_at: s.created_at,
      })
    }

    const partners = Array.from(partnerMap.values())

    // Compute stats
    const allSettlements = settlements || []
    const pendingSettlements = allSettlements.filter(s => s.status === 'pending')
    const completedSettlements = allSettlements.filter(s => s.status === 'completed')

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthSettlements = completedSettlements.filter(s =>
      s.settled_at && new Date(s.settled_at) >= firstDayOfMonth
    )

    const stats = {
      totalPartners: partners.length,
      totalPending: pendingSettlements.length,
      totalPendingAmount: pendingSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalCompleted: completedSettlements.length,
      totalCompletedAmount: completedSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
      thisMonthAmount: thisMonthSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
    }

    return NextResponse.json({
      partners,
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
