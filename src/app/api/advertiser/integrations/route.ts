import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'
import { randomBytes } from 'crypto'

function generateApiKey(): string {
  return 'ref_live_' + randomBytes(20).toString('hex')
}

// GET: 현재 광고주의 연동 목록 조회
export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: adv } = await supabase
      .from('advertisers')
      .select('id')
      .eq('advertiser_id', session.advertiserId)
      .single()

    if (!adv) {
      return NextResponse.json({ error: '광고주를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: integrations } = await supabase
      .from('webhook_integrations')
      .select('id, name, source, api_key, is_active, config, created_at')
      .eq('advertiser_id', adv.id)
      .order('created_at', { ascending: false })

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

    const { source = 'airtable', name } = await request.json()

    const supabase = await createClient()

    const { data: adv } = await supabase
      .from('advertisers')
      .select('id, company_name')
      .eq('advertiser_id', session.advertiserId)
      .single()

    if (!adv) {
      return NextResponse.json({ error: '광고주를 찾을 수 없습니다' }, { status: 404 })
    }

    // 동일 source 중복 방지
    const { data: existing } = await supabase
      .from('webhook_integrations')
      .select('id')
      .eq('advertiser_id', adv.id)
      .eq('source', source)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 연동이 존재합니다' }, { status: 409 })
    }

    const apiKey = generateApiKey()
    const integrationName = name || `${adv.company_name} - ${source === 'airtable' ? 'Airtable' : source} 연동`

    const defaultConfig = source === 'airtable' ? {
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
    } : {}

    const { data: integration, error } = await supabase
      .from('webhook_integrations')
      .insert({
        advertiser_id: adv.id,
        name: integrationName,
        source,
        api_key: apiKey,
        is_active: true,
        config: defaultConfig,
      })
      .select('id, name, source, api_key, is_active, config, created_at')
      .single()

    if (error) {
      console.error('Create integration error:', error)
      return NextResponse.json({ error: '연동 생성에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error('POST integrations error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
