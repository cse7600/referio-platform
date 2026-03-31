import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { sendSettlementConfirmedEmail, sendSettlementInfoRequestEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
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
    const { settlement_ids } = body

    if (!settlement_ids || !Array.isArray(settlement_ids) || settlement_ids.length === 0) {
      return NextResponse.json(
        { error: '정산 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 해당 광고주의 정산인지 확인
    const { data: existingSettlements, error: checkError } = await supabase
      .from('settlements')
      .select('id')
      .eq('advertiser_id', session.advertiserUuid)
      .in('id', settlement_ids)
      .eq('status', 'pending')

    if (checkError) {
      console.error('Settlement check error:', checkError)
      return NextResponse.json(
        { error: '정산 확인에 실패했습니다' },
        { status: 500 }
      )
    }

    const validIds = existingSettlements?.map(s => s.id) || []

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: '처리할 수 있는 정산이 없습니다' },
        { status: 400 }
      )
    }

    // 정산 완료 처리
    const { error: updateError } = await supabase
      .from('settlements')
      .update({
        status: 'completed',
        settled_at: new Date().toISOString(),
      })
      .in('id', validIds)

    if (updateError) {
      console.error('Settlement update error:', updateError)
      return NextResponse.json(
        { error: '정산 완료 처리에 실패했습니다' },
        { status: 500 }
      )
    }

    // Send settlement emails to each partner
    try {
      // Get settlement details with partner info
      const { data: settlements } = await supabase
        .from('settlements')
        .select(`
          id,
          amount,
          partner_id,
          partners!inner(id, name, email),
          partner_profiles(bank_account, has_ssn)
        `)
        .in('id', validIds)

      if (settlements) {
        for (const settlement of settlements) {
          const partner = Array.isArray(settlement.partners) ? settlement.partners[0] : settlement.partners
          const profile = Array.isArray(settlement.partner_profiles) ? settlement.partner_profiles?.[0] : settlement.partner_profiles

          if (!partner?.email) continue

          const hasBankInfo = !!(profile?.bank_account)

          if (hasBankInfo) {
            // Email 10: 정산 확정 안내 (정산 정보 등록 완료)
            await sendSettlementConfirmedEmail({
              partnerEmail: partner.email,
              partnerName: partner.name || '파트너',
              totalAmount: settlement.amount,
            }).catch(() => {})
          } else {
            // Email 11: 정산 정보 입력 요청 (정산 정보 미등록)
            await sendSettlementInfoRequestEmail({
              partnerEmail: partner.email,
              partnerName: partner.name || '파트너',
              pendingAmount: settlement.amount,
            }).catch(() => {})
          }
        }
      }
    } catch (emailErr) {
      console.error('[Email] Settlement email error:', emailErr)
    }

    return NextResponse.json({
      success: true,
      completed_count: validIds.length,
      completed_ids: validIds,
    })

  } catch (error) {
    console.error('Settlement complete error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
