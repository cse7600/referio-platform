import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAdvertiserNewLeadEmail, sendFirstLeadEmail } from '@/lib/email'
import { notifyNewInquiry } from '@/lib/slack'

// UUID 패턴 확인
function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// POST: 문의 폼으로 리드 생성
export async function POST(request: NextRequest) {
  try {
    const { advertiser_id, name, phone, inquiry, referral_code, channel } = await request.json()

    if (!advertiser_id || !name || !phone) {
      return NextResponse.json({ error: '이름과 연락처는 필수입니다' }, { status: 400 })
    }

    const supabase = await createClient()

    // 광고주 확인 (UUID 또는 text advertiser_id 둘 다 지원) + 이메일 알림용 필드 포함
    let advertiser: { id: string; inquiry_form_enabled: boolean | null; contact_email: string | null; company_name: string | null } | null = null

    if (isUuid(advertiser_id)) {
      const { data } = await supabase
        .from('advertisers')
        .select('id, inquiry_form_enabled, contact_email, company_name')
        .eq('id', advertiser_id)
        .maybeSingle()
      advertiser = data
    } else {
      const { data } = await supabase
        .from('advertisers')
        .select('id, inquiry_form_enabled, contact_email, company_name')
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

    // referral_code로 파트너 매칭
    let partnerId: string | null = null
    if (referral_code) {
      const { data: enrollment } = await supabase
        .from('partner_programs')
        .select('partner_id')
        .eq('referral_code', referral_code)
        .eq('advertiser_id', advertiser.id)
        .eq('status', 'approved')
        .maybeSingle()
      partnerId = enrollment?.partner_id ?? null
    }

    // 리드 생성
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        advertiser_id: advertiser.id,
        partner_id: partnerId,
        name,
        phone,
        inquiry: inquiry || null,
        referral_code_input: referral_code || null,
        channel: channel || null,
        contract_status: 'pending',
      })

    if (insertError) {
      console.error('Inquiry insert error:', insertError)
      return NextResponse.json({ error: '문의 접수에 실패했습니다' }, { status: 500 })
    }

    // 광고주 이메일 알림 (비동기, 실패해도 리드 접수 성공 응답 유지)
    if (advertiser.contact_email) {
      sendAdvertiserNewLeadEmail({
        advertiserEmail: advertiser.contact_email,
        companyName: advertiser.company_name || '',
        leadName: name,
        leadPhone: phone,
        referralCode: referral_code || null,
        partnerMatched: !!partnerId,
        source: 'inquiry',
      }).catch(() => {})
    }

    // Email 7: 첫 고객 유입 축하 (파트너 있을 때만, 해당 파트너의 첫 리드일 때만)
    if (partnerId) {
      try {
        const { count: leadCount } = await supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('partner_id', partnerId)

        if (leadCount === 1) {
          // First ever lead for this partner
          const { data: partner } = await supabase
            .from('partners')
            .select('email, name')
            .eq('id', partnerId)
            .single()

          const { data: prog } = await supabase
            .from('partner_programs')
            .select('referral_code, advertiser_id, advertisers!inner(company_name, program_name, homepage_url)')
            .eq('partner_id', partnerId)
            .eq('advertiser_id', advertiser.id)
            .single()

          if (partner?.email && prog) {
            const adv = Array.isArray(prog.advertisers) ? prog.advertisers[0] : prog.advertisers as { company_name: string; program_name: string | null; homepage_url: string | null }
            const refUrl = adv?.homepage_url
              ? `${adv.homepage_url}${adv.homepage_url.includes('?') ? '&' : '?'}ref=${prog.referral_code}`
              : undefined

            sendFirstLeadEmail({
              partnerEmail: partner.email,
              partnerName: partner.name || '파트너',
              programName: adv?.program_name || '',
              advertiserCompanyName: adv?.company_name || '',
              referralUrl: refUrl,
              leadReceivedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
              partnerId,
            }).catch(() => {})
          }
        }
      } catch (e) {
        console.error('[Email7] First lead email error:', e)
      }
    }

    // Slack 알림 (비동기)
    notifyNewInquiry({
      leadName: name,
      leadPhone: phone,
      companyName: advertiser.company_name || '',
      referralCode: referral_code || null,
      partnerMatched: !!partnerId,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: '문의가 접수되었습니다' }, { status: 201 })
  } catch (error) {
    console.error('Inquiry API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
