import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession } from '@/lib/auth'
import { sendEventNotificationEmail, generateEventNotificationPreview } from '@/lib/email'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { id } = await params
    const supabase = await createClient()

    const { data: promotion } = await supabase
      .from('partner_promotions')
      .select('*')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!promotion) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })

    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('company_name, program_name')
      .eq('id', session.advertiserUuid)
      .single()

    const html = generateEventNotificationPreview({
      eventTitle: promotion.title,
      eventType: promotion.promotion_type,
      rewardDescription: promotion.reward_description,
      startDate: promotion.start_date,
      endDate: promotion.end_date,
      bannerBgColor: promotion.banner_bg_color,
      advertiserName: advertiser?.company_name || '',
      programName: advertiser?.program_name || advertiser?.company_name || '',
    })

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Event notify preview error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdvertiserSession()
    if (!session) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { id } = await params
    const supabase = await createClient()
    const admin = createAdminClient()

    // Verify promotion belongs to this advertiser
    const { data: promotion } = await supabase
      .from('partner_promotions')
      .select('*')
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!promotion) return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })

    // Get advertiser info
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('company_name, program_name')
      .eq('id', session.advertiserUuid)
      .single()

    // Get all approved partners for this advertiser
    const { data: partnerPrograms } = await admin
      .from('partner_programs')
      .select('partner_id')
      .eq('advertiser_id', session.advertiserUuid)
      .eq('status', 'approved')

    if (!partnerPrograms || partnerPrograms.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: '발송할 파트너가 없습니다' })
    }

    const partnerIds = partnerPrograms.map(pp => pp.partner_id)

    const result = await sendEventNotificationEmail({
      eventId: promotion.id,
      eventTitle: promotion.title,
      eventType: promotion.promotion_type,
      rewardDescription: promotion.reward_description,
      startDate: promotion.start_date,
      endDate: promotion.end_date,
      bannerBgColor: promotion.banner_bg_color,
      advertiserName: advertiser?.company_name || '',
      programName: advertiser?.program_name || advertiser?.company_name || '',
      partnerIds,
    })

    return NextResponse.json({
      ...result,
      message: `${result.sent}명에게 발송되었습니다${result.skipped > 0 ? ` (${result.skipped}명 건너뜀)` : ''}`,
    })
  } catch (error) {
    console.error('Event notify POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
