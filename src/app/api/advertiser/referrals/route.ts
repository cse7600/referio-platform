import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession, canManage } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 피추천인 목록 조회 (파트너 정보 포함)
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select(`
        *,
        partners (
          id,
          name,
          referral_code
        )
      `)
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Referrals query error:', error)
      return NextResponse.json(
        { error: '고객 목록 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // 파트너 이름 추가
    const referralsWithPartnerName = referrals?.map(r => ({
      ...r,
      partner_name: r.partners?.name || null,
      partners: undefined, // 중첩 객체 제거
    }))

    return NextResponse.json({ referrals: referralsWithPartnerName })

  } catch (error) {
    console.error('Referrals API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST: 리드 수동 등록 (광고주가 직접 입력)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const { name, phone, inquiry, partner_referral_code } = await request.json()

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: '이름과 연락처는 필수입니다' }, { status: 400 })
    }

    const supabase = await createClient()

    // 파트너 추천코드로 partner_id 조회 (선택사항)
    let partnerId: string | null = null
    if (partner_referral_code?.trim()) {
      const { data: prog } = await supabase
        .from('partner_programs')
        .select('partner_id')
        .eq('referral_code', partner_referral_code.trim())
        .eq('advertiser_id', session.advertiserUuid)
        .maybeSingle()
      if (prog) partnerId = prog.partner_id
    }

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        advertiser_id: session.advertiserUuid,
        name: name.trim(),
        phone: phone.trim(),
        inquiry: inquiry?.trim() || null,
        referral_code_input: partner_referral_code?.trim() || null,
        partner_id: partnerId,
        contract_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Manual referral insert error:', error)
      return NextResponse.json({ error: '리드 등록에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ referral }, { status: 201 })

  } catch (error) {
    console.error('Referrals POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
