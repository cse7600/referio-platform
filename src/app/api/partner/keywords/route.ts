import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/partner/keywords
 *
 * Query params:
 *   program_id   (required) — UUID of the partner program
 *   cursor       — UUID of last item for cursor pagination
 *   limit        — page size (default 50, max 200)
 *   sort         — 'featured' | 'volume' | 'abc' (default: 'featured')
 *   search       — keyword search string (pg_trgm similarity)
 *   featured_only — '1' to return only is_featured=true rows
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // Fetch partner record
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('program_id')
    const cursor = searchParams.get('cursor')
    const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10)
    const limit = Math.min(Math.max(rawLimit, 1), 200)
    const sort = (searchParams.get('sort') ?? 'featured') as 'featured' | 'volume' | 'abc'
    const search = searchParams.get('search')?.trim() ?? ''
    const featuredOnly = searchParams.get('featured_only') === '1'

    if (!programId) {
      return NextResponse.json({ error: 'program_id가 필요합니다' }, { status: 400 })
    }

    // Verify partner has approved access to this program
    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('partner_programs')
      .select('id')
      .eq('id', programId)
      .eq('partner_id', partner.id)
      .eq('status', 'approved')
      .single()

    if (!membership) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
    }

    // Build query
    let query = admin
      .from('program_keywords')
      .select(
        'id, keyword, is_featured, memo, memo_public, display_order, ' +
        'naver_pc_volume, naver_mobile_volume, naver_competition, naver_avg_depth, ' +
        'naver_cached_at, created_at',
        { count: 'exact' }
      )
      .eq('program_id', programId)

    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }

    if (search) {
      // pg_trgm similarity search via ilike fallback (Supabase JS doesn't expose similarity directly)
      query = query.ilike('keyword', `%${search}%`)
    }

    // Cursor pagination — cursor is the last row's id
    if (cursor) {
      // Fetch cursor row to get its sort key values
      const { data: cursorRow } = await admin
        .from('program_keywords')
        .select('id, is_featured, naver_pc_volume, naver_mobile_volume, keyword, display_order')
        .eq('id', cursor)
        .single()

      if (cursorRow) {
        if (sort === 'featured') {
          // Sort: is_featured DESC, display_order ASC, id ASC
          query = query.or(
            `is_featured.lt.${cursorRow.is_featured},` +
            `and(is_featured.eq.${cursorRow.is_featured},display_order.gt.${cursorRow.display_order}),` +
            `and(is_featured.eq.${cursorRow.is_featured},display_order.eq.${cursorRow.display_order},id.gt.${cursorRow.id})`
          )
        } else if (sort === 'volume') {
          const totalVol = (cursorRow.naver_pc_volume ?? 0) + (cursorRow.naver_mobile_volume ?? 0)
          // Approximate: filter by keyword > cursor keyword as secondary sort
          query = query.gt('keyword', cursorRow.keyword)
        } else {
          // abc: keyword ASC
          query = query.or(`keyword.gt.${cursorRow.keyword},and(keyword.eq.${cursorRow.keyword},id.gt.${cursorRow.id})`)
        }
      }
    }

    // Apply ordering
    if (sort === 'featured') {
      query = query
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('id', { ascending: true })
    } else if (sort === 'volume') {
      // Sort by total volume descending; computed column not available — sort by pc_volume as proxy
      query = query
        .order('naver_pc_volume', { ascending: false, nullsFirst: false })
        .order('naver_mobile_volume', { ascending: false, nullsFirst: false })
        .order('keyword', { ascending: true })
    } else {
      // abc
      query = query
        .order('keyword', { ascending: true })
        .order('id', { ascending: true })
    }

    query = query.limit(limit)

    const { data: keywords, error, count } = await query

    if (error) {
      console.error('Partner keywords GET error:', error)
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    const rows = (keywords ?? []).map(row => ({
      ...row,
      // Hide memo content when memo_public is false
      memo: row.memo_public ? row.memo : null,
    }))

    const nextCursor = rows.length === limit ? rows[rows.length - 1]?.id ?? null : null

    return NextResponse.json({
      keywords: rows,
      nextCursor,
      total: count ?? 0,
    })
  } catch (error) {
    console.error('Partner keywords GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
