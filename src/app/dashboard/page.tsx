'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Copy,
  Check,
  CheckCircle,
  Circle,
  Users,
  FileCheck,
  Wallet,
  Award,
  ExternalLink,
  Building,
} from 'lucide-react'
import Link from 'next/link'
import { useProgram } from './ProgramContext'

const TIER_COLORS: Record<string, string> = {
  authorized: 'bg-gray-100 text-gray-700',
  silver: 'bg-gray-200 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
}

const TIER_LABELS: Record<string, string> = {
  authorized: 'Authorized',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

interface MilestoneItem {
  id: string
  label: string
  completed: boolean
}

interface ProgramStats {
  total_referrals: number
  total_valid: number
  total_contracts: number
  total_settlement: number
}

interface Promotion {
  id: string
  title: string
  description: string | null
  promotion_type: string
  reward_description: string | null
  end_date: string | null
}

const GUIDES = [
  { title: '블로거를 위한 가이드', href: '/dashboard/guides#blog' },
  { title: '인스타그래머를 위한 가이드', href: '/dashboard/guides#instagram' },
  { title: '유튜버를 위한 가이드', href: '/dashboard/guides#youtube' },
  { title: '지인 영업을 위한 가이드', href: '/dashboard/guides#referral' },
  { title: '카톡방/카페 영업을 위한 가이드', href: '/dashboard/guides#community' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<ProgramStats | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [myRank, setMyRank] = useState<{ rank: number; total: number } | null>(null)
  const { partner, selectedProgram, programs, loading } = useProgram()
  // partner는 ProgramContext에서 공유 — 별도 fetch 제거

  // 프로모션 및 랭킹 로드 (선택된 프로그램의 광고주 기준)
  useEffect(() => {
    const fetchPromotionsAndRank = async () => {
      if (!selectedProgram || !partner?.id) return
      const supabase = createClient()
      const advertiserId = selectedProgram.advertiser_id

      // 프로모션
      const { data: promoData } = await supabase
        .from('partner_promotions')
        .select('id, title, description, promotion_type, reward_description, end_date')
        .eq('advertiser_id', advertiserId)
        .eq('status', 'active')
        .eq('is_visible_to_partners', true)
        .order('created_at', { ascending: false })
        .limit(3)

      setPromotions(promoData || [])

      // 이번 달 랭킹 계산
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { data: monthlyReferrals } = await supabase
        .from('referrals')
        .select('partner_id, is_valid')
        .eq('advertiser_id', advertiserId)
        .eq('is_valid', true)
        .gte('created_at', monthStart)

      // 파트너별 유효 리드 수 집계
      const leadCounts: Record<string, number> = {}
      for (const ref of (monthlyReferrals || [])) {
        if (!ref.partner_id) continue
        leadCounts[ref.partner_id] = (leadCounts[ref.partner_id] || 0) + 1
      }

      // 내 순위 계산
      const myCount = leadCounts[partner.id] || 0
      const higherCount = Object.values(leadCounts).filter(c => c > myCount).length
      const totalPartners = Object.keys(leadCounts).length + (leadCounts[partner.id] === undefined ? 1 : 0)
      setMyRank({ rank: higherCount + 1, total: totalPartners })
    }
    fetchPromotionsAndRank()
  }, [selectedProgram, partner?.id])

  // 선택된 프로그램 기준 통계
  useEffect(() => {
    const fetchStats = async () => {
      if (!partner?.id) return

      const supabase = createClient()

      if (selectedProgram) {
        // 프로그램별 통계: advertiser_id 기준 필터
        const advertiserId = selectedProgram.advertiser_id

        const { data: referrals } = await supabase
          .from('referrals')
          .select('id, is_valid, contract_status')
          .eq('partner_id', partner.id)
          .eq('advertiser_id', advertiserId)

        const { data: settlements } = await supabase
          .from('settlements')
          .select('id, amount, status')
          .eq('partner_id', partner.id)
          .eq('advertiser_id', advertiserId)

        setStats({
          total_referrals: referrals?.length || 0,
          total_valid: referrals?.filter(r => r.is_valid).length || 0,
          total_contracts: referrals?.filter(r => r.contract_status === 'completed').length || 0,
          total_settlement: settlements
            ?.filter(s => s.status === 'completed')
            .reduce((sum, s) => sum + (s.amount || 0), 0) || 0,
        })
      } else {
        // 전체 통계
        const { data: statsData } = await supabase
          .from('partner_stats')
          .select('*')
          .eq('partner_id', partner.id)
          .single()

        setStats(statsData || {
          total_referrals: 0,
          total_valid: 0,
          total_contracts: 0,
          total_settlement: 0,
        })
      }
    }
    fetchStats()
  }, [partner?.id, selectedProgram])

  // 프로그램별 추천 URL 생성
  // tracking_link_url이 있으면 에어브릿지 트래킹 URL 우선 사용 (밀리의서재 등)
  const buildProgramReferralUrl = (program: typeof programs[0]) => {
    // Airbridge tracking link takes priority if assigned
    const trackingUrl = (program as unknown as { tracking_link_url?: string | null }).tracking_link_url
    if (trackingUrl) {
      return trackingUrl
    }

    const adv = program.advertisers as unknown as { landing_url: string | null }
    const refCode = program.referral_code
    if (adv?.landing_url) {
      let base = adv.landing_url
      if (!base.startsWith('http')) base = `https://${base}`
      try {
        const url = new URL(base)
        url.searchParams.set('ref', refCode)
        return url.toString()
      } catch {
        return `${base}?ref=${refCode}`
      }
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://referio.puzl.co.kr'
    return `${origin}/inquiry/${program.advertiser_id}?ref=${refCode}`
  }

  const handleCopy = async (programId: string, url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedId(programId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const currentTier = selectedProgram?.tier || partner?.tier || 'authorized'
  const currentStatus = selectedProgram?.status || partner?.status || 'pending'

  // 마일스톤 계산
  const milestones: MilestoneItem[] = [
    { id: 'signup', label: '파트너 가입 완료', completed: true },
    { id: 'approved', label: '프로그램 승인 받기', completed: currentStatus === 'approved' },
    { id: 'first_referral', label: '첫 고객 유치하기', completed: (stats?.total_referrals || 0) > 0 },
    { id: 'first_valid', label: '첫 유효 DB 달성', completed: (stats?.total_valid || 0) > 0 },
    { id: 'first_contract', label: '첫 계약 달성', completed: (stats?.total_contracts || 0) > 0 },
    { id: 'first_settlement', label: '첫 정산 받기', completed: (stats?.total_settlement || 0) > 0 },
  ]

  const completedCount = milestones.filter(m => m.completed).length
  const progressPercent = Math.round((completedCount / milestones.length) * 100)
  const isAllMilestonesCompleted = progressPercent === 100

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const approvedPrograms = programs.filter(p => p.status === 'approved')
  const hasNoPrograms = approvedPrograms.length === 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 환영 메시지 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {partner?.name}님, 환영합니다!
          </h1>
          <p className="text-gray-500 mt-1">오늘도 함께 성장해요</p>
        </div>
        <Badge className={TIER_COLORS[currentTier]}>
          <Award className="w-3 h-3 mr-1" />
          {TIER_LABELS[currentTier]}
        </Badge>
      </div>

      {/* 진행 중인 이벤트 배너 */}
      {promotions.length > 0 && (
        <div className="space-y-2">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="flex items-start gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg"
            >
              <div className="text-2xl shrink-0">
                {promo.promotion_type === 'ranking' ? '🏆' : promo.promotion_type === 'bonus' ? '💰' : '🎉'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-indigo-900">{promo.title}</p>
                {promo.description && (
                  <p className="text-sm text-indigo-700 mt-0.5 line-clamp-2">{promo.description}</p>
                )}
                {promo.reward_description && (
                  <p className="text-xs text-indigo-600 mt-1">
                    <span className="font-medium">리워드:</span> {promo.reward_description}
                  </p>
                )}
              </div>
              {promo.end_date && (
                <div className="text-xs text-indigo-500 shrink-0 text-right">
                  <p>~{promo.end_date}</p>
                  <p>까지</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 프로그램 미참가 안내 */}
      {hasNoPrograms && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Building className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-orange-800">프로그램에 참가하세요</p>
                <p className="text-sm text-orange-600 mt-1">
                  어필리에이트 프로그램에 참가하면 추천 링크를 발급받고 커미션을 받을 수 있습니다.
                </p>
              </div>
              <Link href="/dashboard/programs">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  프로그램 찾기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 승인 대기 알림 */}
      {selectedProgram?.status === 'pending' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Circle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-yellow-800">프로그램 승인 대기 중</p>
                <p className="text-sm text-yellow-600">
                  광고주 승인 후 활동을 시작하실 수 있습니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 진행률 - 프로그램 참가 중일 때만 */}
      {selectedProgram && !isAllMilestonesCompleted && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">전체 진행률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-2">
              <Progress value={progressPercent} className="flex-1" />
              <span className="text-sm font-medium text-gray-600">
                {completedCount}/{milestones.length} 완료
              </span>
            </div>
            <p className="text-sm text-gray-500">{progressPercent}% 달성</p>
          </CardContent>
        </Card>
      )}

      {/* 내 추천 URL — 승인된 전체 프로그램 목록 */}
      {approvedPrograms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">내 추천 URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvedPrograms.map((prog) => {
              const adv = prog.advertisers as unknown as { program_name: string | null; company_name: string }
              const url = buildProgramReferralUrl(prog)
              const isCopied = copiedId === prog.id
              return (
                <div key={prog.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {adv.program_name || adv.company_name}
                    </span>
                    <code className="text-xs text-gray-400">코드: {prog.referral_code}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-xs truncate text-gray-700">
                      {url}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={() => handleCopy(prog.id, url)}
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-gray-400 pt-1">
              링크를 공유하면 유입 고객이 자동으로 기록됩니다
            </p>
          </CardContent>
        </Card>
      )}

      {/* 마일스톤 */}
      {selectedProgram && !isAllMilestonesCompleted && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">마일스톤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">시작하기</h4>
                <div className="space-y-3">
                  {milestones.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      <span className={item.completed ? 'text-gray-700' : 'text-gray-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">활동하기</h4>
                <div className="space-y-3">
                  {milestones.slice(2, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      <span className={item.completed ? 'text-gray-700' : 'text-gray-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">성장하기</h4>
                <div className="space-y-3">
                  {milestones.slice(4, 6).map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      <span className={item.completed ? 'text-gray-700' : 'text-gray-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 현재 진행 상황 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-cards">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">승인 상태</p>
                <p className="font-semibold">
                  {currentStatus === 'approved' ? '승인' :
                   currentStatus === 'pending' ? '대기' : '반려'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">유치 고객</p>
                <p className="font-semibold">{stats?.total_referrals || 0}명</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">유효 DB</p>
                <p className="font-semibold">{stats?.total_valid || 0}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">누적 정산</p>
                <p className="font-semibold">
                  ₩{(stats?.total_settlement || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 이번 달 내 순위 */}
      {myRank && selectedProgram?.status === 'approved' && (
        <Card className="border-indigo-100 bg-indigo-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {myRank.rank === 1 ? '🥇' : myRank.rank === 2 ? '🥈' : myRank.rank === 3 ? '🥉' : '🏅'}
              </div>
              <div>
                <p className="font-semibold text-indigo-900">
                  이번 달 내 순위: <span className="text-indigo-600">{myRank.rank}위</span>
                  <span className="text-indigo-400 font-normal text-sm ml-1">/ 전체 {myRank.total}명</span>
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">유효 리드 수 기준</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필독 콘텐츠 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">콘텐츠 작성 전 필독</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GUIDES.map((guide) => (
              <a
                key={guide.title}
                href={guide.href}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium">{guide.title}</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
