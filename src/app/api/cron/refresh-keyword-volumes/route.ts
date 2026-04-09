// Cron: Refresh Naver keyword search volumes for program_keywords
// Priority: is_featured first → null cache → expired cache (>30 days)
// Schedule: Recommend running nightly (e.g., "0 20 * * *" UTC = 05:00 KST)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchNaverKeywordVolumes } from '@/lib/naver-searchad'

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 100
const MAX_KEYWORDS_PER_RUN = 5000 // Safety cap per cron run

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const stats = { processed: 0, updated: 0, errors: 0 }

  try {
    // Fetch keywords to refresh in priority order:
    //   1. is_featured + never cached (naver_cached_at IS NULL)
    //   2. is_featured + cache expired
    //   3. non-featured + never cached
    //   4. non-featured + cache expired
    // Use DISTINCT on keyword to avoid redundant API calls for the same keyword text
    const { data: candidates, error: fetchError } = await admin
      .from('program_keywords')
      .select('id, keyword, is_featured, naver_cached_at')
      .or(`naver_cached_at.is.null,naver_cached_at.lt.${thirtyDaysAgo}`)
      .order('is_featured', { ascending: false })
      .order('naver_cached_at', { ascending: true, nullsFirst: true })
      .limit(MAX_KEYWORDS_PER_RUN)

    if (fetchError) {
      console.error('refresh-keyword-volumes: fetch error', fetchError)
      return NextResponse.json({ error: '키워드 조회 실패', details: fetchError.message }, { status: 500 })
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ message: '갱신할 키워드 없음', ...stats })
    }

    // Deduplicate keyword text — each unique keyword text calls Naver API once
    // Then update ALL rows with matching keyword text
    const uniqueKeywords = [...new Set(candidates.map(c => c.keyword))]

    for (let i = 0; i < uniqueKeywords.length; i += BATCH_SIZE) {
      const batch = uniqueKeywords.slice(i, i + BATCH_SIZE)
      stats.processed += batch.length

      try {
        const volumes = await fetchNaverKeywordVolumes(batch)

        // Update all rows that share this keyword text (across all programs/advertisers)
        for (const vol of volumes) {
          const { error: updateError } = await admin
            .from('program_keywords')
            .update({
              naver_pc_volume: vol.pcVolume,
              naver_mobile_volume: vol.mobileVolume,
              naver_competition: vol.competition,
              naver_avg_depth: vol.avgDepth,
              naver_cached_at: new Date().toISOString(),
            })
            .eq('keyword', vol.keyword)
            .or(`naver_cached_at.is.null,naver_cached_at.lt.${thirtyDaysAgo}`)

          if (updateError) {
            console.error(`refresh-keyword-volumes: update error for "${vol.keyword}"`, updateError)
            stats.errors++
          } else {
            stats.updated++
          }
        }
      } catch (apiError) {
        console.error(`refresh-keyword-volumes: Naver API error for batch [${batch.join(', ')}]`, apiError)
        stats.errors += batch.length
      }

      // Rate limit: 100ms between batches
      if (i + BATCH_SIZE < uniqueKeywords.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    console.log('refresh-keyword-volumes complete:', stats)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    console.error('refresh-keyword-volumes: unexpected error', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
