'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, Users, Zap } from 'lucide-react'

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative max-w-4xl mx-auto mt-16"
    >
      {/* Browser chrome */}
      <div className="bg-slate-900 rounded-t-2xl px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 ml-4">
          <div className="bg-slate-700 rounded-lg px-4 py-1.5 max-w-sm mx-auto">
            <span className="text-xs text-slate-400">app.referio.kr/dashboard</span>
          </div>
        </div>
      </div>
      {/* Dashboard content */}
      <div className="bg-slate-50 rounded-b-2xl border border-slate-200 border-t-0 p-6 shadow-2xl shadow-indigo-500/10">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: '활성 파트너', value: '127', icon: Users, change: '+12%', color: 'text-blue-600 bg-blue-50' },
            { label: '월간 리드', value: '2,847', icon: TrendingUp, change: '+23%', color: 'text-emerald-600 bg-emerald-50' },
            { label: '전환율', value: '34.2%', icon: Zap, change: '+5.1%', color: 'text-violet-600 bg-violet-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <span className="text-xs text-emerald-600 font-medium">{stat.change}</span>
            </div>
          ))}
        </div>
        {/* Chart placeholder */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-900">파트너 성과</span>
            <span className="text-xs text-slate-400">최근 30일</span>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {[35, 50, 42, 65, 55, 72, 60, 80, 70, 90, 85, 95, 88, 92, 78, 88, 95, 100, 92, 98].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-indigo-500/20 rounded-3xl blur-3xl -z-10" />
    </motion.div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.08),transparent)]" />

      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            top: '10%',
            right: '-10%',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
            bottom: '20%',
            left: '-5%',
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-20 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 mb-8"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            크리에이터와 함께하는 B2B 어필리에이트 플랫폼
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6"
          >
            파트너 추천으로<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              B2B 파이프라인
            </span>
            <br />
            <span className="text-4xl md:text-5xl text-slate-600 font-semibold">
              을 자동으로 채우세요
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            B2B 무형 서비스는 퍼포먼스 마케팅으로 설득하기 어렵습니다.<br className="hidden md:block" />
            블로거, 유튜버, 에이전시 파트너의 신뢰 기반 추천으로<br className="hidden md:block" />
            리드 유입부터 CRM 연동, 자동 정산까지 한 번에.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/advertiser/signup">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 h-14 gap-2">
                무료로 시작하기 <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                파트너 신청하기
              </Button>
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-sm text-slate-400 mt-4"
          >
            무료 플랜 제공 &middot; 신용카드 불필요 &middot; 5분 안에 셋업
          </motion.p>
        </div>

        {/* Dashboard Mockup */}
        <DashboardMockup />
      </div>
    </section>
  )
}
