import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession } from '@/lib/auth'

// GET: fetch real-time stats for report widgets
export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const advertiserUuid = session.advertiserUuid

    // Partner stats from partner_programs
    const { data: programs } = await supabase
      .from('partner_programs')
      .select('id, status, partner_id, created_at, partners!inner(name)')
      .eq('advertiser_id', advertiserUuid)

    const totalPartners = programs?.length ?? 0
    const approvedPartners = programs?.filter(p => p.status === 'approved').length ?? 0
    const pendingPartners = programs?.filter(p => p.status === 'pending').length ?? 0
    const rejectedPartners = programs?.filter(p => p.status === 'rejected').length ?? 0

    // Referral stats
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id, is_valid, contract_status, created_at, name, partner_id')
      .eq('advertiser_id', advertiserUuid)

    const totalReferrals = referrals?.length ?? 0
    const completedReferrals = referrals?.filter(r => r.contract_status === 'completed').length ?? 0
    const conversionRate = totalReferrals > 0 ? Math.round((completedReferrals / totalReferrals) * 100) : 0

    // Settlement stats
    const { data: settlements } = await supabase
      .from('settlements')
      .select('id, status, amount, created_at')
      .eq('advertiser_id', advertiserUuid)

    const pendingSettlements = settlements?.filter(s => s.status === 'pending') ?? []
    const completedSettlements = settlements?.filter(s => s.status === 'completed') ?? []
    const pendingSettlementCount = pendingSettlements.length
    const pendingSettlementAmount = pendingSettlements.reduce((sum, s) => sum + (s.amount || 0), 0)
    const completedSettlementCount = completedSettlements.length
    const completedSettlementAmount = completedSettlements.reduce((sum, s) => sum + (s.amount || 0), 0)

    // Monthly referral breakdown (last 6 months)
    const monthlyData: Array<{ month: string; count: number; completed: number }> = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthRefs = referrals?.filter(r => {
        const rd = new Date(r.created_at)
        return rd >= d && rd < nextD
      }) ?? []
      monthlyData.push({
        month: monthStr,
        count: monthRefs.length,
        completed: monthRefs.filter(r => r.contract_status === 'completed').length,
      })
    }

    // Top partners (by referral count)
    const partnerRefCounts: Record<string, { name: string; count: number; completed: number }> = {}
    referrals?.forEach(r => {
      if (r.partner_id) {
        if (!partnerRefCounts[r.partner_id]) {
          const prog = programs?.find(p => p.partner_id === r.partner_id)
          const partnerData = prog?.partners as unknown as { name: string }
          partnerRefCounts[r.partner_id] = {
            name: partnerData?.name || '알 수 없음',
            count: 0,
            completed: 0,
          }
        }
        partnerRefCounts[r.partner_id].count++
        if (r.contract_status === 'completed') {
          partnerRefCounts[r.partner_id].completed++
        }
      }
    })

    const topPartners = Object.values(partnerRefCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Partner activity insights
    const { data: partnerDetails } = await supabase
      .from('partners')
      .select('id, name, is_active_partner, activity_link, memo')
      .in('id', (programs || []).map(p => p.partner_id).filter(Boolean))

    const activeCount = partnerDetails?.filter(p => p.is_active_partner === true).length ?? 0
    const inactiveCount = partnerDetails?.filter(p => !p.is_active_partner).length ?? 0
    const withMemo = partnerDetails?.filter(p => p.memo && p.memo.trim() !== '').length ?? 0
    const withActivityLink = partnerDetails?.filter(p => p.activity_link && p.activity_link.trim() !== '').length ?? 0

    // Recent active partners (latest 5 by program join date)
    const recentActive = (programs || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(prog => {
        const partner = partnerDetails?.find(p => p.id === prog.partner_id)
        return {
          name: partner?.name || '알 수 없음',
          memo: partner?.memo || null,
          activity_link: partner?.activity_link || null,
        }
      })

    return NextResponse.json({
      partners: {
        total: totalPartners,
        approved: approvedPartners,
        pending: pendingPartners,
        rejected: rejectedPartners,
      },
      referrals: {
        total: totalReferrals,
        completed: completedReferrals,
        conversionRate,
      },
      settlements: {
        pendingCount: pendingSettlementCount,
        pendingAmount: pendingSettlementAmount,
        completedCount: completedSettlementCount,
        completedAmount: completedSettlementAmount,
      },
      monthlyData,
      topPartners,
      partnerActivity: {
        activeCount,
        inactiveCount,
        withMemo,
        withActivityLink,
        recentActive,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Report stats error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
