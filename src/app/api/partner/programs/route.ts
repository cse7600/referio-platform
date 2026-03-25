import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateShortCode(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = prefix + '_'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

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
      .select('id, name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 })
    }

    const admin = createAdminClient()

    // 1. 공개 광고주 프로그램 목록
    const { data: advertisers, error: advError } = await admin
      .from('advertisers')
      .select('id, company_name, program_name, program_description, logo_url, primary_color, default_lead_commission, default_contract_commission, category, homepage_url, landing_url, is_system')
      .eq('is_public', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (advError) console.error('[partner/programs] advertisers query error:', advError.message)

    // 2. 파트너의 참가 현황
    const { data: enrollments } = await supabase
      .from('partner_programs')
      .select('*')
      .eq('partner_id', partner.id)

    const advertiserPrograms = (advertisers || []).map(adv => ({
      ...adv,
      is_affiliate_campaign: false,
      enrollment: enrollments?.find(e => e.advertiser_id === adv.id) || null,
    }))

    // 3. 활성 어필리에이트 캠페인 (Referio 자체 모집 프로그램)
    const { data: campaigns } = await admin
      .from('referio_campaigns')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    const campaignPrograms = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // 이 파트너가 이미 이 캠페인에 대한 어필리에이트 링크를 갖고 있는지 확인
        const { data: existingLink } = await admin
          .from('referio_affiliate_links')
          .select('short_code, click_count, conversion_count')
          .eq('campaign_id', campaign.id)
          .eq('promoter_partner_id', partner.id)
          .maybeSingle()

        return {
          id: campaign.id,
          company_name: 'Referio',
          program_name: campaign.name,
          program_description: campaign.description,
          logo_url: null,
          primary_color: '#6366f1',
          homepage_url: null,
          landing_url: campaign.landing_path,
          default_lead_commission: campaign.reward_amount,
          default_contract_commission: 0,
          category: null,
          is_system: true,
          is_affiliate_campaign: true,
          affiliate_campaign_type: campaign.type,
          reward_trigger: campaign.reward_trigger,
          enrollment: existingLink
            ? {
                id: existingLink.short_code,
                status: 'approved',
                referral_code: existingLink.short_code,
                lead_commission: campaign.reward_amount,
                contract_commission: 0,
                applied_at: '',
              }
            : null,
        }
      })
    )

    // 어필리에이트 캠페인을 맨 앞에 배치
    const programs = [...campaignPrograms, ...advertiserPrograms]

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
      .select('id, name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 })
    }

    const { advertiser_id } = await request.json()

    if (!advertiser_id) {
      return NextResponse.json({ error: '프로그램 ID가 필요합니다' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ── 어필리에이트 캠페인 참가 신청 분기 ──
    const { data: campaign } = await admin
      .from('referio_campaigns')
      .select('*')
      .eq('id', advertiser_id)
      .eq('is_active', true)
      .maybeSingle()

    if (campaign) {
      // 이미 링크가 있으면 중복 방지
      const { data: existingLink } = await admin
        .from('referio_affiliate_links')
        .select('id, short_code')
        .eq('campaign_id', campaign.id)
        .eq('promoter_partner_id', partner.id)
        .maybeSingle()

      if (existingLink) {
        return NextResponse.json(
          { error: '이미 참가한 캠페인입니다', short_code: existingLink.short_code },
          { status: 409 }
        )
      }

      // short_code 생성 (파트너 모집: p_, 광고주 모집: a_)
      const prefix = campaign.type === 'partner_recruitment' ? 'p' : 'a'
      let short_code = generateShortCode(prefix)
      let attempts = 0
      while (attempts < 5) {
        const { data: dup } = await admin
          .from('referio_affiliate_links')
          .select('id')
          .eq('short_code', short_code)
          .maybeSingle()
        if (!dup) break
        short_code = generateShortCode(prefix)
        attempts++
      }

      const { data: newLink, error: linkError } = await admin
        .from('referio_affiliate_links')
        .insert({
          campaign_id: campaign.id,
          promoter_type: 'partner',
          promoter_partner_id: partner.id,
          promoter_name: partner.name || '파트너',
          promoter_email: partner.email || null,
          short_code,
        })
        .select()
        .single()

      if (linkError) {
        console.error('Affiliate link creation error:', linkError)
        return NextResponse.json({ error: '링크 생성에 실패했습니다' }, { status: 500 })
      }

      // enrollment 형태로 반환 (기존 UI 호환)
      return NextResponse.json({
        enrollment: {
          id: newLink.short_code,
          status: 'approved',
          referral_code: newLink.short_code,
          lead_commission: campaign.reward_amount,
          contract_commission: 0,
          applied_at: newLink.created_at,
        },
      }, { status: 201 })
    }

    // ── 일반 광고주 프로그램 참가 신청 ──
    const { data: advertiser } = await admin
      .from('advertisers')
      .select('id, default_lead_commission, default_contract_commission, auto_approve_partners')
      .eq('id', advertiser_id)
      .eq('is_public', true)
      .eq('status', 'active')
      .maybeSingle()

    if (!advertiser) {
      return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
    }

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

    const autoApprove = advertiser.auto_approve_partners !== false
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: enrollment, error: insertError } = await supabase
      .from('partner_programs')
      .insert({
        partner_id: partner.id,
        advertiser_id,
        referral_code: referralCode,
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
