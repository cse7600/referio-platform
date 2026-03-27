import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import BrandedSignupForm from './BrandedSignupForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ advertiserId: string }>
  searchParams: Promise<{ code?: string; email?: string }>
}

export default async function BrandedSignupPage({ params, searchParams }: PageProps) {
  const { advertiserId } = await params
  const { code, email } = await searchParams
  const admin = createAdminClient()

  const { data: advertiser } = await admin
    .from('advertisers')
    .select('id, advertiser_id, company_name, logo_url, primary_color, program_name, program_description, signup_welcome_title, signup_welcome_message, partner_signup_enabled')
    .eq('advertiser_id', advertiserId)
    .single()

  // 광고주가 없거나 비활성화된 경우 → 일반 가입 페이지로
  if (!advertiser || !advertiser.partner_signup_enabled) {
    redirect('/signup')
  }

  return <BrandedSignupForm advertiser={advertiser} code={code} prefillEmail={email} />
}
