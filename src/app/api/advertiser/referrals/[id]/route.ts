import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { sendFirstRevenueEmail } from '@/lib/email'

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

    if (!canManage(session)) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { contract_status, is_valid, sales_rep, memo, labels, priority, next_action, next_action_at } = body

    const supabase = createAdminClient()

    // 해당 광고주의 피추천인인지 확인 (이전 상태도 가져옴)
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('id, advertiser_id, partner_id, contract_status, is_valid, contracted_at')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (referralError || !referral) {
      return NextResponse.json(
        { error: '고객을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (contract_status !== undefined) {
      const validStatuses = ['pending', 'call_1', 'call_2', 'call_3', 'completed', 'invalid', 'duplicate']
      if (!validStatuses.includes(contract_status)) {
        return NextResponse.json(
          { error: '유효하지 않은 계약 상태입니다' },
          { status: 400 }
        )
      }
      updateData.contract_status = contract_status

      if (contract_status === 'completed') {
        updateData.contracted_at = new Date().toISOString()
      }
    }

    if (is_valid !== undefined) {
      if (is_valid !== null && typeof is_valid !== 'boolean') {
        return NextResponse.json(
          { error: '유효 여부는 boolean 또는 null이어야 합니다' },
          { status: 400 }
        )
      }
      updateData.is_valid = is_valid
    }

    if (sales_rep !== undefined) updateData.sales_rep = sales_rep
    if (memo !== undefined) updateData.memo = memo
    if (labels !== undefined) updateData.labels = labels
    if (priority !== undefined) updateData.priority = priority
    if (next_action !== undefined) updateData.next_action = next_action
    if (next_action_at !== undefined) updateData.next_action_at = next_action_at

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 내용이 없습니다' },
        { status: 400 }
      )
    }

    // 업데이트 실행
    const { error: updateError } = await supabase
      .from('referrals')
      .update(updateData)
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)

    if (updateError) {
      console.error('Referral update error:', updateError)
      return NextResponse.json(
        { error: '고객 정보 수정에 실패했습니다' },
        { status: 500 }
      )
    }

    // 정산 자동 생성: 상태가 변경되어 정산 조건을 충족할 때
    const newStatus = updateData.contract_status as string | undefined ?? referral.contract_status

    // is_valid=true로 변경되었거나, contract_status=completed로 변경된 경우 정산 생성 시도
    const shouldCreateSettlement =
      (is_valid === true && referral.is_valid !== true) ||
      (contract_status === 'completed' && referral.contract_status !== 'completed')

    if (shouldCreateSettlement && referral.partner_id) {
      // 파트너의 커미션 조회 (partner_programs 우선, fallback: campaigns)
      const { data: enrollment } = await supabase
        .from('partner_programs')
        .select('lead_commission, contract_commission')
        .eq('partner_id', referral.partner_id)
        .eq('advertiser_id', session.advertiserUuid)
        .eq('status', 'approved')
        .single()

      // fallback: partner_programs 값이 없거나 0/null이면 campaigns에서 가져오기
      let leadCommission = enrollment?.lead_commission || 0
      let contractCommission = enrollment?.contract_commission || 0

      if (!leadCommission || !contractCommission) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('valid_amount, contract_amount')
          .eq('advertiser_id', session.advertiserUuid)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (campaign) {
          if (!leadCommission) leadCommission = campaign.valid_amount || 0
          if (!contractCommission) contractCommission = campaign.contract_amount || 0
        }
      }

      // contract_status=completed 처리: is_valid가 true가 아니면 자동으로 true로 설정
      if (contract_status === 'completed' && referral.contract_status !== 'completed') {
        if (referral.is_valid !== true && updateData.is_valid !== true) {
          updateData.is_valid = true
          // DB에도 반영 (앞서 실행한 update와 별도로 is_valid 보정)
          await supabase
            .from('referrals')
            .update({ is_valid: true })
            .eq('id', id)
            .eq('advertiser_id', session.advertiserUuid)
        }
      }

      // is_valid=true일 때: 유효 정산 생성
      const effectiveIsValid = updateData.is_valid === true || referral.is_valid === true
      if (is_valid === true && referral.is_valid !== true) {
        const { error: settError } = await supabase
          .from('settlements')
          .insert({
            partner_id: referral.partner_id,
            advertiser_id: session.advertiserUuid,
            referral_id: id,
            type: 'valid',
            amount: leadCommission,
            status: 'pending',
          })
        // ON CONFLICT 대신 에러 무시 (이미 존재하면 skip)
        if (settError && !settError.message.includes('duplicate') && !settError.message.includes('unique')) {
          console.error('Valid settlement create error:', settError)
        }
      }

      // contract_status=completed일 때: 계약 정산 생성 (is_valid 조건 제거)
      if (newStatus === 'completed' && contract_status === 'completed') {
        // completed 전환 시 is_valid도 true로 처리되므로, valid settlement가 아직 없으면 함께 생성
        if (!effectiveIsValid) {
          const { error: validSettError } = await supabase
            .from('settlements')
            .insert({
              partner_id: referral.partner_id,
              advertiser_id: session.advertiserUuid,
              referral_id: id,
              type: 'valid',
              amount: leadCommission,
              status: 'pending',
            })
          if (validSettError && !validSettError.message.includes('duplicate') && !validSettError.message.includes('unique')) {
            console.error('Auto valid settlement create error:', validSettError)
          }
        }

        const { error: settError } = await supabase
          .from('settlements')
          .insert({
            partner_id: referral.partner_id,
            advertiser_id: session.advertiserUuid,
            referral_id: id,
            type: 'contract',
            amount: contractCommission,
            status: 'pending',
          })
        if (settError && !settError.message.includes('duplicate') && !settError.message.includes('unique')) {
          console.error('Contract settlement create error:', settError)
        }

          // Email 8: 첫 수익 확정 축하 (파트너의 첫 번째 settlement일 때만)
          if (referral.partner_id) {
            try {
              const { count: settlCount } = await supabase
                .from('settlements')
                .select('id', { count: 'exact', head: true })
                .eq('partner_id', referral.partner_id)

              if (settlCount === 1) {
                const { data: partner } = await supabase
                  .from('partners')
                  .select('email, name')
                  .eq('id', referral.partner_id)
                  .single()

                const { data: prog } = await supabase
                  .from('partner_programs')
                  .select('lead_commission, contract_commission, advertisers!inner(company_name, program_name)')
                  .eq('partner_id', referral.partner_id)
                  .eq('advertiser_id', referral.advertiser_id)
                  .single()

                if (partner?.email && prog) {
                  const adv = Array.isArray(prog.advertisers) ? prog.advertisers[0] : prog.advertisers as { company_name: string; program_name: string | null }
                  const commissionAmount = (prog.contract_commission || 0) > 0
                    ? prog.contract_commission!
                    : (prog.lead_commission || 0)

                  sendFirstRevenueEmail({
                    partnerEmail: partner.email,
                    partnerName: partner.name || '파트너',
                    programName: adv?.program_name || '',
                    advertiserCompanyName: adv?.company_name || '',
                    commissionAmount,
                  }).catch(() => {})
                }
              }
            } catch (e) {
              console.error('[Email8] First revenue email error:', e)
            }
          }
      }
    }

    return NextResponse.json({ success: true, updated: updateData })

  } catch (error) {
    console.error('Referral PATCH error:', error)
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

    const { data: referral, error } = await supabase
      .from('referrals')
      .select(`
        *,
        partners (
          id,
          name,
          referral_code
        )
      `)
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (error || !referral) {
      return NextResponse.json(
        { error: '고객을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({ referral })

  } catch (error) {
    console.error('Referral GET error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
