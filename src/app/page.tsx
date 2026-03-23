import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import PricingSection from '@/components/landing/PricingSection'
import EarningsSimulator from '@/components/landing/EarningsSimulator'
import HeroSection from '@/components/landing/HeroSection'
import PremiumServices from '@/components/landing/PremiumServices'
import AnimatedSections from '@/components/landing/AnimatedSections'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-slate-900 text-xl font-bold tracking-tight">Referio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">기능</a>
            <a href="#integrations" className="hover:text-slate-900 transition-colors">연동</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">요금제</a>
            <Link href="/blog" className="hover:text-slate-900 transition-colors">블로그</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link href="/advertiser/signup">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                무료로 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <HeroSection />

      {/* Animated Sections (Pain points, Features Grid, Integrations, Blog) */}
      <AnimatedSections />

      {/* Premium Services (Hero Partner + Branded Content tabs) */}
      <PremiumServices />

      {/* Pricing */}
      <PricingSection />

      {/* Referio Referral Program */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.1),transparent)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm text-white mb-6">
              <span className="font-bold">특별</span> 추천 프로그램
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Referio를 추천하고<br />매달 수익을 받으세요
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Referio를 추천하고, 추천인이 유료 플랜을 시작하면<br />
              플랜 요금의 <span className="font-bold text-white">20%</span>를 매달 받으세요.
            </p>
          </div>

          <EarningsSimulator />

          <div className="text-center mt-10">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-slate-100 text-lg px-8 h-14 gap-2">
                추천 프로그램 참여하기 <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            파트너가 만드는 매출,<br />지금 시작하세요
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            5분 안에 프로그램을 개설하고, 첫 파트너를 초대하세요.<br />
            Free 요금제로 바로 시작, 신용카드 불필요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/advertiser/signup">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 h-14 gap-2">
                무료로 시작하기 <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="mailto:sales@referio.kr">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 h-14">
                영업팀 문의
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 font-bold text-sm">R</span>
                </div>
                <span className="text-white font-bold">Referio</span>
              </div>
              <p className="text-sm leading-relaxed">
                B2B 파트너 추천 마케팅 플랫폼.<br />
                리드 유입부터 정산까지 자동으로.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">기능</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">연동</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">요금제</a></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">블로그</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">시작하기</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/advertiser/signup" className="hover:text-white transition-colors">광고주 회원가입</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">파트너 회원가입</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">파트너 로그인</Link></li>
                <li><Link href="/advertiser/login" className="hover:text-white transition-colors">광고주 로그인</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">문의</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:sales@referio.kr" className="hover:text-white transition-colors">sales@referio.kr</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">&copy; 2026 Referio. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
