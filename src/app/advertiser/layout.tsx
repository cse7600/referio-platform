'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FeedbackWidget } from '@/components/ui/feedback-widget'
// DEMO[chabyulhwa]
import { DemoModeProvider, useDemoMode } from '@/contexts/demo-mode-context'

type AdvertiserType = 'inquiry' | 'event_tracking' | 'hybrid'

interface Advertiser {
  id: string
  advertiserId: string
  companyName: string
  userId: string
  logoUrl?: string
  primaryColor?: string
  advertiserType?: AdvertiserType
}

// DEMO[chabyulhwa] — 시연 모드일 때 event_tracking 으로 오버라이드
const DEMO_ADVERTISER_ID = 'chabyulhwa'

function AdvertiserLayoutInner({
  children,
  advertiser,
  onLogout,
}: {
  children: React.ReactNode
  advertiser: Advertiser
  onLogout: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // DEMO[chabyulhwa]
  const { isDemoMode, toggleDemoMode } = useDemoMode()
  const isDemo = advertiser.advertiserId === DEMO_ADVERTISER_ID
  const effectiveType: AdvertiserType = isDemo && isDemoMode
    ? 'event_tracking'
    : (advertiser.advertiserType ?? 'inquiry')

  const navItems = getNavItemsByType(effectiveType)

  function getNavItemsByType(type: AdvertiserType) {
    const common = [
      { href: '/advertiser/dashboard', icon: '📊', label: '대시보드' },
      { href: '/advertiser/partners', icon: '👥', label: '파트너 관리' },
    ]

    const dataNav = type === 'event_tracking'
      ? [{ href: '/advertiser/events', icon: '📈', label: '이벤트 현황' }]
      : type === 'hybrid'
        ? [
            { href: '/advertiser/referrals', icon: '📋', label: '고객 관리' },
            { href: '/advertiser/events', icon: '📈', label: '이벤트 현황' },
          ]
        : [{ href: '/advertiser/referrals', icon: '📋', label: '고객 관리' }]

    const tail = [
      { href: '/advertiser/settlements', icon: '💰', label: '정산 관리' },
      { href: '/advertiser/campaigns', icon: '📢', label: '캠페인 설정' },
      { href: '/advertiser/promotions', icon: '🎉', label: '이벤트' },
      { href: '/advertiser/activity-support', icon: '📢', label: '파트너 활동 지원' },
      { href: '/advertiser/messages', icon: '💬', label: '파트너 메시지' },
      { href: '/advertiser/support', icon: '📩', label: '문의/피드백' },
      { href: '/advertiser/reports', icon: '📄', label: '리포트' },
      { href: '/advertiser/settings', icon: '⚙️', label: '설정' },
    ]

    return [...common, ...dataNav, ...tail]
  }

  // Company initial avatar (no emoji to avoid broken img on some envs)
  const initials = advertiser.companyName.slice(0, 1)

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
            {/* Text avatar — 이모지 대신 텍스트 배지로 깨짐 방지 */}
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">{advertiser.companyName}</div>
              <div className="text-xs text-slate-500">광고주 대시보드</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
            <div className="text-sm font-medium text-slate-900 truncate">{advertiser.userId}</div>
          </div>
          <Button
            onClick={onLogout}
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
            {/* DEMO[chabyulhwa] — 시연 모드 토글 버튼 */}
            {isDemo && (
              <button
                onClick={toggleDemoMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isDemoMode
                    ? 'bg-amber-400 border-amber-500 text-amber-900 hover:bg-amber-300'
                    : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                }`}
                title="시연용 더미 데이터 ON/OFF"
              >
                {isDemoMode ? '🎭 시연 모드 ON' : '🎭 시연 모드 OFF'}
              </button>
            )}
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

      <FeedbackWidget />
    </div>
  )
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
    } catch {
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

  if (isLoginPage) return <>{children}</>

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

  if (!advertiser) return null

  return (
    // DEMO[chabyulhwa] — DemoModeProvider 래퍼 (삭제 시 children 만 남기면 됨)
    <DemoModeProvider advertiserId={advertiser.advertiserId}>
      <AdvertiserLayoutInner advertiser={advertiser} onLogout={handleLogout}>
        {children}
      </AdvertiserLayoutInner>
    </DemoModeProvider>
  )
}
