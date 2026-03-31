import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { sendPartnerApprovalEmail, sendProgramRejectedEmail } from '@/lib/email'
import { notifyPartnerApproval } from '@/lib/slack'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, is_active_partner, activity_link, main_channel_link, memo } = body

    const supabase = createAdminClient()

    // Verify partner belongs to this advertiser via partner_programs
    const { data: enrollment, error: enrollErr } = await supabase
      .from('partner_programs')
      .select('id')
      .eq('partner_id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (enrollErr || !enrollment) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (is_active_partner !== undefined) updateData.is_active_partner = is_active_partner
    if (activity_link !== undefined) updateData.activity_link = activity_link
    if (main_channel_link !== undefined) updateData.main_channel_link = main_channel_link
    if (memo !== undefined) updateData.memo = memo

    if (Object.keys(updateData).length > 0) {
      const { error: partnerErr } = await supabase
        .from('partners')
        .update(updateData)
        .eq('id', id)

      if (partnerErr) {
        console.error('Partner update error:', partnerErr)
        return NextResponse.json({ error: '파트너 정보 수정에 실패했습니다' }, { status: 500 })
      }
    }

    // Status change is on partner_programs, not partners table
    if (status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: '유효하지 않은 상태입니다' }, { status: 400 })
      }
      const { error: progErr } = await supabase
        .from('partner_programs')
        .update({ status, ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}) })
        .eq('partner_id', id)
        .eq('advertiser_id', session.advertiserUuid)

      if (progErr) {
        console.error('Program status update error:', progErr)
        return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
      }

      // Send approval email when status changes to 'approved'
      if (status === 'approved') {
        try {
          // Fetch partner info
          const { data: partner } = await supabase
            .from('partners')
            .select('email, name')
            .eq('id', id)
            .single()

          // Fetch advertiser info
          const { data: advertiser } = await supabase
            .from('advertisers')
            .select('advertiser_id, company_name, program_name')
            .eq('id', session.advertiserUuid)
            .single()

          // Fetch partner_program info (referral_code, commissions)
          const { data: program } = await supabase
            .from('partner_programs')
            .select('referral_code, lead_commission, contract_commission')
            .eq('partner_id', id)
            .eq('advertiser_id', session.advertiserUuid)
            .single()

          if (partner?.email && advertiser && program) {
            // Build referral URL if advertiser has a homepage
            const { data: advFull } = await supabase
              .from('advertisers')
              .select('homepage_url')
              .eq('id', session.advertiserUuid)
              .single()

            const referralUrl = advFull?.homepage_url
              ? `${advFull.homepage_url}${advFull.homepage_url.includes('?') ? '&' : '?'}ref=${program.referral_code}`
              : undefined

            await sendPartnerApprovalEmail({
              partnerEmail: partner.email,
              partnerName: partner.name || '파트너',
              advertiserCompanyName: advertiser.company_name,
              programName: advertiser.program_name || '',
              referralCode: program.referral_code,
              referralUrl,
              advertiserId: advertiser.advertiser_id,
              leadCommission: program.lead_commission,
              contractCommission: program.contract_commission,
            })
            console.log(`[Email] Partner approval email sent to ${partner.email}`)

            // Slack 알림 (비동기)
            notifyPartnerApproval({
              partnerName: partner.name || '파트너',
              partnerEmail: partner.email,
              companyName: advertiser.company_name,
              referralCode: program.referral_code,
            }).catch(() => {})
          }
        } catch (emailErr) {
          // Email failure should not block the approval response
          console.error('[Email] Failed to send approval email:', emailErr)
        }
      }

      // Send rejection email when status changes to 'rejected'
      if (status === 'rejected') {
        try {
          const { data: partner } = await supabase
            .from('partners')
            .select('email, name')
            .eq('id', id)
            .single()

          const { data: advertiser } = await supabase
            .from('advertisers')
            .select('company_name, program_name')
            .eq('id', session.advertiserUuid)
            .single()

          if (partner?.email && advertiser) {
            await sendProgramRejectedEmail({
              partnerEmail: partner.email,
              partnerName: partner.name || '파트너',
              programName: advertiser.program_name || '',
              advertiserCompanyName: advertiser.company_name,
              rejectionReason: body.rejection_reason,
            })
            console.log(`[Email] Program rejection email sent to ${partner.email}`)
          }
        } catch (emailErr) {
          console.error('[Email] Failed to send rejection email:', emailErr)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Partner PATCH error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
