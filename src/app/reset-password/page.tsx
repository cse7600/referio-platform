'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      return
    }

    const supabase = createClient()

    // onAuthStateChange로 PASSWORD_RECOVERY 이벤트 감지 (hash-based implicit flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      }
    })

    // 기존 세션도 확인 (PKCE flow fallback)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setStatus('ready')
    })

    // 2초 후에도 세션 미감지 시 error
    const timeout = setTimeout(() => {
      setStatus((prev) => prev === 'loading' ? 'error' : prev)
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 6) {
      setErrorMsg('비밀번호는 6자 이상이어야 합니다')
      return
    }
    if (password !== confirm) {
      setErrorMsg('비밀번호가 일치하지 않습니다')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      // Distinguish between session expiry and other errors for clearer UX
      const isSessionError = error.message?.toLowerCase().includes('session') ||
        error.message?.toLowerCase().includes('expired') ||
        error.message?.toLowerCase().includes('not authenticated') ||
        error.status === 401
      setErrorMsg(isSessionError
        ? '세션이 만료되었습니다. 로그인 페이지에서 비밀번호 재설정을 다시 요청해주세요.'
        : '비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
      setSubmitting(false)
    } else {
      await supabase.auth.signOut()
      setStatus('success')
    }
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
            새 비밀번호를<br />설정해주세요
          </h2>
          <p className="text-slate-400 text-lg">
            6자 이상의 안전한 비밀번호를 사용하세요
          </p>
        </div>
        <div className="text-slate-500 text-sm">
          &copy; 2025 Referio. All rights reserved.
        </div>
      </div>

      {/* 우측 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-slate-900 text-xl font-bold">Referio</span>
            </div>
            <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
            <CardDescription>
              {status === 'loading' && '인증 확인 중...'}
              {status === 'ready' && '새 비밀번호를 입력해주세요'}
              {status === 'success' && '비밀번호가 변경되었습니다'}
              {status === 'error' && '링크가 만료되었습니다'}
            </CardDescription>
          </CardHeader>
          <CardContent>

            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">
                    링크가 만료되었거나 이미 사용된 링크입니다.<br />
                    로그인 페이지에서 다시 요청해주세요.
                  </p>
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => router.push('/login')}
                >
                  로그인 페이지로 돌아가기
                </Button>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-green-700 text-sm">
                    비밀번호가 성공적으로 변경되었습니다.<br />
                    새 비밀번호로 로그인해주세요.
                  </p>
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => router.push('/login')}
                >
                  로그인하기
                </Button>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">새 비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="6자 이상 입력"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-red-500 text-sm">{errorMsg}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />변경 중...</>
                  ) : '비밀번호 변경'}
                </Button>
              </form>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
