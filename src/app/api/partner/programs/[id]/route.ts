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

    const admin = createAdminClient()

    // Check if this is an affiliate campaign first
    const { data: campaign } = await admin
      .from('referio_campaigns')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (campaign) {
      // Affiliate campaign detail
      const { data: existingLink } = await admin
        .from('referio_affiliate_links')
        .select('short_code, click_count, conversion_count')
        .eq('campaign_id', campaign.id)
        .eq('promoter_partner_id', partner.id)
        .maybeSingle()

      return NextResponse.json({
        program: {
          id: campaign.id,
          company_name: 'Referio',
          program_name: campaign.name,
          program_description: campaign.description,
          logo_url: null,
          primary_color: '#6366f1',
          category: null,
          homepage_url: null,
          landing_url: campaign.landing_path,
          default_lead_commission: campaign.reward_amount,
          default_contract_commission: 0,
          activity_guide: null,
          content_sources: null,
          prohibited_activities: null,
          precautions: null,
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
                approved_at: null,
              }
            : null,
          media: [],
          announcements: [],
          boardPosts: [],
        },
      })
    }

    // programs 테이블 기반 조회 (신규) — 없으면 advertisers fallback (기존 호환)
    const { data: prog } = await admin
      .from('programs')
      .select(`
        id,
        name,
        description,
        category,
        homepage_url,
        landing_url,
        default_lead_commission,
        default_contract_commission,
        activity_guide,
        content_sources,
        prohibited_activities,
        precautions,
        advertiser_id,
        advertisers!inner(
          id,
          company_name,
          logo_url,
          primary_color,
          status
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .eq('is_public', true)
      .maybeSingle()

    // programs 테이블에서 찾은 경우
    if (prog) {
      const adv = prog.advertisers as any;

      if (adv?.status !== 'active') {
        return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
      }

      // 참가 상태 확인 (program_id 기준 먼저, fallback advertiser_id)
      const { data: enrollmentByProgram } = await supabase
        .from('partner_programs')
        .select('id, status, referral_code, lead_commission, contract_commission, applied_at, approved_at, tracking_link_url')
        .eq('partner_id', partner.id)
        .eq('program_id', prog.id)
        .maybeSingle()

      const { data: enrollmentByAdv } = !enrollmentByProgram ? await supabase
        .from('partner_programs')
        .select('id, status, referral_code, lead_commission, contract_commission, applied_at, approved_at, tracking_link_url')
        .eq('partner_id', partner.id)
        .eq('advertiser_id', prog.advertiser_id)
        .is('program_id', null)
        .maybeSingle() : { data: null }

      const enrollment = enrollmentByProgram || enrollmentByAdv || null;

      // 미디어 목록
      const { data: media } = await supabase
        .from('program_media')
        .select('id, type, url, name, description')
        .eq('advertiser_id', prog.advertiser_id)
        .order('sort_order')

      // 광고주 공지사항 (최근 10개)
      const { data: announcements } = await supabase
        .from('partner_messages')
        .select('id, title, body, sent_at')
        .eq('advertiser_id', prog.advertiser_id)
        .eq('target_type', 'all')
        .order('sent_at', { ascending: false })
        .limit(10)

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
        .eq('advertiser_id', prog.advertiser_id)
        .eq('post_type', 'board')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20)

      const enrollmentData = enrollment as (typeof enrollment & { tracking_link_url?: string | null }) | null;
      const { tracking_link_url: trackingLinkUrl, ...enrollmentWithoutTracking } = enrollmentData || {};

      return NextResponse.json({
        program: {
          id: prog.id,
          company_name: adv?.company_name ?? '',
          program_name: prog.name,
          program_description: prog.description,
          logo_url: adv?.logo_url ?? null,
          primary_color: adv?.primary_color ?? null,
          category: prog.category,
          homepage_url: prog.homepage_url,
          landing_url: prog.landing_url,
          default_lead_commission: prog.default_lead_commission,
          default_contract_commission: prog.default_contract_commission,
          activity_guide: prog.activity_guide,
          content_sources: prog.content_sources,
          prohibited_activities: prog.prohibited_activities,
          precautions: prog.precautions,
          advertiser_id: prog.advertiser_id,
          tracking_link_url: trackingLinkUrl ?? null,
          enrollment: enrollment ? enrollmentWithoutTracking : null,
          media: media || [],
          announcements: announcementsWithRead,
          boardPosts: boardPosts || [],
        },
      })
    }

    // ── Fallback: advertisers 테이블 기준 (migration 전 기존 레코드 호환) ──
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
