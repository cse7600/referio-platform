'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  TrendingUp,
  Wallet,
  LinkIcon,
  ArrowRight,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function JoinPartnerPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setCookie('affiliate_ref', ref, 30);
    }
  }, [searchParams]);

  const benefits = [
    {
      icon: LinkIcon,
      title: '링크 하나로 시작',
      description: '나만의 추천 링크를 받아 공유하세요. 링크를 통해 고객이 유입되면 수익이 발생합니다.',
    },
    {
      icon: Wallet,
      title: '투명한 수수료 정산',
      description: '명확한 기준에 따라 계약 체결 시 추천 수수료가 정산됩니다. 복잡한 조건 없습니다.',
    },
    {
      icon: BarChart3,
      title: '실시간 성과 대시보드',
      description: '추천 현황, 계약 진행 상태, 정산 내역을 대시보드에서 실시간으로 확인하세요.',
    },
    {
      icon: TrendingUp,
      title: '지속적인 수익',
      description: '일회성이 아닌 꾸준한 추천 활동으로 안정적인 부수입을 만들어보세요.',
    },
  ];

  const steps = [
    { step: '01', title: '파트너로 가입', description: '1분 안에 간편하게 가입' },
    { step: '02', title: '추천 링크 발급', description: '나만의 고유 링크 수령' },
    { step: '03', title: '주변에 공유', description: '서비스가 필요한 기업에게 소개' },
    { step: '04', title: '수수료 수령', description: '계약 완료 시 수수료 자동 정산' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8">
            <Users className="w-4 h-4" />
            <span>Referio 파트너 어필리에이트 프로그램</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            링크 하나로<br />수익을 만드세요
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Referio 파트너 프로그램에 참가하고<br className="hidden md:block" />
            기업 고객을 소개할 때마다 수수료를 받으세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 text-base px-8">
                파트너로 시작하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 혜택 */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">왜 Referio 파트너인가요?</h2>
          <p className="text-slate-500 text-lg">명확한 인센티브, 투명한 시스템</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((b) => (
            <Card key={b.title} className="border border-slate-200 shadow-none hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <b.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{b.title}</h3>
                  <p className="text-sm text-slate-500">{b.description}</p>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-3">어떻게 시작하나요?</h2>
            <p className="text-slate-500 text-lg">4단계면 충분합니다</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.step} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="text-3xl font-bold text-indigo-600 mb-3">{s.step}</div>
                <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 파트너 혜택 */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">파트너에게 제공되는 것</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { label: '전용 대시보드', desc: '추천 현황과 정산 내역을 실시간으로 확인' },
            { label: '전담 운영 지원', desc: '궁금한 점은 운영팀이 직접 도와드립니다' },
            { label: '마케팅 소재 제공', desc: '추천에 활용할 콘텐츠와 템플릿 제공' },
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
      <section className="bg-indigo-950 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-slate-300 mb-8 text-lg">
            가입하고 나만의 추천 링크를 받아보세요.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 text-base px-8">
              파트너로 가입하기
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
