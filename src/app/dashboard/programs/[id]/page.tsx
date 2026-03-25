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

type TabId = 'overview' | 'guide' | 'media' | 'board'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '개요', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'guide', label: '활동 가이드', icon: <BookOpen className="w-3.5 h-3.5" /> },
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
      <div className="max-w-3xl mx-auto text-center py-20">
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

  // Badge counts for tabs
  const unreadAnnouncements = program.announcements?.filter(a => !a.is_read).length || 0
  const boardCount = program.boardPosts?.length || 0
  const mediaCount = program.media?.length || 0
  const hasGuide = !!(program.activity_guide || program.content_sources || program.prohibited_activities || program.precautions)

  return (
    <div className="max-w-3xl mx-auto pb-28">
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
          {TABS.map(tab => {
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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
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

// ─── 활동 가이드 탭 ───────────────────────────────────
function GuideTab({ program, hasGuide }: { program: ProgramDetail; hasGuide: boolean }) {
  if (!hasGuide) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">활동 가이드가 아직 등록되지 않았습니다.</p>
    )
  }

  return (
    <div className="space-y-6">
      {program.activity_guide && (
        <GuideSection
          icon={<BookOpen className="w-4 h-4" />}
          title="활동 가이드"
          subtitle="이렇게 활동하면 수익을 높일 수 있어요"
          content={program.activity_guide}
          accentColor="blue"
          renderStyle="steps"
        />
      )}

      {program.content_sources && (
        <GuideSection
          icon={<FileImage className="w-4 h-4" />}
          title="콘텐츠 소스"
          subtitle="활동에 활용할 수 있는 자료들이에요"
          content={program.content_sources}
          accentColor="indigo"
          renderStyle="list"
        />
      )}

      {program.prohibited_activities && (
        <GuideSection
          icon={<ShieldAlert className="w-4 h-4" />}
          title="금지 활동"
          subtitle="파트너십 해지 사유가 될 수 있어요"
          content={program.prohibited_activities}
          accentColor="red"
          renderStyle="list"
        />
      )}

      {program.precautions && (
        <GuideSection
          icon={<AlertTriangle className="w-4 h-4" />}
          title="유의 사항"
          subtitle="참가 전에 꼭 확인해주세요"
          content={program.precautions}
          accentColor="amber"
          renderStyle="list"
        />
      )}
    </div>
  )
}

// 가이드 섹션 컴포넌트 — 넘버드 리스트는 스텝 뱃지, 불릿은 체크리스트로 렌더링
function GuideSection({
  icon,
  title,
  subtitle,
  content,
  accentColor,
  renderStyle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  content: string
  accentColor: string
  renderStyle: 'steps' | 'list'
}) {
  const colorMap: Record<string, { badge: string; iconBg: string; iconText: string; stepBg: string; stepText: string }> = {
    blue: {
      badge: 'bg-blue-50 border-blue-100',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      stepBg: 'bg-blue-600',
      stepText: 'text-white',
    },
    indigo: {
      badge: 'bg-indigo-50 border-indigo-100',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-600',
      stepBg: 'bg-indigo-600',
      stepText: 'text-white',
    },
    red: {
      badge: 'bg-red-50 border-red-100',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
      stepBg: 'bg-red-500',
      stepText: 'text-white',
    },
    amber: {
      badge: 'bg-amber-50 border-amber-100',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      stepBg: 'bg-amber-500',
      stepText: 'text-white',
    },
  }

  const colors = colorMap[accentColor] || colorMap.blue

  // Parse lines for step/list rendering
  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const isNumberedLine = (line: string) => /^(\d+)[.)]\s/.test(line)
  const isBulletLine = (line: string) => /^[-•*]\s/.test(line)

  const stripPrefix = (line: string) => {
    return line.replace(/^(\d+)[.)]\s/, '').replace(/^[-•*]\s/, '')
  }

  const hasNumbered = lines.some(isNumberedLine)
  const useSteps = renderStyle === 'steps' && hasNumbered

  return (
    <div className={`rounded-xl border ${colors.badge} overflow-hidden`}>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-inherit">
        <div className={`w-7 h-7 rounded-lg ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="px-5 py-4">
        {useSteps ? (
          // 스텝 렌더링
          <ol className="space-y-3">
            {lines.map((line, i) => {
              const isNum = isNumberedLine(line)
              const text = isNum ? stripPrefix(line) : line
              const stepNum = isNum ? (line.match(/^(\d+)/)?.[1] || String(i + 1)) : null

              return (
                <li key={i} className="flex items-start gap-3">
                  {stepNum ? (
                    <span className={`w-5 h-5 rounded-full ${colors.stepBg} ${colors.stepText} text-xs font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                      {stepNum}
                    </span>
                  ) : (
                    <span className="w-5 h-5 shrink-0" />
                  )}
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </li>
              )
            })}
          </ol>
        ) : (
          // 불릿/일반 렌더링
          <ul className="space-y-2">
            {lines.map((line, i) => {
              const isBullet = isBulletLine(line)
              const text = stripPrefix(line)

              return (
                <li key={i} className="flex items-start gap-2.5">
                  {isBullet ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.stepBg} shrink-0 mt-1.5`} />
                  ) : (
                    <span className="text-gray-300 text-xs mt-0.5 shrink-0">·</span>
                  )}
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </li>
              )
            })}
          </ul>
        )}
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

      {/* 파트너 활동 지원 게시판 */}
      {boardPosts && boardPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">파트너 활동 지원</h3>
            <span className="text-xs text-gray-400">{boardPosts.length}개</span>
          </div>
          <div className="space-y-2">
            {boardPosts.map(post => (
              <div key={post.id} className="rounded-lg border border-gray-100">
                <button
                  className="w-full text-left p-3.5 flex items-start justify-between gap-2"
                  onClick={() => setExpandedId(prev => prev === post.id ? null : post.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {expandedId === post.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  )}
                </button>
                {expandedId === post.id && (
                  <div className="px-3.5 pb-3.5 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
