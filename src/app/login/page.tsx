'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock } from 'lucide-react'
import { trackPartnerLogin } from '@/lib/gtm'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetCooldown, setResetCooldown] = useState(0)

  // Cooldown timer: decrement every second, cleanup on unmount
  useEffect(() => {
    if (resetCooldown <= 0) return
    const timer = setInterval(() => {
      setResetCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resetCooldown])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      if (error.message === 'Invalid login credentials') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다')
      } else if (error.message === 'Email not confirmed') {
        setError('이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요')
      } else {
        setError(error.message)
      }
      return
    }

    trackPartnerLogin();
    router.push('/dashboard')
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
            추천으로 연결되는<br />B2B 파트너 네트워크
          </h2>
          <p className="text-slate-400 text-lg">
            프로그램에 참여하고, 추천 링크로 수익을 만드세요
          </p>
        </div>
        <div className="text-slate-500 text-sm">
          &copy; 2025 Referio. All rights reserved.
        </div>
      </div>

      {/* 우측 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-slate-900 text-xl font-bold">Referio</span>
            </div>
            <CardTitle className="text-2xl">파트너 로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                    placeholder="비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              {resetMsg && (
                <p className="text-green-600 text-sm">{resetMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                아직 파트너가 아니신가요?{' '}
                <Link href="/signup" className="text-slate-900 hover:underline font-medium">
                  파트너 가입하기
                </Link>
              </div>
              <div className="text-center text-sm text-gray-400">
                <Link href="/advertiser/login" className="hover:text-slate-600 transition-colors">
                  광고주 로그인 &rarr;
                </Link>
              </div>

              <div className="text-center text-sm text-gray-400">
                <button
                  type="button"
                  disabled={resetCooldown > 0}
                  onClick={async () => {
                    if (!email) {
                      setError('이메일을 먼저 입력해주세요')
                      return
                    }
                    const supabase = createClient()
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    })
                    if (resetError) {
                      setError('메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
                    } else {
                      setError('')
                      setResetMsg('비밀번호 재설정 메일을 발송했습니다. 이메일을 확인해주세요.')
                      setResetCooldown(60)
                    }
                  }}
                  className={`transition-colors ${resetCooldown > 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:text-slate-600'}`}
                >
                  {resetCooldown > 0 ? `재요청 대기 (${resetCooldown}초)` : '비밀번호를 잊으셨나요?'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
