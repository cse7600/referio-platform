'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Wallet,
  Menu,
  LogOut,
  ArrowLeft,
  Settings,
  Building2,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/advertisers', label: '광고주 관리', icon: Building2 },
  { href: '/admin/partners', label: '파트너 관리', icon: Users },
  { href: '/admin/referrals', label: '피추천인 관리', icon: UserCheck },
  { href: '/admin/settlements', label: '정산 관리', icon: Wallet },
  { href: '/admin/campaigns', label: '캠페인 설정', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 마스터 계정 이메일 확인 (env var 또는 하드코딩된 목록)
      const masterAdminEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL
      const isMasterAdmin = masterAdminEmail
        ? user.email === masterAdminEmail
        : false

      if (isMasterAdmin) {
        setAuthenticated(true)
        setLoading(false)
        return
      }

      // 승인된 파트너만 접근 가능 (기존 로직)
      const { data: partner } = await supabase
        .from('partners')
        .select('id, status')
        .eq('auth_user_id', user.id)
        .eq('status', 'approved')
        .single()

      if (!partner) {
        router.push('/dashboard')
        return
      }

      setAuthenticated(true)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">권한 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/admin' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <Link href="/admin" className="text-blue-600 text-xl font-bold">
              Referio 마스터
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavLinks />
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-2">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start">
                <ArrowLeft className="w-4 h-4 mr-2" />
                파트너 대시보드로
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start text-gray-500" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <Link href="/admin" className="text-blue-600 text-xl font-bold">
          Referio 마스터
        </Link>

        {mounted && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <p className="font-bold text-blue-600">Referio 마스터</p>
                  <p className="text-xs text-gray-500">관리자 대시보드</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                </nav>

                <div className="p-4 border-t space-y-2">
                  <Link href="/dashboard">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      파트너 대시보드
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start text-gray-500" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </header>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
