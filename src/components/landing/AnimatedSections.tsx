'use client'

import Link from 'next/link'
import {
  ArrowRight,
  AlertTriangle,
  FileSpreadsheet,
  Unplug,
  TrendingDown,
  BookOpen,
  Cable,
  Target,
} from 'lucide-react'
import FadeIn, { StaggerContainer, StaggerItem } from './FadeIn'
import FeaturesGrid from './FeaturesGrid'
import IntegrationMarquee from './IntegrationLogos'

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    problem: 'Lead Source Unknown',
    problemKo: '리드 출처 불명',
    desc: '파트너가 보낸 리드인지, 자체 유입인지 구분이 안 됩니다.',
    color: 'text-red-500 bg-red-50',
  },
  {
    icon: FileSpreadsheet,
    problem: 'Manual Settlement',
    problemKo: '수작업 정산',
    desc: '매달 엑셀로 수수료를 계산하고, 세금계산서를 발행합니다.',
    color: 'text-orange-500 bg-orange-50',
  },
  {
    icon: Unplug,
    problem: 'CRM Disconnect',
    problemKo: 'CRM 단절',
    desc: '파트너 리드가 기존 세일즈 파이프라인에 연결되지 않습니다.',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    icon: TrendingDown,
    problem: 'Ads Limitations',
    problemKo: '퍼포먼스 마케팅 한계',
    desc: 'B2B 무형 서비스는 타겟팅이 어렵고 설득 주기가 길어 광고 효율이 낮습니다.',
    color: 'text-rose-500 bg-rose-50',
  },
]

const BLOG_POSTS = [
  {
    slug: 'what-is-b2b-affiliate',
    title: 'B2B 어필리에이트 마케팅이란? 2026 완벽 가이드',
    excerpt: '인플루언서 마케팅과 다른, B2B 전용 파트너 프로그램의 모든 것.',
    tag: '가이드',
    gradient: 'from-blue-500 to-indigo-600',
    icon: BookOpen,
  },
  {
    slug: 'crm-integration-guide',
    title: '리캐치, 세일즈맵과 어필리에이트를 연동하는 방법',
    excerpt: 'CRM에 파트너 리드를 자동으로 보내는 3가지 연동 패턴.',
    tag: '연동',
    gradient: 'from-emerald-500 to-teal-600',
    icon: Cable,
  },
  {
    slug: 'why-b2b-sales-need-partners',
    title: 'B2B 세일즈팀이 파트너 프로그램을 운영해야 하는 5가지 이유',
    excerpt: '아웃바운드만으로는 부족합니다. 파트너 채널이 답인 이유.',
    tag: '전략',
    gradient: 'from-violet-500 to-purple-600',
    icon: Target,
  },
]

export default function AnimatedSections() {
  return (
    <>
      {/* Pain Points */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <FadeIn className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              B2B 파트너 영업,<br />아직 스프레드시트로 관리하고 있나요?
            </h2>
            <p className="text-lg text-slate-500">
              리드가 어디서 왔는지 모르고, 파트너 성과는 추적이 안 되고, 정산은 매번 수작업.
            </p>
          </FadeIn>
          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PAIN_POINTS.map((item) => (
              <StaggerItem key={item.problem}>
                <div className="bg-white rounded-2xl p-8 border border-slate-200 h-full">
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-3">{item.problemKo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              추천 링크 하나로<br />B2B 파트너 프로그램을 완성합니다
            </h2>
            <p className="text-lg text-slate-500">
              복잡한 어필리에이트 운영을 자동화하고, 기존 세일즈 스택과 연결하세요.
            </p>
          </FadeIn>
          <FeaturesGrid />
        </div>
      </section>

      {/* Integrations - Marquee */}
      <section id="integrations" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <FadeIn className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              이미 쓰고 있는 툴과<br />바로 연결됩니다
            </h2>
            <p className="text-lg text-slate-500">
              CRM, 메신저, 자동화 도구. 기존 세일즈 스택을 바꿀 필요 없습니다.<br />
              Referio가 파트너 채널만 추가합니다.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <IntegrationMarquee />
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="text-center mt-8">
              <p className="text-sm text-slate-500">
                Webhook과 Zapier를 통해 <span className="font-medium text-slate-700">어떤 도구든</span> 연결할 수 있습니다.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Blog Preview */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">블로그</h2>
                <p className="text-slate-500 mt-1">B2B 어필리에이트 마케팅 인사이트</p>
              </div>
              <Link href="/blog" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
                전체 보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>
          <StaggerContainer className="grid md:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className={`bg-gradient-to-br ${post.gradient} rounded-2xl aspect-[16/9] flex flex-col items-center justify-center mb-4 relative overflow-hidden`}>
                    <post.icon className="w-10 h-10 text-white/90 mb-2" />
                    <span className="text-xs font-medium text-white/80 px-3 py-1 bg-white/20 rounded-full">{post.tag}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-500">{post.excerpt}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  )
}
