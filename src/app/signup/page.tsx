'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, User, Lock } from 'lucide-react'
import { trackPartnerSignup } from '@/lib/gtm'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

async function trackAffiliateConversion(eventType: string, partnerId?: string) {
  const ref = getCookie('affiliate_ref');
  if (!ref) return;
  try {
    await fetch('/api/affiliate/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_code: ref, event_type: eventType, partner_id: partnerId }),
    });
    deleteCookie('affiliate_ref');
  } catch {
    // Non-critical — don't block signup flow
  }
}

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      options: {
        data: { name },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('이미 가입된 이메일입니다. 로그인해주세요')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    // 2. 세션이 바로 생성된 경우 (이메일 확인 비활성화 시)
    if (data.session && data.user) {
      // partners 테이블에 레코드 생성
      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single()

      if (!existingPartner) {
        // 이메일로 기존 파트너 확인
        const { data: partnerByEmail } = await supabase
          .from('partners')
          .select('id')
          .eq('email', data.user.email!)
          .single()

        if (partnerByEmail) {
          await supabase
            .from('partners')
            .update({ auth_user_id: data.user.id })
            .eq('id', partnerByEmail.id)
        } else {
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
          await supabase.from('partners').insert({
            name,
            email: data.user.email,
            auth_user_id: data.user.id,
            status: 'pending',
            referral_code: referralCode,
          })
        }
      }

      // Track affiliate conversion — get partner id for entity linking
      const { data: resolvedPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single();
      await trackAffiliateConversion('signup', resolvedPartner?.id);
      trackPartnerSignup();
      router.push('/onboarding')
      return
    }

    // 3. 이메일 확인이 필요한 경우 - 바로 로그인 시도
    // Supabase에서 email confirmation이 꺼져있으면 여기 안 옴
    // 켜져있으면 signUp은 성공하지만 session이 없음
    // 이 경우 바로 signInWithPassword 시도
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!loginError) {
      // 로그인 성공 - partner 레코드 생성
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingPartner } = await supabase
          .from('partners')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!existingPartner) {
          const { data: partnerByEmail } = await supabase
            .from('partners')
            .select('id')
            .eq('email', email)
            .single()

          if (partnerByEmail) {
            await supabase
              .from('partners')
              .update({ auth_user_id: user.id })
              .eq('id', partnerByEmail.id)
          } else {
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            await supabase.from('partners').insert({
              name,
              email,
              auth_user_id: user.id,
              status: 'pending',
              referral_code: referralCode,
            })
          }
        }
        // Track affiliate conversion — get partner id for entity linking
        if (user) {
          const { data: resolvedPartner2 } = await supabase
            .from('partners')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
          await trackAffiliateConversion('signup', resolvedPartner2?.id);
        }
      }
      trackPartnerSignup();
      router.push('/onboarding')
      return
    }

    // 정말 이메일 확인이 필요한 경우
    setError('가입이 완료되었습니다. 이메일을 확인한 후 로그인해주세요')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* 좌측 배경 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 to-slate-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-sm">R</span>
          </div>
          <span className="text-white text-xl font-bold">Referio</span>
        </div>
        <div className="text-white">
          <h2 className="text-4xl font-bold mb-4">
            추천 링크 하나로<br />수익을 만드세요
          </h2>
          <p className="text-slate-400 text-lg">
            B2B 어필리에이트 프로그램에 참여하고,<br />
            기업 고객을 추천할 때마다 수수료를 받으세요
          </p>
        </div>
        <div className="text-slate-500 text-sm">
          &copy; 2025 Referio. All rights reserved.
        </div>
      </div>

      {/* 우측 가입 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-slate-900 text-xl font-bold">Referio</span>
            </div>
            <CardTitle className="text-2xl">파트너 가입</CardTitle>
            <CardDescription>
              B2B 어필리에이트 파트너로 함께하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <p className={`text-sm ${error.includes('완료되었습니다') ? 'text-green-600' : 'text-red-500'}`}>
                  {error}
                </p>
              )}

              <p className="text-xs text-gray-500">
                가입 시, <Link href="/terms" className="text-slate-900 hover:underline">이용약관</Link> 및{' '}
                <Link href="/privacy" className="text-slate-900 hover:underline">개인정보처리방침</Link>에
                동의하는 것으로 간주됩니다.
              </p>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
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
