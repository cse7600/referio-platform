'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
} from 'lucide-react';

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function JoinAdvertiserPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setCookie('affiliate_ref', ref, 30);
    }
  }, [searchParams]);

  const features = [
    {
      icon: Users,
      title: '파트너 네트워크 관리',
      description: '파트너 모집·승인부터 성과 추적까지 전체 라이프사이클을 한 곳에서 관리합니다.',
    },
    {
      icon: BarChart3,
      title: '실시간 리드 추적',
      description: '파트너 추천부터 계약 완료까지 모든 리드의 상태를 실시간으로 확인합니다.',
    },
    {
      icon: Settings,
      title: 'CRM 연동',
      description: 'Airtable, HubSpot 등 기존 CRM 도구와 자동으로 리드를 동기화합니다.',
    },
    {
      icon: Shield,
      title: '자동 정산 처리',
      description: '명확한 기준에 따라 수수료 계산과 정산 관리가 자동으로 처리됩니다.',
    },
  ];

  const stats = [
    { value: '무료', label: '초기 설정 비용' },
    { value: '5분', label: '온보딩 소요 시간' },
    { value: '실시간', label: '리드 추적' },
    { value: '자동', label: '정산 처리' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-950 via-orange-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.15),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8">
            <Building2 className="w-4 h-4" />
            <span>Referio 광고주 파트너 마케팅 플랫폼</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            파트너 추천으로<br />B2B 파이프라인을 만드세요
          </h1>
          <p className="text-lg md:text-xl text-orange-200/80 mb-10 max-w-2xl mx-auto">
            파트너로부터 검증된 B2B 리드를 받아보세요.<br className="hidden md:block" />
            추천부터 계약까지, 하나의 플랫폼에서 관리합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/advertiser/login">
              <Button size="lg" className="bg-white text-orange-900 hover:bg-slate-100 text-base px-8">
                도입 문의하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 지표 */}
      <section className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-bold text-orange-600 mb-1">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 기능 */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">파트너 마케팅에 필요한 모든 것</h2>
          <p className="text-slate-500 text-lg">파트너 관리부터 정산까지 올인원 플랫폼</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="border border-slate-200 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 진행 방법 */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">3단계로 시작</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                step: '01',
                title: '계정 개설',
                desc: '회사 정보를 등록하고 파트너 프로그램을 5분 안에 설정합니다.',
              },
              {
                icon: Users,
                step: '02',
                title: '파트너 모집',
                desc: '파트너 초대 링크를 전달하고 승인을 관리합니다.',
              },
              {
                icon: BarChart3,
                step: '03',
                title: '성과 확인',
                desc: '실시간 리드 유입, 전환, 정산 데이터를 모니터링합니다.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-8 border border-slate-200 text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-sm font-medium text-orange-600 mb-2">Step {item.step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referio를 선택하는 이유 */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">왜 Referio인가요?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { label: '초기 비용 없음', desc: '무료로 시작, 성과 기반으로만 비용 발생' },
            { label: 'B2B 특화 설계', desc: 'B2B 영업 사이클에 최적화된 플랫폼' },
            { label: '완전 자동화', desc: '추적부터 정산까지 모든 과정을 자동화' },
          ].map((item) => (
            <div key={item.label} className="space-y-2">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
              <h3 className="font-semibold text-slate-900">{item.label}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-950 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">파트너 추천으로 B2B 파이프라인을 키우세요</h2>
          <p className="text-orange-200/80 mb-8 text-lg">
            지금 어필리에이트 프로그램을 개설하고 파트너 추천을 받아보세요.
          </p>
          <Link href="/advertiser/login">
            <Button size="lg" className="bg-white text-orange-900 hover:bg-slate-100 text-base px-8">
              도입 문의하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-semibold text-slate-700">Referio</span>
          </div>
          <p>&copy; 2025 Referio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
