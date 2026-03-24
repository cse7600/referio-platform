import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: 프로그램 상세 정보
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 })
    }

    // 광고주(프로그램) 상세 정보 — admin client으로 RLS 우회
    const admin = createAdminClient()
    const { data: advertiser } = await admin
      .from('advertisers')
      .select(`
        id, company_name, program_name, program_description,
        logo_url, primary_color, category, homepage_url, landing_url,
        default_lead_commission, default_contract_commission,
        activity_guide, content_sources, prohibited_activities, precautions
      `)
      .eq('id', id)
      .eq('is_public', true)
      .eq('status', 'active')
      .maybeSingle()

    if (!advertiser) {
      return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
    }

    // 참가 상태 확인
    const { data: enrollment } = await supabase
      .from('partner_programs')
      .select('id, status, referral_code, lead_commission, contract_commission, applied_at, approved_at')
      .eq('partner_id', partner.id)
      .eq('advertiser_id', id)
      .maybeSingle()

    // 미디어 목록
    const { data: media } = await supabase
      .from('program_media')
      .select('id, type, url, name, description')
      .eq('advertiser_id', id)
      .order('sort_order')

    // 광고주 공지사항 (최근 10개)
    const { data: announcements } = await supabase
      .from('partner_messages')
      .select('id, title, body, sent_at')
      .eq('advertiser_id', id)
      .eq('target_type', 'all')
      .order('sent_at', { ascending: false })
      .limit(10)

    // 읽음 여부 확인
    let readMessageIds: Set<string> = new Set()
    if (announcements && announcements.length > 0) {
      const { data: reads } = await supabase
        .from('partner_message_reads')
        .select('message_id')
        .eq('partner_id', partner.id)
        .in('message_id', announcements.map(a => a.id))

      readMessageIds = new Set((reads || []).map(r => r.message_id))
    }

    const announcementsWithRead = (announcements || []).map(a => ({
      ...a,
      is_read: readMessageIds.has(a.id),
    }))

    // 게시판 게시물 (최근 20개)
    const { data: boardPosts } = await admin
      .from('activity_posts')
      .select('id, title, content, post_type, created_at')
      .eq('advertiser_id', id)
      .eq('post_type', 'board')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      program: {
        ...advertiser,
        enrollment: enrollment || null,
        media: media || [],
        announcements: announcementsWithRead,
        boardPosts: boardPosts || [],
      },
    })
  } catch (error) {
    console.error('Partner program detail error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
