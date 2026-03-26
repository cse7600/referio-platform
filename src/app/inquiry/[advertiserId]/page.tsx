'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { User, Phone, Mail, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface AdvertiserInfo {
  company_name: string
  program_name: string | null
  logo_url: string | null
  primary_color: string | null
  contact_phone: string | null
  program_description: string | null
}

function InquiryForm({ advertiserId }: { advertiserId: string }) {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') || ''

  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', email: '', inquiry: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAdvertiser = async () => {
      try {
        const res = await fetch(`/api/public/advertiser?id=${encodeURIComponent(advertiserId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.advertiser) setAdvertiser(data.advertiser)
        }
      } catch {
        // 광고주 정보 없어도 폼은 표시
      }
      setLoadingInfo(false)
    }
    fetchAdvertiser()
  }, [advertiserId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setError('이름과 연락처를 입력해주세요')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Build inquiry text: prepend email if provided
      const emailPrefix = form.email.trim() ? `[이메일: ${form.email.trim()}]\n` : ''
      const inquiryText = emailPrefix + (form.inquiry.trim() || '')

      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          inquiry: inquiryText || null,
          referral_code: ref || null,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        if (res.status === 409) {
          setError('이미 접수된 문의입니다. 담당자 연락을 기다려 주세요.')
        } else {
          setError(data.error || '문의 접수에 실패했습니다')
        }
      }
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
    setSubmitting(false)
  }

  const primaryColor = advertiser?.primary_color || '#4f46e5'
  const programTitle = advertiser?.program_name || advertiser?.company_name || '파트너 프로그램'

  // 성공 화면
  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${primaryColor}18 0%, #f8fafc 100%)` }}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${primaryColor}18` }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">문의가 접수되었습니다!</h2>
          <p className="text-slate-500 mb-6">담당자가 확인 후 빠르게 연락드리겠습니다.</p>

          {advertiser?.contact_phone && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-400 mb-1">급하신 분은 직접 연락해주세요</p>
              <a
                href={`tel:${advertiser.contact_phone.replace(/[^0-9]/g, '')}`}
                className="text-lg font-bold hover:underline"
                style={{ color: primaryColor }}
              >
                {advertiser.contact_phone}
              </a>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              powered by <span className="font-semibold text-slate-500">Referio</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, ${primaryColor}12 0%, #f8fafc 50%)` }}
    >
      {/* 광고주 브랜딩 헤더 */}
      <div className="pt-10 pb-6 px-4 text-center">
        {loadingInfo ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : (
          <>
            {advertiser?.logo_url ? (
              <img
                src={advertiser.logo_url}
                alt={advertiser.company_name}
                className="h-12 object-contain mx-auto mb-4"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white font-bold text-2xl">
                  {(advertiser?.company_name || 'R').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900">{programTitle}</h1>
            {advertiser?.company_name && advertiser?.program_name && (
              <p className="text-sm text-slate-500 mt-0.5">{advertiser.company_name}</p>
            )}
            {advertiser?.program_description && (
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                {advertiser.program_description}
              </p>
            )}
          </>
        )}
      </div>

      {/* 폼 카드 */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 브랜드 컬러 상단 바 */}
          <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />

          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-slate-800">상담 신청</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                아래 정보를 입력하시면 담당자가 연락드립니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 이름 */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  이름 <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="홍길동"
                    className="pl-9 h-11 text-sm"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                    className="pl-9 h-11 text-sm"
                    required
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* 이메일 */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  이메일 <span className="text-slate-400 font-normal">(선택)</span>
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="pl-9 h-11 text-sm"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <Label htmlFor="inquiry" className="text-sm font-medium text-slate-700">
                  문의 내용 <span className="text-slate-400 font-normal">(선택)</span>
                </Label>
                <div className="relative mt-1.5">
                  <MessageSquare className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  <Textarea
                    id="inquiry"
                    value={form.inquiry}
                    onChange={e => setForm(f => ({ ...f, inquiry: e.target.value }))}
                    placeholder="궁금한 점이나 관심 서비스를 남겨주세요..."
                    className="pl-9 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 개인정보 동의 */}
              <p className="text-xs text-slate-400">
                상담 신청 시{' '}
                <a
                  href="/privacy"
                  className="underline hover:text-slate-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  개인정보처리방침
                </a>
                에 동의하는 것으로 간주됩니다.
              </p>

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    접수 중...
                  </>
                ) : (
                  '상담 신청하기'
                )}
              </Button>

              {/* 전화 문의 */}
              {advertiser?.contact_phone && (
                <div className="text-center pt-1">
                  <p className="text-xs text-slate-400 mb-1">급하신 분은 전화로 문의해주세요</p>
                  <a
                    href={`tel:${advertiser.contact_phone.replace(/[^0-9]/g, '')}`}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {advertiser.contact_phone}
                  </a>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="pb-8 text-center">
        <p className="text-xs text-slate-400">
          powered by{' '}
          <a href="https://referio.puzl.co.kr" className="font-semibold text-slate-500 hover:text-slate-700" target="_blank" rel="noopener noreferrer">
            Referio
          </a>
        </p>
      </div>
    </div>
  )
}

export default function InquiryFormPage() {
  const params = useParams()
  const advertiserId = params.advertiserId as string

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      }
    >
      <InquiryForm advertiserId={advertiserId} />
    </Suspense>
  )
}
