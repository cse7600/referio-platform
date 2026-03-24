'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Advertiser {
  id: string
  advertiserId: string
  companyName: string
  userId: string
  logoUrl?: string
  primaryColor?: string
}

export default function AdvertiserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // 로그인/가입 페이지는 인증 체크 스킵
  const isLoginPage = pathname === '/advertiser/login' || pathname === '/advertiser/signup'

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false)
      return
    }

    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/advertiser/me')

      if (!response.ok) {
        router.push('/advertiser/login')
        return
      }

      const data = await response.json()
      setAdvertiser(data.advertiser)
      setLoading(false)
    } catch (err) {
      router.push('/advertiser/login')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/advertiser/logout', { method: 'POST' })
      router.push('/advertiser/login')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // 로그인 페이지는 레이아웃 없이 렌더링
  if (isLoginPage) {
    return <>{children}</>
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 인증 실패
  if (!advertiser) {
    return null
  }

  const navItems = [
    { href: '/advertiser/dashboard', icon: '📊', label: '대시보드' },
    { href: '/advertiser/partners', icon: '👥', label: '파트너 관리' },
    { href: '/advertiser/referrals', icon: '📋', label: '고객 관리' },
    { href: '/advertiser/settlements', icon: '💰', label: '정산 관리' },
    { href: '/advertiser/campaigns', icon: '📢', label: '캠페인 설정' },
    { href: '/advertiser/promotions', icon: '🎉', label: '이벤트' },
    { href: '/advertiser/activity-support', icon: '📢', label: '파트너 활동 지원' },
    { href: '/advertiser/messages', icon: '💬', label: '파트너 메시지' },
    { href: '/advertiser/settings', icon: '⚙️', label: '설정' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-200 bg-white border-r border-slate-200 overflow-hidden flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏢</div>
            <div>
              <div className="font-bold text-slate-900">{advertiser.companyName}</div>
              <div className="text-xs text-slate-500">광고주 대시보드</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-200">
          <div className="mb-3">
            <div className="text-xs text-slate-500">로그인</div>
            <div className="text-sm font-medium text-slate-900">{advertiser.userId}</div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full"
          >
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-slate-700"
          >
            <span className="text-2xl">☰</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              {advertiser.companyName}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
