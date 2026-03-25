import Link from 'next/link'
import { redirect } from 'next/navigation'

// cookies() 사용 — 정적 렌더링 불가 (사용자별 데이터)
export const dynamic = 'force-dynamic'
import { Card } from '@/components/ui/card'
import { getAdvertiserSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

interface RecentActivity {
  id: string
  type: 'partner' | 'referral' | 'settlement'
  description: string
  createdAt: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}

// Server Component — 데이터를 서버에서 직접 가져옴 (API 왕복 제거)
export default async function AdvertiserDashboardPage() {
  const session = await getAdvertiserSession()
  if (!session) redirect('/advertiser/login')

  const supabase = await createClient()
  const advertiserUuid = session.advertiserUuid

  // 병렬 쿼리로 DB 왕복 최소화
  const [programsResult, referralsResult, settlementsResult, recentProgramsResult, recentReferralsResult, recentSettlementsResult] =
    await Promise.all([
      supabase.from('partner_programs').select('id, status').eq('advertiser_id', advertiserUuid),
      supabase.from('referrals').select('id, is_valid').eq('advertiser_id', advertiserUuid),
      supabase.from('settlements').select('id, status, amount, created_at').eq('advertiser_id', advertiserUuid),
      supabase.from('partner_programs').select('id, created_at, partners!inner(name)').eq('advertiser_id', advertiserUuid).order('created_at', { ascending: false }).limit(5),
      supabase.from('referrals').select('id, name, created_at').eq('advertiser_id', advertiserUuid).order('created_at', { ascending: false }).limit(5),
      supabase.from('settlements').select('id, amount, status, created_at').eq('advertiser_id', advertiserUuid).order('created_at', { ascending: false }).limit(5),
    ])

  const programs = programsResult.data ?? []
  const referrals = referralsResult.data ?? []
  const settlements = settlementsResult.data ?? []

  const totalPartners = programs.length
  const activePartners = programs.filter(p => p.status === 'approved').length
  const totalReferrals = referrals.length
  const validReferrals = referrals.filter(r => r.is_valid === true).length
  const totalSettlements = settlements.length
  const pendingSettlements = settlements.filter(s => s.status === 'pending').length

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthSettlementAmount = settlements
    .filter(s => new Date(s.created_at) >= firstDayOfMonth)
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  // 최근 활동 조합
  const activities: RecentActivity[] = []
  recentProgramsResult.data?.forEach(p => {
    const partner = p.partners as unknown as { name: string }
    activities.push({ id: p.id, type: 'partner', description: `새 파트너 신청: ${partner.name}`, createdAt: p.created_at })
  })
  recentReferralsResult.data?.forEach(r => {
    activities.push({ id: r.id, type: 'referral', description: `새 고객 유입: ${r.name?.substring(0, 1)}**`, createdAt: r.created_at })
  })
  recentSettlementsResult.data?.forEach(s => {
    activities.push({ id: s.id, type: 'settlement', description: `정산 ${s.status === 'completed' ? '완료' : '대기'}: ₩${s.amount.toLocaleString()}`, createdAt: s.created_at })
  })
  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const isNewUser = totalPartners === 0 && totalReferrals === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-500 mt-1">파트너 프로그램 현황을 확인하세요</p>
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
              <p className="text-3xl font-bold text-slate-900 mt-1">{totalPartners}</p>
              <p className="text-xs text-green-600 mt-1">활성 {activePartners}명</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">총 유입 고객</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{totalReferrals}</p>
              <p className="text-xs text-green-600 mt-1">유효 {validReferrals}건</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">정산 건수</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{totalSettlements}</p>
              <p className="text-xs text-orange-600 mt-1">대기 {pendingSettlements}건</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">이번 달 정산</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(thisMonthSettlementAmount)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">최근 활동</h2>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {activity.type === 'partner' && '👤'}
                    {activity.type === 'referral' && '📋'}
                    {activity.type === 'settlement' && '💵'}
                  </div>
                  <span className="text-sm text-slate-700">{activity.description}</span>
                </div>
                <span className="text-xs text-slate-400">{formatRelativeTime(activity.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <div className="text-5xl mb-4">📭</div>
            <p>아직 활동 내역이 없습니다</p>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/advertiser/partners">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-bold text-slate-900">파트너 관리</h3>
            <p className="text-sm text-slate-500 mt-1">파트너를 승인하고 관리하세요</p>
          </Card>
        </Link>

        <Link href="/advertiser/campaigns">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📢</div>
            <h3 className="font-bold text-slate-900">캠페인 설정</h3>
            <p className="text-sm text-slate-500 mt-1">수수료와 정책을 설정하세요</p>
          </Card>
        </Link>

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
