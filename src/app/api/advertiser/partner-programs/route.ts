import { NextResponse } from 'next/server'
import { getAdvertiserSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/advertiser/partner-programs
 * Returns program list for the keyword management page.
 *
 * Strategy: fetch from `programs` table (one row per advertiser program),
 * then join the first matching `partner_programs.id` to use as keyword program_id.
 * Falls back to partner_programs directly if programs table has no rows.
 */
export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const admin = createAdminClient()

    // 1. Try programs table first (exists since migration 022)
    const { data: programRows, error: progError } = await admin
      .from('programs')
      .select('id, name, advertiser_id')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: true })

    if (progError) {
      console.error('Programs GET error:', progError)
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    if (programRows && programRows.length > 0) {
      // For each program, find one partner_programs.id to use as keyword program_id
      const programIds = programRows.map(p => p.id)
      const { data: ppRows } = await admin
        .from('partner_programs')
        .select('id, program_id')
        .in('program_id', programIds)
        .order('created_at', { ascending: true })

      // Map program.id → first partner_programs.id
      const ppMap = new Map<string, string>()
      for (const row of (ppRows ?? [])) {
        if (row.program_id && !ppMap.has(row.program_id)) {
          ppMap.set(row.program_id, row.id)
        }
      }

      const programs = programRows.map(p => ({
        id: ppMap.get(p.id) ?? null, // partner_programs.id used as keyword program_id
        program_id: p.id,            // programs.id for reference
        name: p.name,
      })).filter(p => p.id !== null) // only include if partner_programs row exists

      if (programs.length > 0) {
        return NextResponse.json({ programs })
      }
    }

    // 2. Fallback: direct partner_programs query (legacy / no programs table rows)
    const { data: ppFallback, error: ppError } = await admin
      .from('partner_programs')
      .select('id, referral_code, advertisers:advertiser_id(company_name, program_name)')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: true })
      .limit(1) // just one representative row

    if (ppError) {
      console.error('Partner programs fallback GET error:', ppError)
      return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
    }

    type FallbackRow = {
      id: string
      referral_code: string | null
      advertisers: { company_name: string; program_name: string | null } | null
    }
    const rows = (ppFallback ?? []) as unknown as FallbackRow[]
    const programs = rows.map(row => ({
      id: row.id,
      program_id: null,
      name: row.advertisers?.program_name || row.advertisers?.company_name || '기본 프로그램',
    }))

    return NextResponse.json({ programs })
  } catch (error) {
    console.error('Partner programs GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
