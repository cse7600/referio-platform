import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { sendPartnerApprovalEmail } from '@/lib/email'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 권한 확인 (admin 또는 manager만 파트너 상태 변경 가능)
    if (!canManage(session)) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status, tier, lead_commission, contract_commission } = body

    const supabase = createAdminClient()

    // partner_programs에서 해당 파트너의 프로그램 참가 레코드 확인
    const { data: program, error: programError } = await supabase
      .from('partner_programs')
      .select('id, partner_id, advertiser_id, status')
      .eq('partner_id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (programError || !program) {
      return NextResponse.json(
        { error: '파트너를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 업데이트할 필드 구성
    const updateData: Record<string, unknown> = {}

    if (status) {
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return NextResponse.json(
          { error: '유효하지 않은 상태값입니다' },
          { status: 400 }
        )
      }
      // 승인 시 파트너 수 제한 체크
      if (status === 'approved' && program.status !== 'approved') {
        const { data: advData } = await supabase
          .from('advertisers')
          .select('plan_id, advertiser_plans(max_partners)')
          .eq('id', session.advertiserUuid)
          .single()

        const maxPartners = (advData?.advertiser_plans as unknown as { max_partners: number })?.max_partners || 5

        const { count: currentCount } = await supabase
          .from('partner_programs')
          .select('id', { count: 'exact', head: true })
          .eq('advertiser_id', session.advertiserUuid)
          .eq('status', 'approved')

        if ((currentCount || 0) >= maxPartners) {
          return NextResponse.json(
            { error: `현재 플랜의 파트너 수 제한(${maxPartners}명)에 도달했습니다. 플랜을 업그레이드해주세요.` },
            { status: 400 }
          )
        }
      }

      updateData.status = status
      if (status === 'approved') updateData.approved_at = new Date().toISOString()
    }

    if (tier) {
      if (!['authorized', 'silver', 'gold', 'platinum'].includes(tier)) {
        return NextResponse.json(
          { error: '유효하지 않은 티어입니다' },
          { status: 400 }
        )
      }
      updateData.tier = tier
    }

    if (lead_commission !== undefined) updateData.lead_commission = lead_commission
    if (contract_commission !== undefined) updateData.contract_commission = contract_commission

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 내용이 없습니다' },
        { status: 400 }
      )
    }

    // partner_programs 업데이트
    const { error: updateError } = await supabase
      .from('partner_programs')
      .update(updateData)
      .eq('id', program.id)

    if (updateError) {
      console.error('Partner program update error:', updateError)
      return NextResponse.json(
        { error: '파트너 상태 변경에 실패했습니다' },
        { status: 500 }
      )
    }

    // 승인 시 이메일 알림 발송
    if (status === 'approved' && program.status !== 'approved') {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('name, email')
        .eq('id', id)
        .single()

      const { data: advertiserData } = await supabase
        .from('advertisers')
        .select('company_name, program_name')
        .eq('id', session.advertiserUuid)
        .single()

      // 업데이트된 프로그램에서 referral_code 조회
      const { data: updatedProgram } = await supabase
        .from('partner_programs')
        .select('referral_code')
        .eq('id', program.id)
        .single()

      if (partnerData?.email && advertiserData) {
        sendPartnerApprovalEmail({
          partnerEmail: partnerData.email,
          partnerName: partnerData.name,
          advertiserCompanyName: advertiserData.company_name,
          programName: advertiserData.program_name || advertiserData.company_name,
          referralCode: updatedProgram?.referral_code || '',
        }).catch(console.error)
      }
    }

    return NextResponse.json({ success: true, ...updateData })

  } catch (error) {
    console.error('Partner PATCH error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data: program, error } = await supabase
      .from('partner_programs')
      .select(`
        *,
        partners!inner(id, name, channels, main_channel_link, created_at)
      `)
      .eq('partner_id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (error || !program) {
      return NextResponse.json(
        { error: '파트너를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({ partner: program })

  } catch (error) {
    console.error('Partner GET error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
