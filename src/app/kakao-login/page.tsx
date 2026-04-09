'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Kakao OAuth login page — dedicated path for Kakao review submission
// Always shows Kakao button (not gated by env var)
export default function KakaoLoginPage() {
  const [loading, setLoading] = useState(false)

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

      {/* 우측 로그인 */}
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
              카카오 계정으로 간편하게 로그인하세요
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

              <div className="text-center text-sm text-gray-500">
                <Link href="/login" className="hover:text-slate-700 transition-colors">
                  이메일로 로그인
                </Link>
              </div>

              <div className="text-center text-sm text-gray-600">
                아직 파트너가 아니신가요?{' '}
                <Link href="/kakao-signup" className="text-slate-900 hover:underline font-medium">
                  파트너 가입하기
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
