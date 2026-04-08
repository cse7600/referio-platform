'use client'

// DEMO[chabyulhwa] — 시연 모드 지원을 위해 Client Component로 전환
// 시연 모드 제거 시: 이 파일을 원래 Server Component 버전으로 교체

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useDemoMode } from '@/contexts/demo-mode-context'
import { getDemoConfig } from '@/lib/demo-data/demo-config'
import { DEMO_DASHBOARD_STATS as CHABYULHWA_DASHBOARD, DEMO_EVENTS_DATA as CHABYULHWA_EVENTS } from '@/lib/demo-data/chabyulhwa-demo'
import { DEMO_DASHBOARD_STATS as MILLIE_DASHBOARD, DEMO_EVENTS_DATA as MILLIE_EVENTS } from '@/lib/demo-data/millie-demo'

interface DashboardStats {
  totalPartners: number
  activePartners: number
  totalReferrals: number
  validReferrals: number
  totalSettlements: number
  pendingSettlements: number
  thisMonthSettlementAmount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AdvertiserDashboardPage() {
  const { advertiserId, isDemoMode } = useDemoMode()
  // DEMO[sales-demo]
  const isDemo = isDemoMode && (advertiserId === 'chabyulhwa' || advertiserId === 'millie')
  const demoConfig = isDemo ? getDemoConfig(advertiserId) : undefined
  const DEMO_DASHBOARD_STATS = advertiserId === 'millie' ? MILLIE_DASHBOARD : CHABYULHWA_DASHBOARD
  const DEMO_EVENTS_DATA = advertiserId === 'millie' ? MILLIE_EVENTS : CHABYULHWA_EVENTS

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      // DEMO[sales-demo] — 시연용 더미 통계
      const topFunnel = advertiserId === 'millie'
        ? (DEMO_DASHBOARD_STATS as typeof MILLIE_DASHBOARD).totalAppInstall
        : (DEMO_DASHBOARD_STATS as typeof CHABYULHWA_DASHBOARD).totalSignups
      const bottomFunnel = advertiserId === 'millie'
        ? (DEMO_DASHBOARD_STATS as typeof MILLIE_DASHBOARD).totalSubscribe
        : (DEMO_DASHBOARD_STATS as typeof CHABYULHWA_DASHBOARD).totalFirstPurchase
      setStats({
        totalPartners: DEMO_DASHBOARD_STATS.totalPartners,
        activePartners: DEMO_DASHBOARD_STATS.activePartners,
        totalReferrals: topFunnel,
        validReferrals: bottomFunnel,
        totalSettlements: DEMO_DASHBOARD_STATS.totalSettlements,
        pendingSettlements: DEMO_DASHBOARD_STATS.pendingSettlements,
        thisMonthSettlementAmount: DEMO_DASHBOARD_STATS.thisMonthSettlementAmount,
      })
      setLoading(false)
      return
    }
    fetchStats()
  }, [isDemo])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/advertiser/dashboard')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats ?? data)
      } else {
        setStats({ totalPartners: 0, activePartners: 0, totalReferrals: 0, validReferrals: 0, totalSettlements: 0, pendingSettlements: 0, thisMonthSettlementAmount: 0 })
      }
    } catch {
      setStats({ totalPartners: 0, activePartners: 0, totalReferrals: 0, validReferrals: 0, totalSettlements: 0, pendingSettlements: 0, thisMonthSettlementAmount: 0 })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    )
  }

  const s = stats!
  const isNewUser = !isDemo && s.totalPartners === 0 && s.totalReferrals === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-500 mt-1">
          {isDemo ? '파트너 프로그램 현황 (시연 데이터)' : '파트너 프로그램 현황을 확인하세요'}
        </p>
      </div>

      {/* 신규 가입자 시작 가이드 */}
      {isNewUser && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🚀</span>
              <h2 className="text-lg font-bold text-indigo-900">3단계로 시작하기</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/advertiser/campaigns" className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow border border-indigo-100 block">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="font-semibold text-sm text-slate-800">캠페인 설정</p>
                </div>
                <p className="text-xs text-slate-500">수수료 금액과 프로그램 소개를 설정하세요</p>
                <p className="text-xs text-indigo-600 mt-2 font-medium">캠페인 설정하기 →</p>
              </Link>
              <Link href="/advertiser/settings" className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow border border-indigo-100 block">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="font-semibold text-sm text-slate-800">문의 폼 링크 확인</p>
                </div>
                <p className="text-xs text-slate-500">파트너가 공유할 문의 폼 링크를 확인하고 테스트하세요</p>
                <p className="text-xs text-indigo-600 mt-2 font-medium">설정 보기 →</p>
              </Link>
              <Link href="/advertiser/partners" className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow border border-indigo-100 block">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="font-semibold text-sm text-slate-800">파트너 모집</p>
                </div>
                <p className="text-xs text-slate-500">파트너 신청을 승인하고 활동을 시작하세요</p>
                <p className="text-xs text-indigo-600 mt-2 font-medium">파트너 관리 →</p>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">전체 파트너</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{s.totalPartners}</p>
              <p className="text-xs text-green-600 mt-1">활성 {s.activePartners}명</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </Card>

        {/* DEMO[sales-demo] — 이벤트 추적 모드: 유입고객 대신 전환 지표 표시 */}
        {isDemo ? (
          <>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">총 {demoConfig?.funnelEvents[0]?.label ?? '유입'}</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{((DEMO_EVENTS_DATA.funnel as Record<string, number>)[DEMO_EVENTS_DATA.funnel_events[0]] || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{DEMO_EVENTS_DATA.funnel_events[0]} 이벤트</p>
                </div>
                <div className="text-4xl">📝</div>
              </div>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{demoConfig?.funnelEvents[1]?.label ?? '전환'} 전환</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{((DEMO_EVENTS_DATA.funnel as Record<string, number>)[DEMO_EVENTS_DATA.funnel_events[1]] || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">전환율 {(DEMO_EVENTS_DATA.funnel as Record<string, number>)[`${DEMO_EVENTS_DATA.funnel_events[0]}_to_${DEMO_EVENTS_DATA.funnel_events[1]}`]}%</p>
                </div>
                <div className="text-4xl">🛒</div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">총 유입 고객</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{s.totalReferrals}</p>
                  <p className="text-xs text-green-600 mt-1">유효 {s.validReferrals}건</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">정산 건수</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{s.totalSettlements}</p>
                  <p className="text-xs text-orange-600 mt-1">대기 {s.pendingSettlements}건</p>
                </div>
                <div className="text-4xl">📝</div>
              </div>
            </Card>
          </>
        )}

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {isDemo ? '정산 파트너 수' : '정산 건수'}
              </p>
              {isDemo ? (
                <>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{s.totalSettlements}</p>
                  <p className="text-xs text-orange-600 mt-1">대기 {s.pendingSettlements}명</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{s.totalSettlements}</p>
                  <p className="text-xs text-orange-600 mt-1">대기 {s.pendingSettlements}건</p>
                </>
              )}
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </Card>
      </div>

      {/* DEMO[chabyulhwa] — 이벤트 현황 요약 카드 */}
      {isDemo && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">이벤트 현황 요약</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DEMO_EVENTS_DATA.partners.slice(0, 4).map(p => (
              <div key={p.sub_id} className="bg-white rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-slate-500 mb-1 truncate">{p.partner_name}</p>
                <p className="text-xs text-slate-400 mb-2">{p.sub_id}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600">{demoConfig?.funnelEvents[0]?.label ?? '유입'} {(p.event_counts as Record<string, number>)[DEMO_EVENTS_DATA.funnel_events[0]] ?? 0}</span>
                  <span className="text-green-600">{demoConfig?.funnelEvents[1]?.label ?? '전환'} {(p.event_counts as Record<string, number>)[DEMO_EVENTS_DATA.funnel_events[1]] ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <Link href="/advertiser/events" className="text-sm text-blue-600 hover:underline font-medium">
              전체 이벤트 현황 보기 →
            </Link>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/advertiser/partners">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-bold text-slate-900">파트너 관리</h3>
            <p className="text-sm text-slate-500 mt-1">파트너를 승인하고 관리하세요</p>
          </Card>
        </Link>

        {isDemo ? (
          <Link href="/advertiser/events">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="font-bold text-slate-900">이벤트 현황</h3>
              <p className="text-sm text-slate-500 mt-1">가입·첫구매 전환 현황을 확인하세요</p>
            </Card>
          </Link>
        ) : (
          <Link href="/advertiser/campaigns">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">📢</div>
              <h3 className="font-bold text-slate-900">캠페인 설정</h3>
              <p className="text-sm text-slate-500 mt-1">수수료와 정책을 설정하세요</p>
            </Card>
          </Link>
        )}

        <Link href="/advertiser/settlements">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-bold text-slate-900">정산 관리</h3>
            <p className="text-sm text-slate-500 mt-1">정산 내역을 확인하세요</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
