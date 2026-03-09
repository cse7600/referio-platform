'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Building2, User, Lock } from 'lucide-react'

export default function AdvertiserLoginPage() {
  const router = useRouter()
  const [advertiserId, setAdvertiserId] = useState('')
  const [userId, setUserId] = useState('')
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
        body: JSON.stringify({ advertiserId, userId, password }),
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
          {/* 광고주 ID */}
          <div className="space-y-2">
            <Label htmlFor="advertiserId" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              광고주 ID
            </Label>
            <Input
              id="advertiserId"
              type="text"
              placeholder="hanwha_vision"
              value={advertiserId}
              onChange={(e) => setAdvertiserId(e.target.value)}
              required
              disabled={loading}
              className="h-11"
            />
            <p className="text-xs text-slate-400">
              담당자에게 발급받은 광고주 식별 코드
            </p>
          </div>

          {/* 사용자 ID */}
          <div className="space-y-2">
            <Label htmlFor="userId" className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              사용자 ID
            </Label>
            <Input
              id="userId"
              type="text"
              placeholder="admin"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
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

        {process.env.NODE_ENV === 'development' && (
        <div className="pt-4 border-t border-slate-200">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-slate-600">데모 계정 (개발 전용)</p>
            <div className="text-xs text-slate-500 space-y-1">
              <p>광고주 ID: <code className="bg-slate-200 px-1 rounded">hanwha_vision</code></p>
              <p>사용자 ID: <code className="bg-slate-200 px-1 rounded">admin</code></p>
              <p>비밀번호: <code className="bg-slate-200 px-1 rounded">password123</code></p>
            </div>
          </div>
        </div>
        )}

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
              href="mailto:support@referio.kr?subject=광고주 비밀번호 초기화 요청"
              className="hover:underline text-slate-500"
            >
              고객센터에 문의하세요
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
