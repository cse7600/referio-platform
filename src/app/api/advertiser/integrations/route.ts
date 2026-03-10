import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

function generateApiKey(): string {
  // crypto.randomUUID()는 Node.js와 Edge 런타임 모두 지원
  return 'ref_live_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

// GET: 현재 광고주의 연동 목록 조회
export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()

    // session.advertiserUuid = advertisers.id (UUID) - 직접 사용
    const { data: integrations, error } = await supabase
      .from('webhook_integrations')
      .select('id, name, source, api_key, is_active, config, created_at')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET integrations DB error:', error.message)
      return NextResponse.json({ error: '연동 목록 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ integrations: integrations || [] })
  } catch (error) {
    console.error('GET integrations error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 새 연동 생성 (API 키 자동 발급)
export async function POST(request: Request) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const source: string = body.source || 'airtable'

    const supabase = await createClient()

    // session.advertiserUuid = advertisers.id (UUID) - 직접 사용, 추가 조회 불필요
    const advertiserId = session.advertiserUuid

    // 동일 source 중복 방지
    const { data: existing } = await supabase
      .from('webhook_integrations')
      .select('id')
      .eq('advertiser_id', advertiserId)
      .eq('source', source)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 연동이 존재합니다' }, { status: 409 })
    }

    const apiKey = generateApiKey()
    const integrationName = `${session.companyName} - ${source === 'airtable' ? 'Airtable' : source} 연동`

    const defaultConfig = {
      airtable: {
        name_field: '이름',
        phone_field: '전화번호',
        ref_code_field: '추천코드',
        status_field: '영업상태',
        valid_values: ['유효'],
        contract_values: ['계약'],
        invalid_values: ['무효'],
        contract_date_field: '계약일',
      },
    }

    const { data: integration, error } = await supabase
      .from('webhook_integrations')
      .insert({
        advertiser_id: advertiserId,
        name: integrationName,
        source,
        api_key: apiKey,
        is_active: true,
        config: defaultConfig,
      })
      .select('id, name, source, api_key, is_active, config, created_at')
      .single()

    if (error) {
      console.error('Create integration DB error:', error.message, error.code)
      return NextResponse.json({ error: '연동 생성에 실패했습니다: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error('POST integrations error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
