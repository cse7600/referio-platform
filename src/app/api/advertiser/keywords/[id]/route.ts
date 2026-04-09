import { NextRequest, NextResponse } from 'next/server'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/advertiser/keywords/[id]
 * Updates a keyword's editable fields.
 *
 * Body (all optional): { is_featured, memo, memo_public, display_order }
 */
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

    const updateData: Record<string, unknown> = {}
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured
    if (body.memo !== undefined) updateData.memo = body.memo
    if (body.memo_public !== undefined) updateData.memo_public = body.memo_public
    if (body.display_order !== undefined) updateData.display_order = body.display_order

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '변경할 필드가 없습니다' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify ownership via advertiser_id
    const { data, error } = await admin
      .from('program_keywords')
      .update(updateData)
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)
      .select()
      .single()

    if (error || !data) {
      if (!data) {
        return NextResponse.json({ error: '키워드를 찾을 수 없습니다' }, { status: 404 })
      }
      console.error('Keyword PATCH error:', error)
      return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ keyword: data })
  } catch (error) {
    console.error('Keyword PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

/**
 * DELETE /api/advertiser/keywords/[id]
 * Deletes a single keyword.
 */
export async function DELETE(
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
    const admin = createAdminClient()

    const { error, count } = await admin
      .from('program_keywords')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('advertiser_id', session.advertiserUuid)

    if (error) {
      console.error('Keyword DELETE error:', error)
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    }

    if (count === 0) {
      return NextResponse.json({ error: '키워드를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Keyword DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
