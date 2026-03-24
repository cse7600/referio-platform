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
  Palette,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Megaphone,
  ChevronDown,
  ChevronUp,
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
}

export default function ProgramDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { refresh } = useProgram()
  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<string | null>(null)

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
        // 상세 새로고침
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

  const handleAnnouncementClick = async (announcementId: string, isRead: boolean) => {
    setExpandedAnnouncement(prev => prev === announcementId ? null : announcementId)
    if (!isRead) {
      try {
        await fetch('/api/partner/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: announcementId }),
        })
        // 읽음 상태 로컬 업데이트
        if (program) {
          setProgram({
            ...program,
            announcements: program.announcements.map(a =>
              a.id === announcementId ? { ...a, is_read: true } : a
            ),
          })
        }
      } catch {
        // 읽음 처리 실패해도 무시
      }
    }
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

  const brandColor = program.primary_color || '#f97316'
  const isApproved = program.enrollment?.status === 'approved'
  const isPending = program.enrollment?.status === 'pending'
  const isRejected = program.enrollment?.status === 'rejected'
  const notEnrolled = !program.enrollment

  const leadComm = program.enrollment?.lead_commission || program.default_lead_commission || 0
  const contractComm = program.enrollment?.contract_commission || program.default_contract_commission || 0

  return (
    <div className="max-w-3xl mx-auto pb-28">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push('/dashboard/programs')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        프로그램 목록
      </button>

      {/* 헤더 */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <div className="h-2" style={{ backgroundColor: brandColor }} />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              {program.category && CATEGORY_MAP[program.category] && (
                <Badge variant="secondary" className="mb-3 text-xs font-normal">
                  {CATEGORY_MAP[program.category]}
                </Badge>
              )}
              <h1 className="text-2xl font-bold leading-tight">
                {program.program_name || program.company_name}
              </h1>
              <p className="text-gray-500 mt-1">{program.company_name}</p>
            </div>
            {program.homepage_url && (
              <a
                href={program.homepage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                홈페이지
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {program.program_description && (
            <p className="text-gray-600 mt-4 leading-relaxed">
              {program.program_description}
            </p>
          )}

          {/* 커미션 정보 */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs text-blue-600 font-medium">유효 DB 단가</p>
              <p className="text-xl font-bold text-blue-700 mt-1">
                ₩{leadComm.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-xs text-purple-600 font-medium">계약 단가</p>
              <p className="text-xl font-bold text-purple-700 mt-1">
                ₩{contractComm.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 참가 상태 알림 */}
          {isApproved && (
            <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">참가 승인 완료</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-green-800 bg-green-100 px-3 py-2 rounded truncate">
                  {buildReferralLink()}
                </code>
                <Button
                  size="sm"
                  className="shrink-0 bg-green-600 hover:bg-green-700"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5 mr-1" />복사됨</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1" />링크 복사</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {isPending && (
            <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">승인 대기 중</p>
                <p className="text-xs text-yellow-700 mt-1">
                  광고주가 참가 신청을 검토하고 있습니다. 승인되면 추천 링크가 발급됩니다.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">참가 반려</p>
                <p className="text-xs text-red-700 mt-1">
                  아쉽지만 이번 신청은 반려되었습니다. 자세한 사항은 고객센터로 문의해주세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 공지사항 */}
      {program.announcements && program.announcements.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-100 bg-white overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <h3 className="font-semibold">공지사항</h3>
              {program.announcements.some(a => !a.is_read) && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
            <div className="ml-[38px] space-y-2">
              {program.announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className={`rounded-lg border transition-colors ${
                    !announcement.is_read ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100'
                  }`}
                >
                  <button
                    className="w-full text-left p-3 flex items-start justify-between gap-2"
                    onClick={() => handleAnnouncementClick(announcement.id, announcement.is_read)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!announcement.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        )}
                        <p className={`text-sm truncate ${!announcement.is_read ? 'font-semibold' : 'font-medium'}`}>
                          {announcement.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(announcement.sent_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    {expandedAnnouncement === announcement.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                  {expandedAnnouncement === announcement.id && (
                    <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {announcement.body}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 상세 정보 섹션들 */}
      <div className="mt-6 space-y-4">
        {program.activity_guide && (
          <DetailSection
            icon={<BookOpen className="w-4 h-4" />}
            title="활동 가이드"
            description="이렇게 활동하면 수익을 높일 수 있어요"
            content={program.activity_guide}
            accentColor="blue"
          />
        )}

        {program.content_sources && (
          <DetailSection
            icon={<Palette className="w-4 h-4" />}
            title="콘텐츠 소스"
            description="활동에 활용할 수 있는 자료들이에요"
            content={program.content_sources}
            accentColor="indigo"
          />
        )}

        {program.prohibited_activities && (
          <DetailSection
            icon={<ShieldAlert className="w-4 h-4" />}
            title="금지 활동"
            description="아래 활동은 파트너십 해지 사유가 될 수 있어요"
            content={program.prohibited_activities}
            accentColor="red"
          />
        )}

        {program.precautions && (
          <DetailSection
            icon={<AlertTriangle className="w-4 h-4" />}
            title="유의 사항"
            description="참가 전에 꼭 확인해주세요"
            content={program.precautions}
            accentColor="amber"
          />
        )}

        {/* 미디어 자료 */}
        {program.media && program.media.length > 0 && (
          <div className="rounded-xl border border-violet-100 bg-white overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <h3 className="font-semibold">홍보 자료</h3>
                <span className="text-xs text-gray-400">{program.media.length}개</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-[38px]">
                {program.media.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {m.type === 'image' && (
                      <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                        <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {m.type === 'video' && (
                      <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center shrink-0">
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    {m.type === 'youtube' && (
                      <div className="w-12 h-12 rounded bg-red-50 flex items-center justify-center shrink-0">
                        <ExternalLink className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-gray-400">
                        {m.type === 'youtube' ? '유튜브 영상' : m.type === 'image' ? '이미지' : '영상 파일'}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
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

function DetailSection({
  icon,
  title,
  description,
  content,
  accentColor,
}: {
  icon: React.ReactNode
  title: string
  description: string
  content: string
  accentColor: string
}) {
  const colorMap: Record<string, { border: string; iconBg: string; iconText: string }> = {
    blue: { border: 'border-blue-100', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
    indigo: { border: 'border-indigo-100', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
    red: { border: 'border-red-100', iconBg: 'bg-red-50', iconText: 'text-red-600' },
    amber: { border: 'border-amber-100', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  }

  const colors = colorMap[accentColor] || colorMap.blue

  return (
    <div className={`rounded-xl border ${colors.border} bg-white overflow-hidden`}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className={`w-7 h-7 rounded-lg ${colors.iconBg} ${colors.iconText} flex items-center justify-center`}>
            {icon}
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-gray-400 ml-[38px] mb-4">{description}</p>
        <div className="ml-[38px] text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </div>
    </div>
  )
}
