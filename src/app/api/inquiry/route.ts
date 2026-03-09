import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// UUID 패턴 확인
function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// POST: 문의 폼으로 리드 생성
export async function POST(request: NextRequest) {
  try {
    const { advertiser_id, name, phone, inquiry, referral_code } = await request.json()

    if (!advertiser_id || !name || !phone) {
      return NextResponse.json({ error: '이름과 연락처는 필수입니다' }, { status: 400 })
    }

    const supabase = await createClient()

    // 광고주 확인 (UUID 또는 text advertiser_id 둘 다 지원)
    let advertiser: { id: string; inquiry_form_enabled: boolean | null } | null = null

    if (isUuid(advertiser_id)) {
      const { data } = await supabase
        .from('advertisers')
        .select('id, inquiry_form_enabled')
        .eq('id', advertiser_id)
        .maybeSingle()
      advertiser = data
    } else {
      const { data } = await supabase
        .from('advertisers')
        .select('id, inquiry_form_enabled')
        .eq('advertiser_id', advertiser_id)
        .maybeSingle()
      advertiser = data
    }

    if (!advertiser) {
      return NextResponse.json({ error: '존재하지 않는 프로그램입니다' }, { status: 404 })
    }

    // inquiry_form_enabled가 명시적으로 false인 경우에만 차단
    // 컬럼 미존재(null) 또는 true이면 허용
    if (advertiser.inquiry_form_enabled === false) {
      return NextResponse.json({ error: '문의 폼이 비활성화되어 있습니다' }, { status: 403 })
    }

    // 중복 체크 (같은 광고주, 같은 연락처, 90일 이내)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('advertiser_id', advertiser.id)
      .eq('phone', phone)
      .gte('created_at', ninetyDaysAgo)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '이미 접수된 문의입니다' }, { status: 409 })
    }

    // 리드 생성
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        advertiser_id: advertiser.id,
        name,
        phone,
        inquiry: inquiry || null,
        referral_code_input: referral_code || null,
        contract_status: 'pending',
      })

    if (insertError) {
      console.error('Inquiry insert error:', insertError)
      return NextResponse.json({ error: '문의 접수에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '문의가 접수되었습니다' }, { status: 201 })
  } catch (error) {
    console.error('Inquiry API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
