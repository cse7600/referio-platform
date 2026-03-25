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
      title: 'Simple referral link sharing',
      description: 'Get a unique referral link and share it. Revenue is generated when leads come in through that link.',
    },
    {
      icon: Wallet,
      title: 'Transparent commission settlement',
      description: 'Referral fees are settled when contracts are signed based on clear criteria.',
    },
    {
      icon: BarChart3,
      title: 'Real-time performance dashboard',
      description: 'Track referral status, contract progress, and settlement details in real-time on the dashboard.',
    },
    {
      icon: TrendingUp,
      title: 'Steady recurring revenue',
      description: 'Build stable income through continuous referrals, not just one-time payments.',
    },
  ];

  const steps = [
    { step: '01', title: 'Sign up as a partner', description: 'Quick signup in 1 minute' },
    { step: '02', title: 'Get a referral link', description: 'Receive a unique link from the advertiser' },
    { step: '03', title: 'Share with prospects', description: 'Share with companies that need the service' },
    { step: '04', title: 'Earn commission', description: 'Commission is settled upon contract completion' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8">
            <Users className="w-4 h-4" />
            <span>B2B Affiliate Partner Program</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Earn revenue with<br />a single referral link
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join the B2B affiliate program and earn commission<br className="hidden md:block" />
            every time you refer a corporate client.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 text-base px-8">
                Start as a Partner
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Why become a Referio partner?</h2>
          <p className="text-slate-500 text-lg">Clear incentives and a transparent system</p>
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

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500 text-lg">Start earning revenue in just 4 simple steps</p>
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

      {/* What partners get */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">What partners get</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { label: 'Personal dashboard', desc: 'Track referrals and settlements in real-time' },
            { label: 'Dedicated support', desc: 'Get help from the operations team when needed' },
            { label: 'Marketing materials', desc: 'Access referral content and templates' },
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
          <h2 className="text-3xl font-bold mb-4">Ready to start earning?</h2>
          <p className="text-slate-300 mb-8 text-lg">
            Sign up now and get your unique referral link.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 text-base px-8">
              Sign up as a Partner
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
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
