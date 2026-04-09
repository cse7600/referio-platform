'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Mail,
  Phone,
  Link as LinkIcon,
  Building,
  CreditCard,
  Award,
  ExternalLink,
  Save,
  Copy,
  Check,
  Clock,
  X,
  ArrowRight,
  AlertTriangle,
  Bell,
  BellOff,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useProgram } from '@/app/dashboard/ProgramContext'
import type { Partner } from '@/types/database'

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

const PROGRAM_STATUS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  approved: { label: '참가중', icon: <Check className="w-3 h-3" />, className: 'bg-green-100 text-green-700' },
  pending: { label: '승인 대기', icon: <Clock className="w-3 h-3" />, className: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: '반려됨', icon: <X className="w-3 h-3" />, className: 'bg-red-100 text-red-700' },
}

const GUIDES = [
  { title: '활동 가이드 보기', href: '/dashboard/guides' },
  { title: '다른 파트너들은 어떻게 활동할까?', href: '/dashboard/guides#tips' },
  { title: '이달의 프로모션 살펴보기', href: '/dashboard/guides#promotion' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 이메일 수신 설정
  const [emailOptOut, setEmailOptOut] = useState(false)
  const [savingEmailPref, setSavingEmailPref] = useState(false)

  // Withdrawal state
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedProgramId, setCopiedProgramId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const { programs } = useProgram()

  // 수정 가능한 필드들
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [mainChannelLink, setMainChannelLink] = useState('')

  // 주민번호 (SSN)
  const [hasSSN, setHasSSN] = useState(false)
  const [ssnInput, setSsnInput] = useState('')
  const [savingSSN, setSavingSSN] = useState(false)
  const [ssnEditMode, setSsnEditMode] = useState(false)

  // 소셜 채널
  const [channelType, setChannelType] = useState('')
  const [naverBlogUrl, setNaverBlogUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [threadsUrl, setThreadsUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [monthlyPv, setMonthlyPv] = useState('')
  const [subscriberCount, setSubscriberCount] = useState('')
  const [savingChannels, setSavingChannels] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: partnerData } = await supabase
          .from('partners')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()

        if (partnerData) {
          setPartner(partnerData)
          setBankName(partnerData.bank_name || '')
          setBankAccount(partnerData.bank_account || '')
          setAccountHolder(partnerData.account_holder || '')
          setMainChannelLink(partnerData.main_channel_link || '')
          // SSN: only store whether it exists, discard the encrypted value
          setHasSSN(!!(partnerData as Record<string, unknown>).ssn_encrypted)
          // Email opt-out preference
          setEmailOptOut(!!(partnerData as Record<string, unknown>).email_opted_out)
          // 소셜 채널
          const pd = partnerData as typeof partnerData & {
            channel_type?: string
            naver_blog_url?: string
            instagram_url?: string
            youtube_url?: string
            threads_url?: string
            tiktok_url?: string
            monthly_pv?: number
            subscriber_count?: number
          }
          setChannelType(pd.channel_type || '')
          setNaverBlogUrl(pd.naver_blog_url || '')
          setInstagramUrl(pd.instagram_url || '')
          setYoutubeUrl(pd.youtube_url || '')
          setThreadsUrl(pd.threads_url || '')
          setTiktokUrl(pd.tiktok_url || '')
          setMonthlyPv(pd.monthly_pv ? String(pd.monthly_pv) : '')
          setSubscriberCount(pd.subscriber_count ? String(pd.subscriber_count) : '')
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    if (!partner) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('partners')
      .update({
        bank_name: bankName || null,
        bank_account: bankAccount || null,
        account_holder: accountHolder || null,
        main_channel_link: mainChannelLink || null,
      })
      .eq('id', partner.id)

    if (!error) {
      setPartner({
        ...partner,
        bank_name: bankName || null,
        bank_account: bankAccount || null,
        account_holder: accountHolder || null,
        main_channel_link: mainChannelLink || null,
      })
      setEditMode(false)
    }
    setSaving(false)
  }

  const handleChannelSave = async () => {
    if (!partner) return
    setSavingChannels(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('partners')
      .update({
        channel_type: channelType || null,
        naver_blog_url: naverBlogUrl || null,
        instagram_url: instagramUrl || null,
        youtube_url: youtubeUrl || null,
        threads_url: threadsUrl || null,
        tiktok_url: tiktokUrl || null,
        monthly_pv: monthlyPv ? parseInt(monthlyPv) : null,
        subscriber_count: subscriberCount ? parseInt(subscriberCount) : null,
      })
      .eq('id', partner.id)

    if (!error) {
      toast.success('채널 정보가 저장되었습니다')
    } else {
      toast.error('저장에 실패했습니다')
    }
    setSavingChannels(false)
  }

  const handleSaveSSN = async () => {
    const clean = ssnInput.replace(/[^0-9]/g, '')
    if (clean.length !== 13) {
      toast.error('주민번호는 하이픈 없이 13자리 숫자를 입력해주세요')
      return
    }
    setSavingSSN(true)
    try {
      const res = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssn: clean }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setHasSSN(true)
        setSsnInput('') // clear from memory immediately
        setSsnEditMode(false)
        toast.success('주민번호가 안전하게 등록되었습니다')
      } else {
        toast.error(data.error || '저장에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setSavingSSN(false)
  }

  const handleCopy = async () => {
    if (partner?.referral_url) {
      await navigator.clipboard.writeText(partner.referral_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyProgramLink = async (refCode: string, programId: string) => {
    const link = `https://referio.puzl.co.kr/security?ref=${refCode}`
    await navigator.clipboard.writeText(link)
    setCopiedProgramId(programId)
    toast.success('추천 링크가 복사되었습니다')
    setTimeout(() => setCopiedProgramId(null), 2000)
  }

  const handleToggleEmailOptOut = async (value: boolean) => {
    setSavingEmailPref(true)
    try {
      const res = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_opted_out: value }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailOptOut(value)
        toast.success(value ? '마케팅 이메일 수신이 거부됐습니다' : '마케팅 이메일 수신이 활성화됐습니다')
      } else {
        toast.error(data.error || '저장에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setSavingEmailPref(false)
  }

  const handleWithdraw = async () => {
    setWithdrawing(true)
    try {
      const res = await fetch('/api/partner/withdraw', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '탈퇴 처리 중 오류가 발생했습니다')
        return
      }
      toast.success('탈퇴 처리가 완료됐습니다')
      // Sign out and redirect to login
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setWithdrawing(false)
      setShowWithdrawConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">활동정보</h1>
          <p className="text-gray-500 mt-1">프로필 및 정산 정보를 관리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={TIER_COLORS[partner?.tier || 'authorized']}>
            <Award className="w-3 h-3 mr-1" />
            {TIER_LABELS[partner?.tier || 'authorized']}
          </Badge>
          {process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID && (partner as (typeof partner & { kakao_channel_added?: boolean }))?.kakao_channel_added && (
            <Badge style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)' }}>
              카카오 채널 연결됨
            </Badge>
          )}
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">파트너 이름</p>
                <p className="font-medium">{partner?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">이메일</p>
                <p className="font-medium">{partner?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">연락처</p>
                <p className="font-medium">{partner?.phone || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">추천인 URL</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate text-sm">
                    {partner?.referral_url}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 수수료 정보 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">계약 수수료 단가</p>
              <p className="font-bold text-lg text-orange-600">
                ₩{(partner?.contract_commission || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">리드 수수료 단가</p>
              <p className="font-bold text-lg text-blue-600">
                ₩{(partner?.lead_commission || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">월 활동비</p>
              <p className="font-bold text-lg text-green-600">
                ₩{(partner?.monthly_fee || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 내 참여 프로그램 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">내 참여 프로그램</CardTitle>
              <CardDescription>
                참여 중인 프로그램과 추천 링크를 확인하세요
              </CardDescription>
            </div>
            <a href="/dashboard/programs">
              <Button variant="outline" size="sm">
                프로그램 둘러보기
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">아직 참여 중인 프로그램이 없습니다</p>
              <a href="/dashboard/programs">
                <Button className="mt-3 bg-indigo-600 hover:bg-indigo-700" size="sm">
                  프로그램 참가하기
                </Button>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map((prog) => {
                const status = PROGRAM_STATUS[prog.status]
                const isApproved = prog.status === 'approved'
                const isPending = prog.status === 'pending'
                const refLink = `https://referio.puzl.co.kr/security?ref=${prog.referral_code}`

                return (
                  <div
                    key={prog.id}
                    className={`rounded-lg border p-4 ${
                      isApproved ? 'border-green-200 bg-green-50/50' :
                      isPending ? 'border-yellow-200 bg-yellow-50/50' :
                      'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {prog.advertisers.program_name || prog.advertisers.company_name}
                          </p>
                          {status && (
                            <Badge className={`shrink-0 text-[11px] ${status.className}`}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{prog.advertisers.company_name}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-gray-500">커미션</p>
                        <p className="text-xs font-medium">
                          <span className="text-blue-600">DB ₩{(prog.lead_commission || 0).toLocaleString()}</span>
                          {' / '}
                          <span className="text-purple-600">계약 ₩{(prog.contract_commission || 0).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* 승인된 프로그램: 추천 링크 표시 */}
                    {isApproved && (
                      <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 text-xs text-green-800 bg-green-100 px-3 py-2 rounded truncate">
                          {refLink}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-8 text-green-700 border-green-300 hover:bg-green-100"
                          onClick={() => handleCopyProgramLink(prog.referral_code, prog.id)}
                        >
                          {copiedProgramId === prog.id ? (
                            <><Check className="w-3.5 h-3.5 mr-1" />복사됨</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5 mr-1" />링크 복사</>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* 대기 중인 프로그램: 안내 메시지 */}
                    {isPending && (
                      <p className="mt-2 text-xs text-yellow-700 bg-yellow-100 rounded px-3 py-1.5">
                        광고주가 참가 신청을 검토 중입니다. 승인되면 추천 링크가 발급됩니다.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 소셜 채널 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">소셜 채널 정보</CardTitle>
          <CardDescription>활동 채널을 등록하면 광고주가 파트너 검토 시 참고합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>채널 유형</Label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">선택 안함</option>
              <option value="blogger">블로거 (네이버 블로그/티스토리)</option>
              <option value="instagrammer">인스타그래머</option>
              <option value="youtuber">유튜버</option>
              <option value="agency">영업 에이전시</option>
              <option value="offline">오프라인 영업</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>네이버 블로그</Label>
              <Input
                value={naverBlogUrl}
                onChange={(e) => setNaverBlogUrl(e.target.value)}
                placeholder="https://blog.naver.com/yourname"
              />
            </div>
            <div className="space-y-2">
              <Label>인스타그램</Label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourname"
              />
            </div>
            <div className="space-y-2">
              <Label>유튜브</Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@yourname"
              />
            </div>
            <div className="space-y-2">
              <Label>쓰레드(Threads)</Label>
              <Input
                value={threadsUrl}
                onChange={(e) => setThreadsUrl(e.target.value)}
                placeholder="https://threads.net/@yourname"
              />
            </div>
            <div className="space-y-2">
              <Label>틱톡</Label>
              <Input
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/@yourname"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>월 조회수(PV)</Label>
              <Input
                type="number"
                value={monthlyPv}
                onChange={(e) => setMonthlyPv(e.target.value)}
                placeholder="10000"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>구독자/팔로워 수</Label>
              <Input
                type="number"
                value={subscriberCount}
                onChange={(e) => setSubscriberCount(e.target.value)}
                placeholder="5000"
                min="0"
              />
            </div>
          </div>

          <Button
            onClick={handleChannelSave}
            disabled={savingChannels}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {savingChannels ? '저장 중...' : '채널 정보 저장'}
          </Button>
        </CardContent>
      </Card>

      {/* 정산 정보 (수정 가능) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">정산 정보</CardTitle>
            <CardDescription>정산 받으실 계좌 정보를 입력해주세요</CardDescription>
          </div>
          {!editMode && (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              수정하기
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="bankName">은행명</Label>
                <Input
                  id="bankName"
                  placeholder="국민은행"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccount">계좌번호</Label>
                <Input
                  id="bankAccount"
                  placeholder="123-456-789012"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">예금주</Label>
                <Input
                  id="accountHolder"
                  placeholder="홍길동"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainChannelLink">주 활동 채널 링크</Label>
                <Input
                  id="mainChannelLink"
                  placeholder="https://blog.naver.com/yourname"
                  value={mainChannelLink}
                  onChange={(e) => setMainChannelLink(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '저장 중...' : '저장하기'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(false)
                    setBankName(partner?.bank_name || '')
                    setBankAccount(partner?.bank_account || '')
                    setAccountHolder(partner?.account_holder || '')
                    setMainChannelLink(partner?.main_channel_link || '')
                  }}
                >
                  취소
                </Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">은행명</p>
                  <p className="font-medium">{partner?.bank_name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">계좌번호</p>
                  <p className="font-medium">{partner?.bank_account || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">예금주</p>
                  <p className="font-medium">{partner?.account_holder || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">주 활동 채널</p>
                  <p className="font-medium truncate">
                    {partner?.main_channel_link || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* 주민번호 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">주민번호 (세금 신고용)</p>
                <p className="text-xs text-gray-500">정산 시 원천징수 신고에 필요합니다. 암호화하여 안전하게 보관됩니다.</p>
              </div>
              {hasSSN && !ssnEditMode && (
                <Badge className="bg-green-100 text-green-700">
                  <Check className="w-3 h-3 mr-1" />
                  등록 완료
                </Badge>
              )}
            </div>

            {hasSSN && !ssnEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSsnEditMode(true)}
              >
                재등록
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="주민번호 13자리 (하이픈 없이)"
                  value={ssnInput}
                  onChange={(e) => setSsnInput(e.target.value)}
                  maxLength={13}
                  className="max-w-xs"
                />
                <Button
                  onClick={handleSaveSSN}
                  disabled={savingSSN || ssnInput.length === 0}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {savingSSN ? '저장 중...' : '등록'}
                </Button>
                {ssnEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSsnEditMode(false)
                      setSsnInput('')
                    }}
                  >
                    취소
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 이메일 수신 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">이메일 수신 설정</CardTitle>
          <CardDescription>마케팅 이메일 수신 여부를 설정합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {emailOptOut ? (
                <BellOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Bell className="w-5 h-5 text-indigo-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {emailOptOut ? '마케팅 이메일 수신 거부 중' : '마케팅 이메일 수신 중'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {emailOptOut
                    ? '활동 안내, 새 프로그램 알림 등을 받지 않습니다'
                    : '활동 안내, 새 프로그램 알림, 성과 리포트 등을 받습니다'}
                </p>
              </div>
            </div>
            <Switch
              checked={!emailOptOut}
              onCheckedChange={(checked) => handleToggleEmailOptOut(!checked)}
              disabled={savingEmailPref}
            />
          </div>
          <p className="text-xs text-gray-400 mt-3 border-t pt-3">
            정산 확정, 계약 관련 필수 통지 이메일은 수신 거부와 무관하게 발송됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 추가 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">추가 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
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

      {/* 계정 탈퇴 */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            계정 탈퇴
          </CardTitle>
          <CardDescription>
            탈퇴하면 모든 파트너 활동이 종료되며, 이 작업은 되돌릴 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showWithdrawConfirm ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              onClick={() => setShowWithdrawConfirm(true)}
            >
              계정 탈퇴 신청
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">탈퇴 전 꼭 확인해주세요</p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>모든 파트너 활동(추천 링크, 프로그램 참가)이 즉시 종료됩니다</li>
                  <li>미완료 정산이 있는 경우, 탈퇴 후에도 정상 입금됩니다</li>
                  <li>계정 복구는 불가능하며 재가입 시 이전 이력은 복원되지 않습니다</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? '처리 중...' : '탈퇴 확인 — 계속 진행합니다'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawConfirm(false)}
                  disabled={withdrawing}
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
