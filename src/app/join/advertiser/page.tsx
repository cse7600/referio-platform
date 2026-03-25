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
      title: 'Partner network management',
      description: 'Manage the entire partner lifecycle from recruitment and approval to performance tracking in one place.',
    },
    {
      icon: BarChart3,
      title: 'Real-time lead tracking',
      description: 'Track every lead from partner referral to contract signing with real-time status visibility.',
    },
    {
      icon: Settings,
      title: 'CRM integration',
      description: 'Automatically sync leads with Airtable, HubSpot, and other CRM tools.',
    },
    {
      icon: Shield,
      title: 'Automated settlements',
      description: 'Commission calculations and settlement management are automated based on clear criteria.',
    },
  ];

  const stats = [
    { value: 'Zero-cost', label: 'Setup fee' },
    { value: '5 min', label: 'Onboarding time' },
    { value: 'Real-time', label: 'Lead tracking' },
    { value: 'Auto', label: 'Settlement processing' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-950 via-orange-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.15),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8">
            <Building2 className="w-4 h-4" />
            <span>B2B Affiliate Platform for Advertisers</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Build a B2B pipeline<br />through partner referrals
          </h1>
          <p className="text-lg md:text-xl text-orange-200/80 mb-10 max-w-2xl mx-auto">
            Get qualified B2B leads from partners.<br className="hidden md:block" />
            Track referrals to contracts, all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/advertiser/login">
              <Button size="lg" className="bg-white text-orange-900 hover:bg-slate-100 text-base px-8">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
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

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need for partner marketing</h2>
          <p className="text-slate-500 text-lg">An all-in-one platform from partner management to settlement</p>
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

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple 3-step setup</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                step: '01',
                title: 'Create an account',
                desc: 'Register your company and set up the partner program in 5 minutes.',
              },
              {
                icon: Users,
                step: '02',
                title: 'Recruit partners',
                desc: 'Send partner invitation links and manage approvals.',
              },
              {
                icon: BarChart3,
                step: '03',
                title: 'Track results',
                desc: 'Monitor real-time lead inflow, conversions, and settlement data.',
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

      {/* Why Referio */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Why Referio?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { label: 'No setup cost', desc: 'Start for free, pay only for results' },
            { label: 'Designed for B2B', desc: 'Built specifically for B2B sales cycles' },
            { label: 'Full automation', desc: 'From tracking to settlement, everything is automated' },
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
          <h2 className="text-3xl font-bold mb-4">Grow your B2B pipeline with partners</h2>
          <p className="text-orange-200/80 mb-8 text-lg">
            Set up your affiliate program and start getting partner referrals today.
          </p>
          <Link href="/advertiser/login">
            <Button size="lg" className="bg-white text-orange-900 hover:bg-slate-100 text-base px-8">
              Get Started
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
