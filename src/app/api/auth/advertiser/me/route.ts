import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('advertiser_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const admin = createAdminClient()

    // 세션 조회 및 만료 확인 (RLS 우회 — 쿠키 인증 기반)
    const { data: session, error: sessionError } = await admin
      .from('advertiser_sessions')
      .select('*, advertisers(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    const advertiser = session.advertisers as unknown as {
      id: string
      advertiser_id: string
      company_name: string
      user_id: string
      logo_url: string | null
      primary_color: string | null
      contact_email: string | null
      contact_phone: string | null
      status: string
      advertiser_type: string
      type_config: Record<string, unknown>
    }

    // 계정 상태 확인
    if (advertiser.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      advertiser: {
        id: advertiser.id,
        advertiserId: advertiser.advertiser_id,
        companyName: advertiser.company_name,
        userId: advertiser.user_id,
        logoUrl: advertiser.logo_url,
        primaryColor: advertiser.primary_color,
        contactEmail: advertiser.contact_email,
        contactPhone: advertiser.contact_phone,
        advertiserType: advertiser.advertiser_type,
        typeConfig: advertiser.type_config,
      },
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
