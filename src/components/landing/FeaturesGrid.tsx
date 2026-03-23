'use client'

import { motion } from 'framer-motion'
import {
  Link2,
  Zap,
  BarChart3,
  Users,
  Shield,
  RefreshCw,
} from 'lucide-react'

const features = [
  {
    icon: Link2,
    title: 'Referral Link Generation',
    titleKo: '추천 링크 자동 생성',
    desc: '파트너별 고유 추천 코드와 랜딩 페이지 URL을 자동으로 발급합니다. 파트너는 링크만 공유하면 됩니다.',
    color: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-50 text-blue-600',
    span: 'md:col-span-2', // wide card
  },
  {
    icon: Zap,
    title: 'CRM Auto-Sync',
    titleKo: 'CRM 자동 연동',
    desc: '유입된 리드를 리캐치, 세일즈맵, 허브스팟에 자동으로 전달합니다. 기존 파이프라인이 끊기지 않습니다.',
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50 text-violet-600',
    span: 'md:col-span-1',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboard',
    titleKo: '실시간 성과 대시보드',
    desc: '파트너별 리드 수, 전환율, 매출 기여도를 실시간으로 추적합니다. 데이터 기반 파트너 관리.',
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50 text-emerald-600',
    span: 'md:col-span-1',
  },
  {
    icon: Users,
    title: 'Partner Management',
    titleKo: '크리에이터 & 에이전시 파트너 관리',
    desc: '블로거, 유튜버, 에이전시 등 다양한 파트너 유형을 맞춤 관리합니다. 모집부터 승인까지 한 곳에서.',
    color: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-50 text-amber-600',
    span: 'md:col-span-2',
  },
  {
    icon: Shield,
    title: 'Auto Settlement',
    titleKo: '자동 정산 관리',
    desc: '리드에서 계약, 수수료 산정, 정산까지 전 과정을 자동화합니다. 수작업 엑셀 정산은 끝.',
    color: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-50 text-rose-600',
    span: 'md:col-span-1',
  },
  {
    icon: RefreshCw,
    title: 'Tier & Incentives',
    titleKo: '티어 & 인센티브',
    desc: '성과에 따라 파트너 등급을 자동 조정하고, 차등 수수료를 적용합니다. 우수 파트너에게 동기를 부여하세요.',
    color: 'from-cyan-500 to-blue-600',
    iconBg: 'bg-cyan-50 text-cyan-600',
    span: 'md:col-span-1',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

export default function FeaturesGrid() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto"
    >
      {features.map((feature) => (
        <motion.div
          key={feature.title}
          variants={itemVariants}
          className={`group relative p-8 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all overflow-hidden ${feature.span}`}
        >
          {/* Hover gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />

          <div className="relative">
            <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-5`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg mb-3">{feature.titleKo}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
