import { NextRequest, NextResponse } from 'next/server'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/advertiser/keywords
 * Creates a single keyword entry.
 *
 * Body: { program_id, keyword, is_featured?, memo?, memo_public?, display_order? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const { program_id, keyword, is_featured, memo, memo_public, display_order } = body

    if (!program_id || !keyword?.trim()) {
      return NextResponse.json({ error: 'program_id와 keyword는 필수입니다' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify program belongs to this advertiser
    const { data: program } = await admin
      .from('partner_programs')
      .select('id')
      .eq('id', program_id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!program) {
      return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('program_keywords')
      .insert({
        advertiser_id: session.advertiserUuid,
        program_id,
        keyword: keyword.trim(),
        is_featured: is_featured ?? false,
        memo: memo ?? null,
        memo_public: memo_public ?? false,
        display_order: display_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 키워드입니다' }, { status: 409 })
      }
      console.error('Keyword POST error:', error)
      return NextResponse.json({ error: '생성에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ keyword: data }, { status: 201 })
  } catch (error) {
    console.error('Keyword POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

/**
 * GET /api/advertiser/keywords
 * Lists keywords for a program (advertiser side — all fields visible).
 *
 * Query params:
 *   program_id (required)
 *   cursor, limit, sort, search, featured_only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
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

    const admin = createAdminClient()

    // Verify program ownership
    const { data: program } = await admin
      .from('partner_programs')
      .select('id')
      .eq('id', programId)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!program) {
      return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
    }

    let query = admin
      .from('program_keywords')
      .select('*', { count: 'exact' })
      .eq('program_id', programId)

    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }

    if (search) {
      query = query.ilike('keyword', `%${search}%`)
    }

    if (cursor) {
      const { data: cursorRow } = await admin
        .from('program_keywords')
        .select('id, is_featured, display_order, keyword')
        .eq('id', cursor)
        .single()

      if (cursorRow) {
        if (sort === 'featured') {
          query = query.or(
            `is_featured.lt.${cursorRow.is_featured},` +
            `and(is_featured.eq.${cursorRow.is_featured},display_order.gt.${cursorRow.display_order}),` +
            `and(is_featured.eq.${cursorRow.is_featured},display_order.eq.${cursorRow.display_order},id.gt.${cursorRow.id})`
          )
        } else if (sort === 'volume') {
          query = query.gt('keyword', cursorRow.keyword)
        } else {
          query = query.gt('keyword', cursorRow.keyword)
        }
      }
    }

    if (sort === 'featured') {
      query = query
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('id', { ascending: true })
    } else if (sort === 'volume') {
      query = query
        .order('naver_pc_volume', { ascending: false, nullsFirst: false })
        .order('naver_mobile_volume', { ascending: false, nullsFirst: false })
        .order('keyword', { ascending: true })
    } else {
      query = query
        .order('keyword', { ascending: true })
        .order('id', { ascending: true })
    }

    query = query.limit(limit)

    const { data: keywords, error, count } = await query

    if (error) {
      console.error('Advertiser keywords GET error:', error)
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    const nextCursor = (keywords ?? []).length === limit
      ? (keywords ?? [])[keywords!.length - 1]?.id ?? null
      : null

    return NextResponse.json({
      keywords: keywords ?? [],
      nextCursor,
      total: count ?? 0,
    })
  } catch (error) {
    console.error('Advertiser keywords GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
