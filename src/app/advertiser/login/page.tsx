'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Building2, Lock } from 'lucide-react'

export default function AdvertiserLoginPage() {
  const router = useRouter()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/advertiser/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다')
        setLoading(false)
        return
      }

      // 로그인 성공 - 광고주 대시보드로 이동
      router.push('/advertiser/dashboard')
      router.refresh()
    } catch (err) {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">광고주 로그인</h1>
          <p className="text-sm text-slate-500">
            파트너 프로그램 관리 시스템
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* 로그인 ID */}
          <div className="space-y-2">
            <Label htmlFor="loginId" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              로그인 ID
            </Label>
            <Input
              id="loginId"
              type="text"
              placeholder="가입 시 설정한 로그인 ID"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              disabled={loading}
              className="h-11"
            />
          </div>

          {/* 비밀번호 */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              비밀번호
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-11"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>


        <div className="text-center space-y-2">
          <div className="text-sm text-slate-600">
            광고주 계정이 없으신가요?{' '}
            <button
              onClick={() => router.push('/advertiser/signup')}
              className="text-blue-600 hover:underline font-medium"
            >
              무료로 시작하기
            </button>
          </div>
          <div className="text-sm text-slate-400">
            비밀번호를 잊으셨나요?{' '}
            <a
              href="mailto:support@referio.kr?subject=광고주 비밀번호 초기화 요청&body=로그인 ID: "
              className="hover:underline text-slate-500"
            >
              support@referio.kr로 로그인 ID와 함께 문의하세요
            </a>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-slate-400 hover:underline"
          >
            파트너 로그인으로 이동 &rarr;
          </button>
        </div>
      </Card>
    </div>
  )
}
