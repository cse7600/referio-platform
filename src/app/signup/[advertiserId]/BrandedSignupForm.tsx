'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, User, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface AdvertiserBranding {
  id: string
  advertiser_id: string
  company_name: string
  logo_url: string | null
  primary_color: string | null
  program_name: string | null
  program_description: string | null
  signup_welcome_title: string | null
  signup_welcome_message: string | null
}

interface Props {
  advertiser: AdvertiserBranding
  code?: string
}

export default function BrandedSignupForm({ advertiser, code }: Props) {
  const router = useRouter()

  // --- 비밀번호 설정 모드 (이관 유저) ---
  const [isPasswordMode, setIsPasswordMode] = useState(!!code)
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'ready' | 'success' | 'error'>('idle')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')

  useEffect(() => {
    const hash = window.location.hash

    // Case 1: 에러 해시 (#error=access_denied 등)
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const desc = params.get('error_description') || '링크가 만료되었거나 유효하지 않습니다.'
      setIsPasswordMode(true)
      setResetStatus('error')
      setResetError(decodeURIComponent(desc.replace(/\+/g, ' ')))
      return
    }

    // Case 2: Implicit flow 토큰 해시 (#access_token=...&type=recovery)
    if (hash.includes('access_token=') && hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token') || ''
      if (accessToken) {
        setIsPasswordMode(true)
        setResetStatus('loading')
        const supabase = createClient()
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(async ({ data, error }) => {
            if (error) {
              setResetStatus('error')
              setResetError('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
            } else {
              // 유저 이름/이메일 가져오기
              const email = data.user?.email || ''
              const name = data.user?.user_metadata?.name || ''
              setPartnerEmail(email)
              if (name) {
                setPartnerName(name)
              } else if (email) {
                // user_metadata에 name 없으면 partners 테이블에서 조회
                const { data: p } = await supabase
                  .from('partners')
                  .select('name')
                  .eq('email', email)
                  .single()
                if (p?.name) setPartnerName(p.name)
              }
              setResetStatus('ready')
            }
          })
        return
      }
    }

    // Case 3: PKCE flow (?code= 쿼리 파라미터, 서버에서 prop으로 전달)
    if (!code) return
    setResetStatus('loading')
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setResetStatus('error')
        setResetError('링크가 만료되었거나 이미 사용된 링크입니다. 비밀번호 재설정을 다시 요청해주세요.')
      } else {
        setResetStatus('ready')
      }
    })
  }, [code])

  const handlePasswordSet = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    if (resetPassword.length < 6) { setResetError('비밀번호는 6자 이상이어야 합니다'); return }
    if (resetPassword !== resetConfirm) { setResetError('비밀번호가 일치하지 않습니다'); return }

    setResetSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: resetPassword })

    if (error) {
      setResetError('비밀번호 설정에 실패했습니다. 다시 시도해주세요.')
      setResetSubmitting(false)
    } else {
      setResetStatus('success')
      // 3초 후 로그인 페이지로 자동 이동
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  // --- 일반 신규 가입 모드 ---
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const brandColor = advertiser.primary_color || '#4f46e5'
  const welcomeTitle = advertiser.signup_welcome_title || `${advertiser.company_name} 파트너가 되세요`
  const welcomeMessage = advertiser.signup_welcome_message || (advertiser.program_description || '파트너로 참여하고 수익을 만드세요')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // 1. Supabase Auth 회원가입
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (authError) {
      setError(authError.message.includes('already registered') ? '이미 가입된 이메일입니다. 로그인해주세요' : authError.message)
      setLoading(false)
      return
    }

    const userId = data.session ? data.user?.id : null
    let partnerId: string | null = null

    const finalizePartner = async (uid: string) => {
      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('auth_user_id', uid)
        .single()

      if (existingPartner) return existingPartner.id

      const { data: partnerByEmail } = await supabase
        .from('partners')
        .select('id')
        .eq('email', email)
        .single()

      if (partnerByEmail) {
        await supabase.from('partners').update({ auth_user_id: uid }).eq('id', partnerByEmail.id)
        return partnerByEmail.id
      }

      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data: newPartner } = await supabase
        .from('partners')
        .insert({ name, email, auth_user_id: uid, status: 'pending', referral_code: referralCode })
        .select('id')
        .single()

      return newPartner?.id || null
    }

    const linkToProgram = async (pid: string) => {
      // referral_code: 파트너 고유코드 + 광고주 식별자 조합
      const programCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      await supabase.from('partner_programs').upsert({
        partner_id: pid,
        advertiser_id: advertiser.id,
        status: 'pending',
        tier: 'authorized',
        referral_code: programCode,
        applied_at: new Date().toISOString(),
      }, { onConflict: 'partner_id,advertiser_id', ignoreDuplicates: true })
    }

    if (data.session && data.user) {
      partnerId = await finalizePartner(data.user.id)
      if (partnerId) await linkToProgram(partnerId)
      router.push(`/onboarding?from=${encodeURIComponent(advertiser.advertiser_id)}&company=${encodeURIComponent(advertiser.company_name)}`)
      return
    }

    // 이메일 확인 없이 바로 로그인 시도
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (!loginError) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        partnerId = await finalizePartner(user.id)
        if (partnerId) await linkToProgram(partnerId)
      }
      router.push(`/onboarding?from=${encodeURIComponent(advertiser.advertiser_id)}&company=${encodeURIComponent(advertiser.company_name)}`)
      return
    }

    setError('가입이 완료되었습니다. 이메일을 확인한 후 로그인해주세요')
    setLoading(false)
  }

  // 비밀번호 설정 모드: code(PKCE) 또는 해시 토큰(Implicit) 감지 시
  if (isPasswordMode) {
    return (
      <div className="min-h-screen flex">
        {/* 좌측 브랜딩 패널 */}
        <div
          className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between"
          style={{ background: `linear-gradient(135deg, ${brandColor}ee 0%, ${brandColor}99 100%)` }}
        >
          <div className="flex items-center gap-3">
            {advertiser.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advertiser.logo_url} alt={advertiser.company_name} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
                <span className="text-white font-bold text-sm">{advertiser.company_name.charAt(0)}</span>
              </div>
            )}
            <span className="text-white text-xl font-bold">{advertiser.company_name}</span>
          </div>
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-4 leading-tight">파트너 포털에<br />오신 것을 환영합니다</h2>
            <p className="text-white/80 text-lg">비밀번호를 설정하고<br />파트너 포털에 입장하세요</p>
          </div>
          <a href="https://referio.kr" target="_blank" rel="noopener noreferrer" className="text-white/50 text-sm hover:text-white/80 transition-colors">
            Powered by <span className="font-medium">Referio</span>
          </a>
        </div>

        {/* 우측 비밀번호 설정 폼 */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                  <span className="text-white font-bold text-xs">{advertiser.company_name.charAt(0)}</span>
                </div>
                <span className="text-slate-900 text-xl font-bold">{advertiser.company_name}</span>
              </div>
              <CardTitle className="text-2xl">비밀번호 설정</CardTitle>
              <CardDescription>
                {resetStatus === 'loading' && '인증 확인 중입니다...'}
                {resetStatus === 'ready' && (partnerName ? `${partnerName}님, 비밀번호를 설정해주세요` : '사용할 비밀번호를 입력해주세요')}
                {resetStatus === 'success' && '설정 완료! 로그인 페이지로 이동합니다'}
                {resetStatus === 'error' && '링크를 확인해주세요'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetStatus === 'loading' && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: brandColor }} />
                </div>
              )}

              {resetStatus === 'error' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{resetError}</p>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => router.push('/login')}>
                    로그인 페이지로 돌아가기
                  </Button>
                </div>
              )}

              {resetStatus === 'success' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-green-700 text-sm">
                      비밀번호가 설정되었습니다. 잠시 후 로그인 페이지로 이동합니다.
                    </p>
                  </div>
                  <Button className="w-full text-white" style={{ backgroundColor: brandColor }} onClick={() => router.push('/login')}>
                    바로 로그인하기
                  </Button>
                </div>
              )}

              {resetStatus === 'ready' && (
                <form onSubmit={handlePasswordSet} className="space-y-4">
                  {/* 파트너 정보 표시 */}
                  {(partnerName || partnerEmail) && (
                    <div style={{ background: `${brandColor}12`, border: `1px solid ${brandColor}30` }} className="rounded-lg px-4 py-3">
                      {partnerName && <p className="text-sm font-semibold text-gray-800">{partnerName}</p>}
                      {partnerEmail && <p className="text-xs text-gray-500 mt-0.5">{partnerEmail}</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="resetPassword">새 비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input id="resetPassword" type="password" placeholder="6자 이상" value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)} className="pl-10" required minLength={6} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resetConfirm">비밀번호 확인</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input id="resetConfirm" type="password" placeholder="비밀번호 재입력" value={resetConfirm}
                        onChange={(e) => setResetConfirm(e.target.value)} className="pl-10" required minLength={6} />
                    </div>
                  </div>
                  {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
                  <Button type="submit" className="w-full text-white" style={{ backgroundColor: brandColor }} disabled={resetSubmitting}>
                    {resetSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />설정 중...</> : '비밀번호 설정 완료'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* 좌측 브랜딩 패널 */}
      <div
        className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between"
        style={{
          background: `linear-gradient(135deg, ${brandColor}ee 0%, ${brandColor}99 100%)`,
        }}
      >
        <div className="flex items-center gap-3">
          {advertiser.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={advertiser.logo_url} alt={advertiser.company_name} className="h-8 object-contain" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20"
            >
              <span className="text-white font-bold text-sm">
                {advertiser.company_name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-white text-xl font-bold">{advertiser.company_name}</span>
        </div>

        <div className="text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">{welcomeTitle}</h2>
          <p className="text-white/80 text-lg whitespace-pre-wrap">{welcomeMessage}</p>
        </div>

        <a href="https://referio.kr" target="_blank" rel="noopener noreferrer" className="text-white/50 text-sm hover:text-white/80 transition-colors">
          Powered by{' '}
          <span className="font-medium">Referio</span>
        </a>
      </div>

      {/* 우측 가입 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {/* 모바일에서 브랜드 로고 표시 */}
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
              {advertiser.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={advertiser.logo_url} alt={advertiser.company_name} className="h-7 object-contain" />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >
                  <span className="text-white font-bold text-xs">{advertiser.company_name.charAt(0)}</span>
                </div>
              )}
              <span className="text-slate-900 text-xl font-bold">{advertiser.company_name}</span>
            </div>
            <CardTitle className="text-2xl">파트너 가입</CardTitle>
            <CardDescription>
              {advertiser.program_name ? `${advertiser.program_name}에 파트너로 참여하세요` : `${advertiser.company_name} 파트너 프로그램에 참여하세요`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input id="name" type="text" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input id="password" type="password" placeholder="6자 이상" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input id="confirmPassword" type="password" placeholder="비밀번호 다시 입력" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required minLength={6} />
                </div>
              </div>

              {error && (
                <p className={`text-sm ${error.includes('완료되었습니다') ? 'text-green-600' : 'text-red-500'}`}>
                  {error}
                </p>
              )}

              <p className="text-xs text-gray-500">
                가입 시,{' '}
                <Link href="/terms" className="text-slate-900 hover:underline">이용약관</Link> 및{' '}
                <Link href="/privacy" className="text-slate-900 hover:underline">개인정보처리방침</Link>에
                동의하는 것으로 간주됩니다.
              </p>

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: brandColor }}
                disabled={loading}
              >
                {loading ? '처리 중...' : '파트너 가입하기'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                이미 파트너이신가요?{' '}
                <Link href="/login" className="text-slate-900 hover:underline font-medium">
                  로그인하기
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
