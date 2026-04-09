import { createHmac } from 'crypto'

const NAVER_API_BASE = 'https://api.searchad.naver.com'

export interface NaverKeywordVolume {
  keyword: string
  pcVolume: number
  mobileVolume: number
  competition: '낮음' | '중간' | '높음' | null
  avgDepth: number | null
}

// Maps Naver compIdx values to Korean labels
function mapCompetition(compIdx: string | undefined): '낮음' | '중간' | '높음' | null {
  if (!compIdx) return null
  const map: Record<string, '낮음' | '중간' | '높음'> = {
    low: '낮음',
    medium: '중간',
    high: '높음',
  }
  return map[compIdx] ?? null
}

// Generates HMAC-SHA256 signature required by Naver Search Ads API
// Signature format: timestamp + '.' + method + '.' + uri
function generateSignature(timestamp: string, method: string, uri: string, secret: string): string {
  const message = `${timestamp}.${method}.${uri}`
  return createHmac('sha256', secret).update(message).digest('base64')
}

/**
 * Fetches keyword volume data from Naver Search Ads API.
 * Accepts up to 5 keywords per call (API limit).
 * Returns volumes for each keyword; missing keywords get zero values.
 */
export async function fetchNaverKeywordVolumes(keywords: string[]): Promise<NaverKeywordVolume[]> {
  const apiKey = process.env.NAVER_API_KEY
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  const accountId = process.env.NAVER_ACCOUNT_ID

  if (!apiKey || !clientSecret || !accountId) {
    throw new Error('Naver API credentials are not configured')
  }

  // API allows max 5 keywords per request
  const batch = keywords.slice(0, 5)
  const timestamp = Date.now().toString()
  const method = 'GET'
  const uri = '/keywordstool'
  const signature = generateSignature(timestamp, method, uri, clientSecret)

  const params = new URLSearchParams()
  for (const kw of batch) {
    params.append('hintKeywords', kw)
  }
  params.append('showDetail', '1')

  const url = `${NAVER_API_BASE}${uri}?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': apiKey,
      'X-Customer': accountId,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Naver API error ${response.status}: ${errorText}`)
  }

  const json = await response.json()
  const keywordList: Array<{
    relKeyword: string
    monthlyPcQcCnt: number | string
    monthlyMobileQcCnt: number | string
    compIdx: string
    plAvgDepth: number | string
  }> = json.keywordList ?? []

  // Build result map from API response (API may return more hints than requested)
  const resultMap = new Map<string, NaverKeywordVolume>()
  for (const item of keywordList) {
    // API returns '<10' for very low volumes — treat as 0
    const pcVol = typeof item.monthlyPcQcCnt === 'number'
      ? item.monthlyPcQcCnt
      : parseInt(String(item.monthlyPcQcCnt), 10) || 0
    const mobileVol = typeof item.monthlyMobileQcCnt === 'number'
      ? item.monthlyMobileQcCnt
      : parseInt(String(item.monthlyMobileQcCnt), 10) || 0
    const avgDepth = typeof item.plAvgDepth === 'number'
      ? item.plAvgDepth
      : parseFloat(String(item.plAvgDepth)) || null

    resultMap.set(item.relKeyword, {
      keyword: item.relKeyword,
      pcVolume: pcVol,
      mobileVolume: mobileVol,
      competition: mapCompetition(item.compIdx),
      avgDepth,
    })
  }

  // Return results in the same order as requested keywords
  return batch.map(kw => {
    return resultMap.get(kw) ?? {
      keyword: kw,
      pcVolume: 0,
      mobileVolume: 0,
      competition: null,
      avgDepth: null,
    }
  })
}

/**
 * Processes a large array of keywords in batches of 5 with 100ms delay between calls.
 * Deduplicates keywords before fetching to minimize API calls.
 */
export async function fetchNaverKeywordVolumesBatch(
  keywords: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, NaverKeywordVolume>> {
  const unique = [...new Set(keywords)]
  const results = new Map<string, NaverKeywordVolume>()
  const batchSize = 5

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize)
    const volumes = await fetchNaverKeywordVolumes(batch)
    for (const vol of volumes) {
      results.set(vol.keyword, vol)
    }

    onProgress?.(Math.min(i + batchSize, unique.length), unique.length)

    // 100ms delay to stay within rate limit (20-30 req/sec per advertiser)
    if (i + batchSize < unique.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}
