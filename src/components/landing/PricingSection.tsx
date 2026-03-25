'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, MessageSquare, Phone, Users } from 'lucide-react'

const FEATURES = [
  '파트너 모집 링크 발급 및 추적',
  '리퍼럴 고객 자동 매핑',
  '정산 자동화',
  'CRM 연동 (Airtable 등)',
  '파트너 전용 포털',
  '실시간 성과 대시보드',
  '파트너 메시지 및 활동 지원',
  '전담 온보딩 지원',
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            도입 문의
          </h2>
          <p className="text-lg text-slate-500">
            비즈니스 규모와 요구사항에 맞춰 최적의 조건으로 제안드립니다.<br />
            담당자와 직접 상담 후 시작하세요.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start">
          {/* 포함 기능 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h3 className="font-semibold text-slate-900 text-lg mb-6">포함 기능</h3>
            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* 문의 CTA */}
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-indigo-400" />
                <span className="font-semibold text-lg">맞춤형 계약</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                파트너 규모, 운영 방식, 연동 요구사항에 따라 최적의 조건을 제안드립니다.
                계약 전 무료 상담을 통해 Referio가 우리 비즈니스에 맞는지 먼저 확인해보세요.
              </p>
              <div className="space-y-3">
                <Link href="mailto:referio@puzl.co.kr">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <MessageSquare className="w-4 h-4" />
                    이메일로 문의하기
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-900 text-sm">영업 문의</span>
              </div>
              <a
                href="mailto:referio@puzl.co.kr"
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                referio@puzl.co.kr
              </a>
              <p className="text-slate-400 text-xs mt-2">평일 09:00–18:00, 24시간 내 회신</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
