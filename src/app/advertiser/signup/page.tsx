'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, User, Mail, Phone, KeyRound, Lock } from 'lucide-react'
import { trackAdvertiserSignup } from '@/lib/gtm'

export default function AdvertiserSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다')
      return
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/advertiser/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          representativeName,
          managerEmail,
          managerPhone,
          loginId,
          password,
        }),
      })

      if (res.ok) {
        trackAdvertiserSignup();
        router.push('/advertiser/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || '가입에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 좌측 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 to-slate-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">R</span>
            </div>
            <span className="text-white text-xl font-bold">Referio</span>
          </div>
        </div>
        <div className="text-white">
          <h2 className="text-4xl font-bold mb-4">
            파트너 네트워크로<br />매출을 성장시키세요
          </h2>
          <p className="text-slate-300 text-lg">
            30일 무료 체험으로 시작하세요. 신용카드 없이 바로 이용 가능합니다.
          </p>
          <div className="mt-8 space-y-3 text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">1</div>
              <span>가입 후 프로그램 설정</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">2</div>
              <span>파트너 모집 및 승인</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">3</div>
              <span>추천 링크로 고객 유치</span>
            </div>
          </div>
        </div>
        <div className="text-slate-500 text-sm">
          &copy; 2025 Referio. All rights reserved.
        </div>
      </div>

      {/* 우측 폼 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R</span>
                </div>
                <span className="text-slate-900 text-xl font-bold">Referio</span>
              </div>
            </div>
            <CardTitle className="text-2xl">광고주 가입</CardTitle>
            <CardDescription>
              30일 무료 체험 포함 (파트너 5명까지)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 업체 정보 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">업체 정보</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">업체명 *</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="주식회사 OOO"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="representativeName">대표자명 *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="representativeName"
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                        placeholder="홍길동"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="managerEmail">담당자 이메일 *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="managerEmail"
                        type="email"
                        value={managerEmail}
                        onChange={(e) => setManagerEmail(e.target.value)}
                        placeholder="manager@company.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="managerPhone">담당자 연락처</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="managerPhone"
                        value={managerPhone}
                        onChange={(e) => setManagerPhone(e.target.value)}
                        placeholder="010-1234-5678"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t my-2" />

              {/* 로그인 정보 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">로그인 정보</p>
                <div className="space-y-1.5">
                  <Label htmlFor="loginId">로그인 ID *</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="loginId"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="영문/숫자 조합"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">비밀번호 *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="8자 이상"
                        className="pl-10"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="비밀번호 다시 입력"
                        className="pl-10"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <p className="text-xs text-gray-500">
                가입 시 <Link href="/terms" className="text-slate-700 hover:underline">이용약관</Link> 및{' '}
                <Link href="/privacy" className="text-slate-700 hover:underline">개인정보처리방침</Link>에 동의하게 됩니다.
              </p>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? '가입 처리 중...' : '무료로 시작하기'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                이미 광고주 계정이 있으신가요?{' '}
                <Link href="/advertiser/login" className="text-slate-800 hover:underline font-medium">
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
