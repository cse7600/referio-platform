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

    // 캠페인 조회 (활성 캠페인 우선)
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', session.advertiserUuid)
      .order('is_active', { ascending: false })
      .limit(1)
      .single()

    if (campaignError && campaignError.code !== 'PGRST116') {
      console.error('Campaign query error:', campaignError)
    }

    // 티어 규칙 조회
    let tierRules: unknown[] = []
    if (campaign) {
      const { data: rules } = await supabase
        .from('tier_rules')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('tier')

      tierRules = rules || []
    }

    // 프로모션 조회
    let promotions: unknown[] = []
    if (campaign) {
      const { data: promos } = await supabase
        .from('promotions')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('start_date', { ascending: false })

      promotions = promos || []
    }

    return NextResponse.json({
      campaign,
      tierRules,
      promotions,
    })

  } catch (error) {
    console.error('Campaigns API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 권한 확인
    if (!canManage(session)) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { campaign, tierRules } = body

    if (!campaign || !campaign.id) {
      return NextResponse.json(
        { error: '캠페인 정보가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 해당 광고주의 캠페인인지 확인
    const { data: existingCampaign, error: checkError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign.id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (checkError || !existingCampaign) {
      return NextResponse.json(
        { error: '캠페인을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 캠페인 업데이트
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        name: campaign.name,
        is_active: campaign.is_active,
        valid_amount: campaign.valid_amount,
        contract_amount: campaign.contract_amount,
        tier_pricing_enabled: campaign.tier_pricing_enabled,
        landing_url: campaign.landing_url,
        commission_rate: campaign.commission_rate,
        min_settlement: campaign.min_settlement,
        duplicate_check_days: campaign.duplicate_check_days,
        valid_deadline_days: campaign.valid_deadline_days,
        contract_deadline_days: campaign.contract_deadline_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id)

    if (updateError) {
      console.error('Campaign update error:', updateError)
      return NextResponse.json(
        { error: '캠페인 저장에 실패했습니다' },
        { status: 500 }
      )
    }

    // 티어 규칙 업데이트 (기존 삭제 후 재생성)
    if (tierRules && Array.isArray(tierRules)) {
      // 기존 규칙 삭제 (advertiser_id 필터 포함)
      await supabase
        .from('tier_rules')
        .delete()
        .eq('campaign_id', campaign.id)
        .eq('advertiser_id', session.advertiserUuid)

      // 새 규칙 삽입
      const newRules = tierRules
        .filter((r: { valid_amount?: number | null; contract_amount?: number | null }) =>
          r.valid_amount !== null || r.contract_amount !== null
        )
        .map((r: { tier: string; min_contracts: number; valid_amount: number | null; contract_amount: number | null }) => ({
          campaign_id: campaign.id,
          advertiser_id: session.advertiserUuid,
          tier: r.tier,
          min_contracts: r.min_contracts || 0,
          valid_amount: r.valid_amount,
          contract_amount: r.contract_amount,
        }))

      if (newRules.length > 0) {
        const { error: rulesError } = await supabase
          .from('tier_rules')
          .insert(newRules)

        if (rulesError) {
          console.error('Tier rules insert error:', rulesError)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Campaign PUT error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 권한 확인 (admin만 생성 가능)
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: '캠페인 이름이 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 새 캠페인 생성
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        advertiser_id: session.advertiserUuid,
        name,
        is_active: true,
        valid_amount: 15000,
        contract_amount: 20000,
        tier_pricing_enabled: false,
        commission_rate: 10,
        min_settlement: 50000,
        duplicate_check_days: 90,
        valid_deadline_days: 7,
        contract_deadline_days: 30,
      })
      .select()
      .single()

    if (error) {
      console.error('Campaign create error:', error)
      return NextResponse.json(
        { error: '캠페인 생성에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign }, { status: 201 })

  } catch (error) {
    console.error('Campaign POST error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
