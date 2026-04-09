import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { getAdvertiserSession, canManage } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const BATCH_SIZE = 1000

interface KeywordRow {
  advertiser_id: string
  program_id: string
  keyword: string
  is_featured: boolean
  memo: string | null
  memo_public: boolean
  display_order: number
}

/**
 * POST /api/advertiser/keywords/bulk
 * Uploads keywords in bulk via CSV file or JSON array.
 *
 * Content-Type: multipart/form-data
 *   file     — CSV file with header row: keyword[,is_featured,memo,memo_public,display_order]
 *   program_id — target program UUID
 *   mode     — 'append' (default) | 'replace'
 *
 * Content-Type: application/json
 *   { program_id, keywords: string[] | KeywordInput[], mode: 'append' | 'replace' }
 *
 * Returns: { inserted, skipped, total, errors }
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

    const contentType = request.headers.get('content-type') ?? ''
    let programId: string
    let mode: 'append' | 'replace'
    let rawKeywords: Array<{
      keyword: string
      is_featured?: boolean
      memo?: string | null
      memo_public?: boolean
      display_order?: number
    }> = []
    const parseErrors: string[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      programId = (formData.get('program_id') as string | null) ?? ''
      mode = ((formData.get('mode') as string | null) ?? 'append') as 'append' | 'replace'
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'CSV 파일이 필요합니다' }, { status: 400 })
      }

      const csvText = await file.text()
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
      })

      if (parsed.errors.length > 0) {
        parseErrors.push(...parsed.errors.map(e => `Row ${e.row}: ${e.message}`))
      }

      for (const row of parsed.data) {
        const kw = row.keyword?.trim()
        if (!kw) continue
        rawKeywords.push({
          keyword: kw,
          is_featured: row.is_featured === 'true' || row.is_featured === '1',
          memo: row.memo?.trim() || null,
          memo_public: row.memo_public === 'true' || row.memo_public === '1',
          display_order: parseInt(row.display_order ?? '0', 10) || 0,
        })
      }
    } else {
      // JSON body
      const body = await request.json()
      programId = body.program_id ?? ''
      mode = (body.mode ?? 'append') as 'append' | 'replace'

      if (!Array.isArray(body.keywords)) {
        return NextResponse.json({ error: 'keywords 배열이 필요합니다' }, { status: 400 })
      }

      for (const item of body.keywords) {
        if (typeof item === 'string') {
          if (item.trim()) rawKeywords.push({ keyword: item.trim() })
        } else if (item?.keyword?.trim()) {
          rawKeywords.push({
            keyword: item.keyword.trim(),
            is_featured: item.is_featured ?? false,
            memo: item.memo ?? null,
            memo_public: item.memo_public ?? false,
            display_order: item.display_order ?? 0,
          })
        }
      }
    }

    if (!programId) {
      return NextResponse.json({ error: 'program_id가 필요합니다' }, { status: 400 })
    }

    if (rawKeywords.length === 0) {
      return NextResponse.json({ error: '키워드가 없습니다' }, { status: 400 })
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

    // Deduplicate by keyword within the upload
    const seen = new Set<string>()
    const rows: KeywordRow[] = []
    for (const item of rawKeywords) {
      const kw = item.keyword.trim()
      if (!kw || seen.has(kw)) continue
      seen.add(kw)
      rows.push({
        advertiser_id: session.advertiserUuid,
        program_id: programId,
        keyword: kw,
        is_featured: item.is_featured ?? false,
        memo: item.memo ?? null,
        memo_public: item.memo_public ?? false,
        display_order: item.display_order ?? 0,
      })
    }

    let inserted = 0
    let skipped = 0

    if (mode === 'replace') {
      // Delete all existing keywords for this program, then insert
      const { error: delError } = await admin
        .from('program_keywords')
        .delete()
        .eq('program_id', programId)
        .eq('advertiser_id', session.advertiserUuid)

      if (delError) {
        console.error('Bulk replace DELETE error:', delError)
        return NextResponse.json({ error: '기존 키워드 삭제에 실패했습니다' }, { status: 500 })
      }

      // Insert in batches
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { error: insertError, data } = await admin
          .from('program_keywords')
          .insert(batch)
          .select('id')

        if (insertError) {
          console.error('Bulk replace INSERT error:', insertError)
          parseErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`)
        } else {
          inserted += (data ?? []).length
        }
      }
    } else {
      // Append: upsert with ON CONFLICT DO NOTHING equivalent — use ignoreDuplicates
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { error: upsertError, data } = await admin
          .from('program_keywords')
          .upsert(batch, {
            onConflict: 'program_id,keyword',
            ignoreDuplicates: true,
          })
          .select('id')

        if (upsertError) {
          console.error('Bulk append UPSERT error:', upsertError)
          parseErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`)
        } else {
          inserted += (data ?? []).length
        }
      }
      skipped = rows.length - inserted
    }

    return NextResponse.json({
      inserted,
      skipped,
      total: rows.length,
      errors: parseErrors,
    })
  } catch (error) {
    console.error('Keyword bulk POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

/**
 * DELETE /api/advertiser/keywords/bulk
 * Bulk-deletes keywords by ID list or clears all for a program.
 *
 * Body: { program_id, keyword_ids?: string[] }
 * If keyword_ids is omitted, deletes all keywords for the program.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (!canManage(session)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const { program_id, keyword_ids } = body

    if (!program_id) {
      return NextResponse.json({ error: 'program_id가 필요합니다' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify program ownership
    const { data: program } = await admin
      .from('partner_programs')
      .select('id')
      .eq('id', program_id)
      .eq('advertiser_id', session.advertiserUuid)
      .single()

    if (!program) {
      return NextResponse.json({ error: '프로그램을 찾을 수 없습니다' }, { status: 404 })
    }

    let query = admin
      .from('program_keywords')
      .delete({ count: 'exact' })
      .eq('program_id', program_id)
      .eq('advertiser_id', session.advertiserUuid)

    if (Array.isArray(keyword_ids) && keyword_ids.length > 0) {
      query = query.in('id', keyword_ids)
    }

    const { error, count } = await query

    if (error) {
      console.error('Keyword bulk DELETE error:', error)
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ deleted: count ?? 0 })
  } catch (error) {
    console.error('Keyword bulk DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
