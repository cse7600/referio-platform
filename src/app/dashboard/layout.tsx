'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Home,
  Users,
  Wallet,
  User,
  Menu,
  LogOut,
  ChevronDown,
  Building,
  Megaphone,
} from 'lucide-react'
import { ProgramProvider, useProgram } from './ProgramContext'
import { FeedbackWidget } from '@/components/ui/feedback-widget'

const NAV_ITEMS = [
  { href: '/dashboard', label: '홈', icon: Home },
  { href: '/dashboard/programs', label: '프로그램', icon: Building },
  { href: '/dashboard/customers', label: '고객', icon: Users },
  { href: '/dashboard/settlements', label: '지급', icon: Wallet },
  { href: '/dashboard/activity', label: '활동 지원', icon: Megaphone },
  { href: '/dashboard/profile', label: '활동정보', icon: User },
]

function ProgramSwitcher() {
  const { programs, selectedProgram, selectProgram } = useProgram()

  const approvedPrograms = programs.filter(p => p.status === 'approved')

  if (approvedPrograms.length === 0) return null

  return (
    <div className="px-4 pb-2">
      <p className="text-xs text-gray-400 mb-1.5 px-1">프로그램</p>
      <Select
        value={selectedProgram?.id || ''}
        onValueChange={selectProgram}
      >
        <SelectTrigger className="w-full text-sm h-9">
          <SelectValue placeholder="프로그램 선택" />
        </SelectTrigger>
        <SelectContent>
          {approvedPrograms.map((p) => {
            const advData = p.advertisers as unknown as { company_name: string; program_name: string | null }
            return (
              <SelectItem key={p.id} value={p.id}>
                {advData.program_name || advData.company_name}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

function DashboardContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { partner } = useProgram() // ProgramContext에서 공유 — 중복 DB 조회 제거
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-50 text-indigo-600 font-medium'
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
      <aside className="hidden lg:fixed lg:top-8 lg:bottom-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-slate-900 text-lg font-bold">Referio</span>
            </Link>
          </div>

          {/* Program Switcher */}
          <div className="pt-4">
            <ProgramSwitcher />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavLinks />
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t">
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-indigo-50 text-indigo-600 text-sm">
                          {partner?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {partner?.name || '로딩중...'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">프로필 설정</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50" />
                <span className="text-sm text-gray-400">로딩중...</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-8 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="text-slate-900 text-lg font-bold">Referio</span>
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
                <div className="flex items-center gap-3 p-4 border-b">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-indigo-50 text-indigo-600">
                      {partner?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{partner?.name || '로딩중...'}</p>
                    <p className="text-xs text-gray-500">{partner?.email}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <ProgramSwitcher />
                </div>

                <nav className="flex-1 p-4 space-y-1">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                </nav>

                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleLogout}
                  >
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
      <main className="lg:pl-64 pt-24 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>

      <FeedbackWidget />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ProgramProvider가 내부적으로 partner + programs를 한 번에 로드
  return (
    <ProgramProvider>
      <DashboardContent>{children}</DashboardContent>
    </ProgramProvider>
  )
}
