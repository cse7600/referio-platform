import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 공개 프로그램 목록 + 참가 상태
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 })
    }

    // 공개 프로그램 목록
    const { data: advertisers, error: advError } = await supabase
      .from('advertisers')
      .select('id, company_name, program_name, program_description, logo_url, primary_color, default_lead_commission, default_contract_commission, category, homepage_url')
      .eq('is_public', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (advError) console.error('[partner/programs] advertisers query error:', advError.message)
    // 파트너의 참가 현황
    const { data: enrollments } = await supabase
      .from('partner_programs')
      .select('*')
      .eq('partner_id', partner.id)

    const programs = (advertisers || []).map(adv => ({
      ...adv,
      is_system: false,
      enrollment: enrollments?.find(e => e.advertiser_id === adv.id) || null,
    }))

    return NextResponse.json({ programs })
  } catch (error) {
    console.error('Partner programs GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST: 프로그램 참가 신청
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 })
    }

    const { advertiser_id } = await request.json()

    if (!advertiser_id) {
      return NextResponse.json({ error: '광고주 ID가 필요합니다' }, { status: 400 })
    }

    // 광고주가 공개 상태인지 확인
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id, default_lead_commission, default_contract_commission, auto_approve_partners')
      .eq('id', advertiser_id)
      .eq('is_public', true)
      .eq('status', 'active')
      .maybeSingle()

    if (!advertiser) {
      return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
    }

    // 이미 참가했는지 확인
    const { data: existing } = await supabase
      .from('partner_programs')
      .select('id, status')
      .eq('partner_id', partner.id)
      .eq('advertiser_id', advertiser_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: '이미 참가 신청한 프로그램입니다', status: existing.status },
        { status: 409 }
      )
    }

    // 자동 승인 여부 확인 (기본값: true)
    const autoApprove = advertiser.auto_approve_partners !== false

    // 참가 신청 생성 (referral_code는 트리거가 자동 생성)
    const { data: enrollment, error: insertError } = await supabase
      .from('partner_programs')
      .insert({
        partner_id: partner.id,
        advertiser_id,
        status: autoApprove ? 'approved' : 'pending',
        lead_commission: advertiser.default_lead_commission || 0,
        contract_commission: advertiser.default_contract_commission || 0,
        ...(autoApprove ? { approved_at: new Date().toISOString() } : {}),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Program enrollment error:', insertError)
      return NextResponse.json({ error: '참가 신청에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (error) {
    console.error('Partner programs POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
