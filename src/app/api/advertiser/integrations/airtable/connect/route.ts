import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

interface FieldConfig {
  name_field: string
  phone_field: string
  ref_code_field: string
  status_field: string
  valid_values: string[]
  contract_values: string[]
  invalid_values: string[]
}

// POST /api/advertiser/integrations/airtable/connect
// Validates PAT, saves config, enables auto-sync via cron
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { pat, base_id, table_id, field_config } = await request.json() as {
      pat: string
      base_id: string
      table_id: string
      field_config: FieldConfig
    }

    if (!pat || !base_id || !table_id) {
      return NextResponse.json({ error: '필수 정보가 누락됐습니다' }, { status: 400 })
    }

    // Validate PAT by calling Airtable API
    const testRes = await fetch(`https://api.airtable.com/v0/meta/bases/${base_id}/tables`, {
      headers: { Authorization: `Bearer ${pat}` },
    })
    if (!testRes.ok) {
      return NextResponse.json({ error: 'Airtable 토큰 또는 Base ID가 유효하지 않습니다' }, { status: 400 })
    }

    const advertiserId = session.advertiserUuid

    const config = {
      airtable: {
        pat,
        base_id,
        table_id,
        last_synced_at: null as string | null,
        name_field: field_config?.name_field || '이름',
        phone_field: field_config?.phone_field || '전화번호',
        ref_code_field: field_config?.ref_code_field || '추천코드',
        status_field: field_config?.status_field || '영업상태',
        valid_values: field_config?.valid_values || ['유효'],
        contract_values: field_config?.contract_values || ['계약완료'],
        invalid_values: field_config?.invalid_values || ['무효'],
      },
    }

    const supabase = await createClient()

    // Upsert webhook integration
    const { data: existing } = await supabase
      .from('webhook_integrations')
      .select('id, api_key')
      .eq('advertiser_id', advertiserId)
      .eq('source', 'airtable')
      .maybeSingle()

    if (existing) {
      await supabase
        .from('webhook_integrations')
        .update({ config, is_active: true })
        .eq('id', existing.id)
    } else {
      const apiKey = `ref_live_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
      await supabase
        .from('webhook_integrations')
        .insert({
          advertiser_id: advertiserId,
          source: 'airtable',
          name: `${session.companyName} - Airtable 자동 동기화`,
          api_key: apiKey,
          config,
          is_active: true,
        })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
