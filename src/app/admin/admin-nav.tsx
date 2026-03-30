'use client'

import { useState } from 'react'
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
  UserPlus,
  Megaphone,
  MessageSquare,
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
  { href: '/admin/affiliate', label: '어필리에이트', icon: Megaphone },
  { href: '/admin/users', label: '유저 관리', icon: UserPlus },
  { href: '/admin/support', label: '문의 관리', icon: MessageSquare },
]

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
