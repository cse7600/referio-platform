'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Building, Check, Clock, X, ArrowRight, Copy, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useProgram } from '@/app/dashboard/ProgramContext'

interface ProgramItem {
  id: string
  company_name: string
  program_name: string | null
  program_description: string | null
  logo_url: string | null
  primary_color: string | null
  homepage_url: string | null
  landing_url: string | null
  default_lead_commission: number
  default_contract_commission: number
  category: string | null
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
  } | null
}

const CATEGORY_MAP: Record<string, string> = {
  all: '전체',
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

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  approved: { label: '참가중', icon: <Check className="w-3 h-3" />, className: 'bg-green-100 text-green-700' },
  pending: { label: '승인 대기', icon: <Clock className="w-3 h-3" />, className: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: '반려됨', icon: <X className="w-3 h-3" />, className: 'bg-red-100 text-red-700' },
}

export default function ProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { refresh } = useProgram()

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch('/api/partner/programs')
        if (res.ok) {
          const data = await res.json()
          setPrograms(data.programs || [])
        }
      } catch (error) {
        console.error('Failed to fetch programs:', error)
      }
      setLoading(false)
    }
    fetchPrograms()
  }, [])

  const handleApply = async (e: React.MouseEvent, advertiserId: string) => {
    e.stopPropagation()
    setApplying(advertiserId)
    try {
      const res = await fetch('/api/partner/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiser_id: advertiserId }),
      })

      if (res.ok) {
        toast.success('참가 신청이 완료되었습니다')
        const refreshRes = await fetch('/api/partner/programs')
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setPrograms(data.programs || [])
        }
        await refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || '참가 신청에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setApplying(null)
  }

  const buildReferralLink = (refCode: string, landingUrl: string | null, advertiserId: string) => {
    if (landingUrl) {
      // Ensure landing_url has protocol
      let base = landingUrl
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        base = `https://${base}`
      }
      const url = new URL(base)
      url.searchParams.set('ref', refCode)
      return url.toString()
    }
    // Fallback to inquiry page
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://referio.kr'
    return `${origin}/inquiry/${advertiserId}?ref=${refCode}`
  }

  const buildAffiliateCopyLink = (shortCode: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://referio.puzl.co.kr'
    return `${origin}/api/r/${shortCode}`
  }

  const handleCopyLink = async (e: React.MouseEvent, refCode: string, advertiserId: string, landingUrl: string | null, isAffiliate?: boolean) => {
    e.stopPropagation()
    const link = isAffiliate
      ? buildAffiliateCopyLink(refCode)
      : buildReferralLink(refCode, landingUrl, advertiserId)
    await navigator.clipboard.writeText(link)
    setCopiedId(advertiserId)
    toast.success('링크가 복사되었습니다')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const availableCategories = ['all', ...new Set(programs.map(p => p.category || 'etc'))]

  // System programs always shown on top, not affected by category filter
  const systemPrograms = programs.filter(p => p.is_system)
  const regularFiltered = programs.filter(p => {
    if (p.is_system) return false
    const matchCategory = selectedCategory === 'all' || (p.category || 'etc') === selectedCategory
    const matchSearch = !searchTerm ||
      (p.program_name || p.company_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.program_description || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchCategory && matchSearch
  })
  const filteredPrograms = [...systemPrograms, ...regularFiltered]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">프로그램 마켓플레이스</h1>
        <p className="text-gray-500 mt-1">
          다양한 어필리에이트 프로그램에 참가하고 추천 링크로 수익을 만들어보세요
        </p>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="프로그램명, 회사명, 키워드로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2">
        {availableCategories.map((cat) => {
          const label = CATEGORY_MAP[cat] || cat
          const isActive = selectedCategory === cat
          return (
            <Button
              key={cat}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={isActive ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {label}
              {cat !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({programs.filter(p => (p.category || 'etc') === cat).length})
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {/* 프로그램 카드 */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? '검색 결과가 없습니다' : '해당 카테고리에 프로그램이 없습니다'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((program) => (
            <Card
              key={program.id}
              className={`relative overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow ${
                program.is_system ? 'ring-2 ring-indigo-400 bg-gradient-to-br from-indigo-50 to-violet-50' : ''
              }`}
              onClick={() => router.push(`/dashboard/programs/${program.id}`)}
            >
              {program.is_system ? (
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              ) : program.primary_color ? (
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: program.primary_color }}
                />
              ) : null}
              <div className="p-4 pb-3">
                {program.is_affiliate_campaign ? (
                  // Affiliate campaign card: vertical layout to prevent text truncation
                  <div>
                    <p className="font-semibold text-[15px] leading-tight">
                      {program.program_name || program.company_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge className="bg-indigo-600 text-white text-[10px]">Referio Official</Badge>
                      {program.enrollment && (
                        <Badge className={`text-[11px] ${STATUS_CONFIG[program.enrollment.status]?.className || ''}`}>
                          {STATUS_CONFIG[program.enrollment.status]?.icon}
                          <span className="ml-1">
                            {STATUS_CONFIG[program.enrollment.status]?.label}
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {program.company_name}
                      <span className="ml-1.5 text-indigo-500 font-medium">SPECIAL</span>
                    </p>
                  </div>
                ) : (
                  // Regular program card: original horizontal layout
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[15px] leading-tight truncate">
                          {program.program_name || program.company_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {program.company_name}
                        {program.category && CATEGORY_MAP[program.category] && (
                          <span className="ml-1.5 text-gray-400">
                            · {CATEGORY_MAP[program.category]}
                          </span>
                        )}
                      </p>
                    </div>
                    {program.enrollment && (
                      <Badge className={`shrink-0 text-[11px] ${STATUS_CONFIG[program.enrollment.status]?.className || ''}`}>
                        {STATUS_CONFIG[program.enrollment.status]?.icon}
                        <span className="ml-1">
                          {STATUS_CONFIG[program.enrollment.status]?.label}
                        </span>
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <CardContent className="flex-1 flex flex-col pt-0 space-y-3">
                {program.program_description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {program.program_description}
                  </p>
                )}

                {program.is_affiliate_campaign ? (
                  <div className="bg-indigo-50 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500">
                      {program.reward_trigger === 'signup' ? '가입 완료 시 보상' : '유료 플랜 시작 시 보상'}
                    </p>
                    <p className="text-sm font-bold text-indigo-600">
                      ₩{(program.default_lead_commission || 0).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[11px] text-gray-500">유효 DB 단가</p>
                      <p className="text-sm font-bold text-blue-600">
                        ₩{(program.enrollment?.lead_commission || program.default_lead_commission || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[11px] text-gray-500">계약 단가</p>
                      <p className="text-sm font-bold text-purple-600">
                        ₩{(program.enrollment?.contract_commission || program.default_contract_commission || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* 하단 액션 */}
                <div className="mt-auto pt-1">
                  {!program.enrollment ? (
                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      size="sm"
                      onClick={(e) => handleApply(e, program.id)}
                      disabled={applying === program.id}
                    >
                      {applying === program.id ? '신청 중...' : '참가 신청'}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : program.enrollment.status === 'approved' ? (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="sm"
                      onClick={(e) => handleCopyLink(e, program.enrollment!.referral_code, program.id, program.landing_url, program.is_affiliate_campaign)}
                    >
                      {copiedId === program.id ? (
                        <><Check className="w-3.5 h-3.5 mr-1.5" />복사 완료</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5 mr-1.5" />추천 링크 복사</>
                      )}
                    </Button>
                  ) : program.enrollment.status === 'pending' ? (
                    <p className="text-xs text-center text-yellow-700 bg-yellow-50 rounded-lg py-2">
                      광고주 승인을 기다리고 있어요
                    </p>
                  ) : (
                    <Button variant="outline" className="w-full text-gray-400" size="sm" disabled>
                      참가 반려됨
                    </Button>
                  )}
                </div>

                {/* 상세보기 힌트 */}
                <p className="text-[11px] text-gray-400 text-center">
                  클릭하여 상세 정보 보기
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
