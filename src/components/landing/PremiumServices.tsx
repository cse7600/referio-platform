'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Search,
  Handshake,
  Rocket,
  Eye,
  FileText,
  Banknote,
} from 'lucide-react'

const TABS = [
  {
    id: 'hero-partner',
    label: '히어로 파트너',
    badge: '프리미엄',
    badgeColor: 'bg-indigo-500/20 text-indigo-300',
  },
  {
    id: 'branded-content',
    label: '브랜디드 콘텐츠',
    badge: '신규',
    badgeColor: 'bg-emerald-500/20 text-emerald-300',
  },
] as const

type TabId = (typeof TABS)[number]['id']

const HERO_PARTNER_STEPS = [
  {
    icon: Search,
    step: '01',
    title: '프로그램 분석',
    desc: 'Analyze product, target customers, and competitive landscape to design an optimal partner strategy.',
    descKo: '제품 특성, 타겟 고객, 경쟁 환경을 분석하고 최적의 파트너 전략을 설계합니다.',
  },
  {
    icon: Handshake,
    step: '02',
    title: '크리에이터 매칭',
    desc: 'Directly recruit influential bloggers and YouTubers and onboard them as partners.',
    descKo: '업계 영향력 있는 블로거, 유튜버를 직접 섭외하고 파트너로 온보딩합니다.',
  },
  {
    icon: Rocket,
    step: '03',
    title: '콘텐츠 제작 & 론칭',
    desc: 'Produce conversion-optimized reviews, comparisons, and case studies and launch them.',
    descKo: '리뷰, 비교 분석, 사용기 등 전환에 최적화된 콘텐츠를 제작하고 론칭합니다.',
  },
]

const BRANDED_CONTENT_STEPS = [
  {
    icon: Eye,
    step: '01',
    title: '우수 파트너 발굴',
    desc: 'Identify high-converting partners from the performance dashboard and send collaboration proposals.',
    descKo: '성과 대시보드에서 전환율 높은 파트너를 확인하고, 협업 제안을 보내세요.',
  },
  {
    icon: FileText,
    step: '02',
    title: '브리프 & 협업 제안',
    desc: 'Set content type, budget, and deadline then deliver a detailed brief.',
    descKo: '콘텐츠 유형, 예산, 마감일을 설정하고 상세한 브리프를 전달합니다.',
  },
  {
    icon: Banknote,
    step: '03',
    title: '콘텐츠 제작 & 자동 정산',
    desc: 'Partners create content, and after review, settlement is completed automatically.',
    descKo: '파트너가 콘텐츠를 제작하고, 검수 후 자동으로 정산이 완료됩니다.',
  },
]

export default function PremiumServices() {
  const [activeTab, setActiveTab] = useState<TabId>('hero-partner')
  const steps = activeTab === 'hero-partner' ? HERO_PARTNER_STEPS : BRANDED_CONTENT_STEPS

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(99,102,241,0.08),transparent)]" />
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            파트너 프로그램의 성장을 가속하는<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              프리미엄 서비스
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            파트너 모집부터 브랜디드 콘텐츠까지, Referio가 직접 운영합니다.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-12">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : tab.badgeColor
                }`}>
                  {tab.badge}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12"
          >
            {steps.map((item) => (
              <div key={item.step} className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="text-sm font-bold text-indigo-400 mb-2">단계 {item.step}</div>
                <h3 className="font-semibold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.descKo}</p>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <div className="text-center">
          {activeTab === 'hero-partner' ? (
            <Link href="mailto:sales@referio.kr">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 h-14 gap-2">
                Hero Partner 문의하기 <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <p className="text-sm text-slate-500">
              플랫폼 수수료 10% &middot; 안전 에스크로 결제 &middot; Growth 플랜 이상
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
