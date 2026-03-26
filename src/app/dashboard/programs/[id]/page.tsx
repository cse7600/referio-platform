'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  X,
  ExternalLink,
  BookOpen,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Megaphone,
  ChevronDown,
  ChevronUp,
  FileImage,
  LayoutGrid,
  Bell,
  Youtube,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { useProgram } from '@/app/dashboard/ProgramContext'
import dynamic from 'next/dynamic'

const MarkdownRenderer = dynamic(
  () => import('@/components/editor/MarkdownRenderer'),
  { ssr: false, loading: () => <div className="h-10 animate-pulse bg-gray-100 rounded" /> }
)

const CATEGORY_MAP: Record<string, string> = {
  security: '보안/CCTV',
  telecom: '인터넷/통신',
  insurance: '보험/금융',
  education: '교육',
  beauty: '뷰티/건강',
  shopping: '쇼핑',
  realestate: '부동산',
  automobile: '자동차',
  travel: '여행/숙박',
  pet: '반려동물',
  food: '식품',
  electronics: '가전/IT',
  etc: '기타',
  legal: '법률',
}

interface ProgramDetail {
  id: string
  company_name: string
  program_name: string | null
  program_description: string | null
  logo_url: string | null
  primary_color: string | null
  category: string | null
  homepage_url: string | null
  landing_url: string | null
  default_lead_commission: number
  default_contract_commission: number
  activity_guide: string | null
  content_sources: string | null
  prohibited_activities: string | null
  precautions: string | null
  is_system?: boolean
  is_affiliate_campaign?: boolean
  affiliate_campaign_type?: string
  reward_trigger?: string
  enrollment: {
    id: string
    status: string
    referral_code: string
    lead_commission: number
    contract_commission: number
    applied_at: string
    approved_at: string | null
  } | null
  media: Array<{
    id: string
    type: 'image' | 'video' | 'youtube'
    url: string
    name: string
    description: string | null
  }>
  announcements: Array<{
    id: string
    title: string
    body: string
    sent_at: string
    is_read: boolean
  }>
  boardPosts: Array<{
    id: string
    title: string
    content: string
    post_type: string
    created_at: string
  }>
}

type TabId = 'overview' | 'guide' | 'rules' | 'caution' | 'media' | 'board'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '개요', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'guide', label: '활동 가이드', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'rules', label: '금지활동', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { id: 'caution', label: '유의사항', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: 'media', label: '홍보자료', icon: <FileImage className="w-3.5 h-3.5" /> },
  { id: 'board', label: '공지·지원', icon: <Bell className="w-3.5 h-3.5" /> },
]

export default function ProgramDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { refresh } = useProgram()
  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const programId = params.id as string

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/partner/programs/${programId}`)
        if (res.ok) {
          const data = await res.json()
          setProgram(data.program)
        }
      } catch (error) {
        console.error('Failed to fetch program detail:', error)
      }
      setLoading(false)
    }
    fetchDetail()
  }, [programId])

  const handleApply = async () => {
    setApplying(true)
    try {
      const res = await fetch('/api/partner/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiser_id: programId }),
      })

      if (res.ok) {
        toast.success('참가 신청이 완료되었습니다')
        const refreshRes = await fetch(`/api/partner/programs/${programId}`)
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setProgram(data.program)
        }
        await refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || '참가 신청에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setApplying(false)
  }

  const buildReferralLink = () => {
    if (!program?.enrollment?.referral_code) return ''
    const refCode = program.enrollment.referral_code

    // Affiliate campaign uses /api/r/{shortCode} redirect
    if (program.is_affiliate_campaign) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://referio.puzl.co.kr'
      return `${origin}/api/r/${refCode}`
    }

    if (program.landing_url) {
      let base = program.landing_url
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        base = `https://${base}`
      }
      const url = new URL(base)
      url.searchParams.set('ref', refCode)
      return url.toString()
    }
    return `https://referio.kr/inquiry/${program.id}?ref=${refCode}`
  }

  const handleCopyLink = async () => {
    if (!program?.enrollment?.referral_code) return
    const link = buildReferralLink()
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('추천 링크가 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="w-full text-center py-20">
        <p className="text-gray-500 mb-4">프로그램을 찾을 수 없습니다</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/programs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  const brandColor = program.primary_color || '#6366f1'
  const isApproved = program.enrollment?.status === 'approved'
  const isPending = program.enrollment?.status === 'pending'
  const isRejected = program.enrollment?.status === 'rejected'
  const notEnrolled = !program.enrollment

  const leadComm = program.enrollment?.lead_commission || program.default_lead_commission || 0
  const contractComm = program.enrollment?.contract_commission || program.default_contract_commission || 0

  // Affiliate campaign detail view
  if (program.is_affiliate_campaign) {
    const isPartnerRecruit = program.affiliate_campaign_type === 'partner_recruit'
    const rewardAmount = program.default_lead_commission || 0

    return (
      <div className="w-full pb-28">
        <button
          onClick={() => router.push('/dashboard/programs')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          프로그램 목록
        </button>

        <div className="rounded-xl border overflow-hidden bg-white">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className="bg-indigo-600 text-white text-[10px]">Referio Official</Badge>
              {isApproved && (
                <Badge className="bg-green-100 text-green-700 text-xs font-normal">
                  <Check className="w-3 h-3 mr-1" />참가 중
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold leading-tight">
              {isPartnerRecruit ? '파트너 모집 프로그램' : '광고주 모집 프로그램'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isPartnerRecruit
                ? 'Referio 파트너를 소개해주세요. 소개한 파트너가 가입 완료되면 보상을 드립니다.'
                : 'Referio를 도입할 만한 기업을 소개해주세요. 유료 플랜 시작 시 보상을 드립니다.'}
            </p>

            {/* 보상 금액 */}
            <div className="mt-4 bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">
                {program.reward_trigger === 'signup' ? '가입 완료 시 보상' : '유료 플랜 시작 시 보상'}
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                ₩{rewardAmount.toLocaleString()}
              </p>
            </div>

            {/* 추천 링크 */}
            {isApproved && (
              <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-xs font-medium text-green-700 mb-2">내 추천 링크</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-green-800 bg-green-100 px-2.5 py-1.5 rounded truncate">
                    {buildReferralLink()}
                  </code>
                  <Button
                    size="sm"
                    className="shrink-0 bg-green-600 hover:bg-green-700 text-xs h-8"
                    onClick={handleCopyLink}
                  >
                    {copied ? <><Check className="w-3 h-3 mr-1" />복사됨</> : <><Copy className="w-3 h-3 mr-1" />복사</>}
                  </Button>
                </div>
              </div>
            )}

            {notEnrolled && (
              <div className="mt-4">
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleApply}
                  disabled={applying}
                >
                  {applying ? '신청 중...' : '참가 신청'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 어떻게 작동하나요? */}
        <div className="mt-4 rounded-xl border bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-base mb-4">어떻게 작동하나요?</h2>
          <ol className="space-y-3">
            {isPartnerRecruit ? (
              <>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-gray-700">내 추천 링크를 영업인, 프리랜서, 커뮤니티에 공유</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p className="text-sm text-gray-700">링크로 접속한 사람이 Referio 파트너로 가입</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p className="text-sm text-gray-700">가입 완료 시 ₩{rewardAmount.toLocaleString()} 보상 지급</p>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-gray-700">파트너 마케팅이 필요한 B2B 기업에게 Referio 소개</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p className="text-sm text-gray-700">소개한 기업이 Referio 광고주로 가입</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p className="text-sm text-gray-700">유료 플랜 시작 시 ₩{rewardAmount.toLocaleString()} 보상 지급</p>
                </li>
              </>
            )}
          </ol>
        </div>

        {/* 추천 대상 & 보상 조건 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-sm mb-3">추천 대상</h3>
            <ul className="space-y-2">
              {isPartnerRecruit ? (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />영업/마케팅 종사자</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />프리랜서 컨설턴트</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />커뮤니티 운영자</li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />B2B SaaS 종사자</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />영업/마케팅 컨설턴트</li>
                  <li className="flex items-center gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />스타트업 네트워크 보유자</li>
                </>
              )}
            </ul>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-sm mb-3">보상 조건</h3>
            <p className="text-sm text-gray-700">
              {isPartnerRecruit
                ? '소개한 사람이 Referio 파트너 가입을 완료하면 보상이 지급됩니다.'
                : '소개한 기업이 Referio 유료 플랜을 시작하면 보상이 지급됩니다.'}
            </p>
          </div>
        </div>

        {/* 하단 고정 CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t z-50">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {isPartnerRecruit ? '파트너 모집 프로그램' : '광고주 모집 프로그램'}
              </p>
              <p className="text-xs text-gray-500">
                보상 ₩{rewardAmount.toLocaleString()}
              </p>
            </div>

            {notEnrolled && (
              <Button
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 px-6"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? '신청 중...' : '참가 신청'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}

            {isApproved && (
              <Button
                className="shrink-0 bg-green-600 hover:bg-green-700 px-6"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-1.5" />복사 완료</>
                ) : (
                  <><Copy className="w-4 h-4 mr-1.5" />추천 링크 복사</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Badge counts for tabs
  const unreadAnnouncements = program.announcements?.filter(a => !a.is_read).length || 0
  const boardCount = program.boardPosts?.length || 0
  const mediaCount = program.media?.length || 0
  const hasGuide = !!program.activity_guide
  const hasRules = !!program.prohibited_activities
  const hasCaution = !!program.precautions

  return (
    <div className="w-full pb-28">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push('/dashboard/programs')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        프로그램 목록
      </button>

      {/* 프로그램 헤더 */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <div className="h-1.5" style={{ backgroundColor: brandColor }} />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {program.category && CATEGORY_MAP[program.category] && (
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">
                    {CATEGORY_MAP[program.category]}
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-green-100 text-green-700 text-xs font-normal shrink-0">
                    <Check className="w-3 h-3 mr-1" />참가 중
                  </Badge>
                )}
                {isPending && (
                  <Badge className="bg-yellow-100 text-yellow-700 text-xs font-normal shrink-0">
                    <Clock className="w-3 h-3 mr-1" />승인 대기
                  </Badge>
                )}
                {isRejected && (
                  <Badge className="bg-red-100 text-red-700 text-xs font-normal shrink-0">
                    <X className="w-3 h-3 mr-1" />반려
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold leading-tight truncate">
                {program.program_name || program.company_name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{program.company_name}</p>
            </div>
            {program.homepage_url && (
              <a
                href={program.homepage_url.startsWith('http') ? program.homepage_url : `https://${program.homepage_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors border rounded-md px-2.5 py-1.5"
              >
                홈페이지
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* 커미션 칩 */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-3 py-1.5 text-sm font-medium">
              <span className="text-xs text-blue-500">유효 DB</span>
              <span className="font-bold">₩{leadComm.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 text-sm font-medium">
              <span className="text-xs text-purple-500">계약</span>
              <span className="font-bold">₩{contractComm.toLocaleString()}</span>
            </div>
          </div>

          {/* 승인 시 추천 링크 */}
          {isApproved && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-700 mb-2">내 추천 링크</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-green-800 bg-green-100 px-2.5 py-1.5 rounded truncate">
                  {buildReferralLink()}
                </code>
                <Button
                  size="sm"
                  className="shrink-0 bg-green-600 hover:bg-green-700 text-xs h-8"
                  onClick={handleCopyLink}
                >
                  {copied ? <><Check className="w-3 h-3 mr-1" />복사됨</> : <><Copy className="w-3 h-3 mr-1" />복사</>}
                </Button>
              </div>
            </div>
          )}

          {isPending && (
            <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-2">
              <Clock className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">승인 대기 중</p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  광고주가 신청을 검토하고 있습니다. 승인 후 추천 링크가 발급됩니다.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">참가 반려</p>
                <p className="text-xs text-red-700 mt-0.5">
                  이번 신청은 반려되었습니다. 자세한 사항은 고객센터로 문의해주세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mt-4 bg-white border rounded-xl overflow-hidden">
        <div className="flex border-b overflow-x-auto no-scrollbar">
          {TABS.filter(tab => {
            if (tab.id === 'rules') return hasRules
            if (tab.id === 'caution') return hasCaution
            return true
          }).map(tab => {
            // Badge counts per tab
            let count: number | null = null
            if (tab.id === 'media') count = mediaCount > 0 ? mediaCount : null
            if (tab.id === 'board') count = (unreadAnnouncements + boardCount) > 0 ? unreadAnnouncements + boardCount : null

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {count !== null && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-5 sm:p-6">
          {/* 개요 탭 */}
          {activeTab === 'overview' && (
            <OverviewTab program={program} />
          )}

          {/* 활동 가이드 탭 */}
          {activeTab === 'guide' && (
            <GuideTab program={program} hasGuide={hasGuide} />
          )}

          {/* 금지활동 탭 */}
          {activeTab === 'rules' && (
            <RulesTab content={program.prohibited_activities} hasContent={hasRules} />
          )}

          {/* 유의사항 탭 */}
          {activeTab === 'caution' && (
            <CautionTab content={program.precautions} hasContent={hasCaution} />
          )}

          {/* 홍보자료 탭 */}
          {activeTab === 'media' && (
            <MediaTab media={program.media} />
          )}

          {/* 공지·지원 탭 */}
          {activeTab === 'board' && (
            <BoardTab
              announcements={program.announcements}
              boardPosts={program.boardPosts}
              programId={program.id}
              onAnnouncementRead={(id) => {
                setProgram(prev => prev ? {
                  ...prev,
                  announcements: prev.announcements.map(a =>
                    a.id === id ? { ...a, is_read: true } : a
                  ),
                } : prev)
              }}
            />
          )}
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t z-50">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {program.program_name || program.company_name}
            </p>
            <p className="text-xs text-gray-500">
              DB ₩{leadComm.toLocaleString()} · 계약 ₩{contractComm.toLocaleString()}
            </p>
          </div>

          {notEnrolled && (
            <Button
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 px-6"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? '신청 중...' : '참가 신청'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}

          {isApproved && (
            <Button
              className="shrink-0 bg-green-600 hover:bg-green-700 px-6"
              onClick={handleCopyLink}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-1.5" />복사 완료</>
              ) : (
                <><Copy className="w-4 h-4 mr-1.5" />추천 링크 복사</>
              )}
            </Button>
          )}

          {isPending && (
            <Badge className="shrink-0 bg-yellow-100 text-yellow-700 px-4 py-2">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              승인 대기 중
            </Badge>
          )}

          {isRejected && (
            <Badge className="shrink-0 bg-red-100 text-red-700 px-4 py-2">
              <X className="w-3.5 h-3.5 mr-1.5" />
              참가 반려
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 개요 탭 ───────────────────────────────────────────
function OverviewTab({ program }: { program: ProgramDetail }) {
  if (!program.program_description) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">프로그램 소개가 아직 없습니다.</p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">프로그램 소개</h3>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {program.program_description}
        </p>
      </div>

      {/* 주요 정보 테이블 */}
      <div className="border rounded-lg overflow-hidden mt-4">
        <table className="w-full text-sm">
          <tbody>
            {program.category && (
              <tr className="border-b last:border-0">
                <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 w-28 shrink-0">업종</td>
                <td className="px-4 py-3 text-gray-800">{CATEGORY_MAP[program.category] || program.category}</td>
              </tr>
            )}
            {program.homepage_url && (
              <tr className="border-b last:border-0">
                <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 w-28">홈페이지</td>
                <td className="px-4 py-3">
                  <a
                    href={program.homepage_url.startsWith('http') ? program.homepage_url : `https://${program.homepage_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    {program.homepage_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            )}
            <tr className="border-b last:border-0">
              <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 w-28">유효 DB 단가</td>
              <td className="px-4 py-3 font-semibold text-blue-700">
                ₩{(program.default_lead_commission || 0).toLocaleString()}
              </td>
            </tr>
            <tr className="border-b last:border-0">
              <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 w-28">계약 단가</td>
              <td className="px-4 py-3 font-semibold text-purple-700">
                ₩{(program.default_contract_commission || 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Markdown section parser ─────────────────────────
interface ParsedSection { title: string; body: string; emoji?: string }

// Standard parser: splits by ## h2 headings only (for activity_guide)
function parseMarkdownSections(content: string): ParsedSection[] {
  const lines = content.split('\n')
  const sections: ParsedSection[] = []
  let currentTitle = ''
  let currentEmoji = ''
  let currentBody: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)

    if (h2Match) {
      if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join('\n').trim(), emoji: currentEmoji })
      const titleText = h2Match[1].trim()
      // Extract leading emoji if present
      const emojiPrefix = titleText.match(/^([\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}✅❌⚠️💡🚀🎯💰🏆📊💳📢✔️👥📱💬🔄🖊️📸🎬🤝🔑])\s*/u)
      currentEmoji = emojiPrefix ? emojiPrefix[1] : ''
      currentTitle = emojiPrefix ? titleText.slice(emojiPrefix[0].length).trim() : titleText
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join('\n').trim(), emoji: currentEmoji })

  // If no ## headings found, return whole content as one section
  if (sections.length === 0) return [{ title: '가이드', body: content }]
  return sections
}

// Channel-aware parser: splits by top-level emoji headings (for content_sources)
function parseChannelSections(content: string): ParsedSection[] {
  const lines = content.split('\n')
  const sections: ParsedSection[] = []
  let currentTitle = ''
  let currentEmoji = ''
  let currentBody: string[] = []

  // Match emoji at line start — only non-indented lines
  const emojiHeadingRegex = /^([\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}✅❌⚠️💡🚀🎯💰🏆📊💳📢✔️👥📱💬🔄🖊️📸🎬🤝🔑])\s+(.+)$/u

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)
    const emojiMatch = line.match(emojiHeadingRegex)

    if (h2Match) {
      if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join('\n').trim(), emoji: currentEmoji })
      currentTitle = h2Match[1].trim()
      currentEmoji = ''
      currentBody = []
    } else if (emojiMatch && !line.startsWith('  ') && !line.startsWith('\t')) {
      // Check if this looks like a major channel heading (contains "가이드" or "메이트")
      const text = emojiMatch[2].trim()
      const isChannelHeading = text.includes('가이드') || text.includes('메이트')
      if (isChannelHeading) {
        if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join('\n').trim(), emoji: currentEmoji })
        currentEmoji = emojiMatch[1]
        currentTitle = text
        currentBody = []
      } else {
        currentBody.push(line)
      }
    } else {
      currentBody.push(line)
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join('\n').trim(), emoji: currentEmoji })

  if (sections.length === 0) return [{ title: '가이드', body: content }]
  return sections
}

// ─── Channel card config for content_sources ─────────
const CHANNEL_CONFIG: Record<string, { icon: string; color: string }> = {
  '블로거': { icon: '✍️', color: 'bg-green-50 border-green-200 text-green-700' },
  '블로그': { icon: '✍️', color: 'bg-green-50 border-green-200 text-green-700' },
  '인스타그램': { icon: '📸', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  '유튜버': { icon: '🎬', color: 'bg-red-50 border-red-200 text-red-700' },
  '유튜브': { icon: '🎬', color: 'bg-red-50 border-red-200 text-red-700' },
  '지인 영업': { icon: '🤝', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  '지인영업': { icon: '🤝', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  'DM 자동화': { icon: '🤖', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  '카톡방': { icon: '💬', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
}

function getChannelConfig(title: string): { icon: string; color: string } {
  for (const [key, config] of Object.entries(CHANNEL_CONFIG)) {
    if (title.includes(key)) return config
  }
  return { icon: '📄', color: 'bg-gray-50 border-gray-200 text-gray-700' }
}

// ─── Sectioned Guide (TOC + Content panel) ───────────
function SectionedGuide({ sections, accentColor }: { sections: ParsedSection[]; accentColor: string }) {
  const [activeIdx, setActiveIdx] = useState(0)

  const colorMap: Record<string, { active: string; hover: string; indicator: string }> = {
    blue:   { active: 'bg-blue-50 text-blue-700 border-blue-200', hover: 'hover:bg-blue-50/50', indicator: 'bg-blue-500' },
    indigo: { active: 'bg-indigo-50 text-indigo-700 border-indigo-200', hover: 'hover:bg-indigo-50/50', indicator: 'bg-indigo-500' },
  }
  const colors = colorMap[accentColor] || colorMap.blue

  return (
    <div className="flex gap-0 min-h-[300px]">
      {/* Left sidebar TOC */}
      <div className="w-44 shrink-0 border-r border-gray-100 pr-1">
        <nav className="space-y-0.5 sticky top-0">
          {sections.map((sec, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeIdx === idx
                  ? `${colors.active} font-semibold border`
                  : `text-gray-600 ${colors.hover} border border-transparent`
              }`}
            >
              <div className="flex items-center gap-2">
                {sec.emoji && <span className="text-base shrink-0">{sec.emoji}</span>}
                <span className="truncate leading-snug">{sec.title}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Right content panel */}
      <div className="flex-1 pl-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-1.5 h-6 rounded-full ${colors.indicator}`} />
          <h3 className="font-semibold text-gray-900">
            {sections[activeIdx]?.emoji && <span className="mr-1.5">{sections[activeIdx].emoji}</span>}
            {sections[activeIdx]?.title}
          </h3>
        </div>
        <div className="pr-2">
          <MarkdownRenderer content={preprocessGuideContent(sections[activeIdx]?.body || '')} />
        </div>
      </div>
    </div>
  )
}

// ─── Channel card grid for content_sources ───────────
function ChannelCardGrid({ sections }: { sections: ParsedSection[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      {/* Card grid */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((sec, idx) => {
          const config = getChannelConfig(sec.title)
          const isExpanded = expandedIdx === idx
          return (
            <button
              key={idx}
              onClick={() => setExpandedIdx(prev => prev === idx ? null : idx)}
              className={`text-left rounded-xl border-2 p-4 transition-all ${
                isExpanded
                  ? `${config.color} ring-2 ring-offset-1 ring-current/20`
                  : `${config.color} opacity-80 hover:opacity-100`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{config.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{sec.title}</p>
                  <p className="text-xs opacity-70 mt-0.5">
                    {sec.body.split('\n').filter(l => l.trim()).length}개 항목
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs opacity-60">
                {isExpanded ? (
                  <><ChevronUp className="w-3 h-3" />접기</>
                ) : (
                  <><ChevronDown className="w-3 h-3" />펼치기</>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded content below grid */}
      {expandedIdx !== null && sections[expandedIdx] && (
        <div className="rounded-xl border bg-white p-5 transition-all duration-200">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <span className="text-xl">{getChannelConfig(sections[expandedIdx].title).icon}</span>
            <h4 className="font-semibold text-sm text-gray-900">{sections[expandedIdx].title}</h4>
            <button
              onClick={() => setExpandedIdx(null)}
              className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="pr-2">
            <MarkdownRenderer content={preprocessGuideContent(sections[expandedIdx].body)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 활동 가이드 탭 ───────────────────────────────────
function GuideTab({ program, hasGuide }: { program: ProgramDetail; hasGuide: boolean }) {
  if (!hasGuide || !program.activity_guide) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">활동 가이드가 아직 등록되지 않았습니다.</p>
    )
  }

  const guideSections = parseMarkdownSections(program.activity_guide)

  return (
    <div>
      {guideSections.length >= 3 ? (
        <SectionedGuide sections={guideSections} accentColor="blue" />
      ) : (
        <MarkdownRenderer content={preprocessGuideContent(program.activity_guide)} />
      )}
    </div>
  )
}

// ─── 금지활동 탭 — 경고 배너 + 체크리스트 스타일 ─────────
function RulesTab({ content, hasContent }: { content: string | null; hasContent: boolean }) {
  if (!hasContent || !content) {
    return <p className="text-sm text-gray-400 text-center py-8">금지활동 안내가 아직 등록되지 않았습니다.</p>
  }

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div className="bg-red-600 text-white rounded-xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-sm">금지활동 안내</p>
          <p className="text-xs text-red-100 mt-0.5">아래 항목 위반 시 파트너 자격이 즉시 해지될 수 있습니다</p>
        </div>
      </div>

      {/* Content rendered as checklist style */}
      <div className="rounded-xl border border-red-100 bg-red-50/30 p-5">
        <MarkdownRenderer content={preprocessGuideContent(content)} className="rules-checklist" />
      </div>
    </div>
  )
}

// ─── 유의사항 탭 — 강조 배너 + 체크리스트 ────────────────
function CautionTab({ content, hasContent }: { content: string | null; hasContent: boolean }) {
  if (!hasContent || !content) {
    return <p className="text-sm text-gray-400 text-center py-8">유의사항이 아직 등록되지 않았습니다.</p>
  }

  return (
    <div className="space-y-4">
      {/* Caution banner */}
      <div className="bg-amber-500 text-white rounded-xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-sm">유의사항</p>
          <p className="text-xs text-amber-100 mt-0.5">활동 전 반드시 확인해주세요</p>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-5">
        <MarkdownRenderer content={preprocessGuideContent(content)} />
      </div>
    </div>
  )
}

// 가이드 섹션 컴포넌트 — MarkdownRenderer로 완전 렌더링
// Preprocess guide content: ensure emoji-starting lines are separate paragraphs
function preprocessGuideContent(content: string): string {
  return content
    // Add blank line before emoji-starting lines (paragraph separation)
    .replace(/\n([\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅❌⚠️💡🚀🎯💰🏆📊💳📢✔️👥📱💬🔄1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟])/gu, '\n\n$1')
    // Add blank lines around horizontal rules
    .replace(/\n(---)\n/g, '\n\n$1\n\n')
    // Collapse 3+ consecutive blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function GuideSection({
  icon,
  title,
  subtitle,
  content,
  accentColor,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  content: string
  accentColor: string
  renderStyle?: 'steps' | 'list'
}) {
  const colorMap: Record<string, { badge: string; iconBg: string; iconText: string }> = {
    blue:   { badge: 'bg-blue-50 border-blue-100',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600' },
    indigo: { badge: 'bg-indigo-50 border-indigo-100', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
    red:    { badge: 'bg-red-50 border-red-100',     iconBg: 'bg-red-100',    iconText: 'text-red-600' },
    amber:  { badge: 'bg-amber-50 border-amber-100', iconBg: 'bg-amber-100',  iconText: 'text-amber-600' },
  }
  const colors = colorMap[accentColor] || colorMap.blue

  return (
    <div className={`rounded-xl border ${colors.badge} overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-inherit">
        <div className={`w-7 h-7 rounded-lg ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-4">
        <MarkdownRenderer content={preprocessGuideContent(content)} />
      </div>
    </div>
  )
}

// ─── 홍보자료 탭 ──────────────────────────────────────
function MediaTab({ media }: { media: ProgramDetail['media'] }) {
  if (!media || media.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <FileImage className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">등록된 홍보 자료가 없습니다.</p>
      </div>
    )
  }

  const images = media.filter(m => m.type === 'image')
  const others = media.filter(m => m.type !== 'image')

  return (
    <div className="space-y-5">
      {images.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">이미지</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map(m => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border overflow-hidden hover:border-indigo-300 transition-colors"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={m.url}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate text-gray-700">{m.name}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">영상 / 링크</h3>
          <div className="space-y-2">
            {others.map(m => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  m.type === 'youtube' ? 'bg-red-50' : 'bg-slate-100'
                }`}>
                  {m.type === 'youtube' ? (
                    <Youtube className="w-5 h-5 text-red-500" />
                  ) : (
                    <Play className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-gray-800">{m.name}</p>
                  {m.description && (
                    <p className="text-xs text-gray-400 truncate">{m.description}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 공지·지원 탭 ─────────────────────────────────────
function BoardTab({
  announcements,
  boardPosts,
  programId,
  onAnnouncementRead,
}: {
  announcements: ProgramDetail['announcements']
  boardPosts: ProgramDetail['boardPosts']
  programId: string
  onAnnouncementRead: (id: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleClick = async (id: string, isRead: boolean, type: 'announcement' | 'board') => {
    setExpandedId(prev => prev === id ? null : id)
    if (type === 'announcement' && !isRead) {
      try {
        await fetch('/api/partner/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: id }),
        })
        onAnnouncementRead(id)
      } catch {
        // 읽음 처리 실패 무시
      }
    }
  }

  const hasContent = (announcements?.length || 0) + (boardPosts?.length || 0) > 0

  if (!hasContent) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">등록된 공지사항이나 지원 게시물이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 공지사항 */}
      {announcements && announcements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">공지사항</h3>
            {announcements.some(a => !a.is_read) && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </div>
          <div className="space-y-2">
            {announcements.map(a => (
              <div
                key={a.id}
                className={`rounded-lg border transition-colors ${
                  !a.is_read ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100'
                }`}
              >
                <button
                  className="w-full text-left p-3.5 flex items-start justify-between gap-2"
                  onClick={() => handleClick(a.id, a.is_read, 'announcement')}
                >
                  <div className="min-w-0 flex items-start gap-2">
                    {!a.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    )}
                    <div>
                      <p className={`text-sm ${!a.is_read ? 'font-semibold' : 'font-medium'} text-gray-800`}>
                        {a.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.sent_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  {expandedId === a.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  )}
                </button>
                {expandedId === a.id && (
                  <div className="px-3.5 pb-3.5 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파트너 활동 지원 게시판 — PC: 좌측 목록 + 우측 패널 / 모바일: 전체화면 오버레이 */}
      {boardPosts && boardPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">파트너 활동 지원</h3>
            <span className="text-xs text-gray-400">{boardPosts.length}개</span>
          </div>

          {/* PC layout: sidebar list + right panel */}
          <div className="hidden sm:flex gap-0 min-h-[300px]">
            {/* Left card list */}
            <div className="w-64 shrink-0 border-r border-gray-100 pr-3 space-y-2 overflow-y-auto max-h-[500px]">
              {boardPosts.map(post => {
                const channelConfig = getChannelConfig(post.title)
                const isSelected = expandedId === post.id
                return (
                  <button
                    key={post.id}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      isSelected
                        ? `${channelConfig.color} border-2 font-semibold`
                        : `border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50`
                    }`}
                    onClick={() => handleClick(post.id, true, 'board')}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg shrink-0 mt-0.5">{channelConfig.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 line-clamp-2">{post.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right content panel */}
            <div className="flex-1 pl-4 min-w-0">
              {expandedId && boardPosts.find(p => p.id === expandedId) ? (
                <div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                    <h4 className="font-semibold text-sm text-gray-900">
                      {boardPosts.find(p => p.id === expandedId)!.title}
                    </h4>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="pr-2">
                    <MarkdownRenderer content={boardPosts.find(p => p.id === expandedId)!.content} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  게시물을 선택하세요
                </div>
              )}
            </div>
          </div>

          {/* Mobile layout: card grid + fullscreen overlay */}
          <div className="sm:hidden">
            <div className="grid grid-cols-1 gap-2">
              {boardPosts.map(post => {
                const channelConfig = getChannelConfig(post.title)
                return (
                  <button
                    key={post.id}
                    className="w-full text-left rounded-xl border-2 p-4 transition-all border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
                    onClick={() => handleClick(post.id, true, 'board')}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{channelConfig.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2">{post.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Mobile fullscreen overlay */}
            {expandedId && boardPosts.find(p => p.id === expandedId) && (
              <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
                  <h4 className="font-semibold text-sm text-gray-900 truncate pr-4">
                    {boardPosts.find(p => p.id === expandedId)!.title}
                  </h4>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 pb-20">
                  <MarkdownRenderer content={boardPosts.find(p => p.id === expandedId)!.content} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
