'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, User } from 'lucide-react'

// Kakao OAuth signup page — dedicated path for Kakao review submission
// Always shows Kakao button (not gated by env var)
export default function KakaoSignupPage() {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleKakaoLogin = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname account_email',
      },
    })
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
            <div className="space-y-4">
              {/* 카카오 로그인 버튼 */}
              <button
                type="button"
                onClick={handleKakaoLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 font-medium text-sm transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50"
                style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)', borderRadius: '12px' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M9 0.5C4.30558 0.5 0.5 3.36853 0.5 6.875C0.5 9.02294 1.74794 10.9218 3.71618 12.0951L2.875 16.25L7.50882 13.1584C7.99412 13.2181 8.49118 13.25 9 13.25C13.6944 13.25 17.5 10.3815 17.5 6.875C17.5 3.36853 13.6944 0.5 9 0.5Z" fill="black" fillOpacity="0.85"/>
                </svg>
                카카오 로그인
              </button>

              {/* 구분선 */}
              <div className="relative flex items-center gap-3">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs text-gray-400">또는 이메일로 가입</span>
                <hr className="flex-1 border-gray-200" />
              </div>

              {/* 이메일 가입 폼 */}
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
                    minLength={6}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                가입 시,{' '}
                <Link href="/terms" className="text-slate-900 hover:underline">이용약관</Link> 및{' '}
                <Link href="/privacy" className="text-slate-900 hover:underline">개인정보처리방침</Link>에
                동의하는 것으로 간주됩니다.
              </p>

              <Button
                type="button"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                파트너 가입하기
              </Button>

              <div className="text-center text-sm text-gray-600">
                이미 파트너이신가요?{' '}
                <Link href="/login" className="text-slate-900 hover:underline font-medium">
                  로그인하기
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
