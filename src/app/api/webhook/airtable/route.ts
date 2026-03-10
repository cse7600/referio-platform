import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AirtableConfig {
  name_field: string
  phone_field: string
  ref_code_field: string
  status_field: string
  valid_values: string[]
  contract_values: string[]
  invalid_values: string[]
  sales_rep_field?: string
  contract_date_field?: string
}

interface WebhookIntegration {
  id: string
  advertiser_id: string
  config: {
    airtable?: AirtableConfig
  }
}

// Airtable Automation에서 호출되는 웹훅 엔드포인트
// 설정 방법: Airtable → Automations → Fetch URL → https://referio.kr/api/webhook/airtable
// 헤더: X-API-Key: [발급된 API 키]
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // API 키로 웹훅 통합 설정 조회 (airtable 타입만)
    const { data: integration, error: integrationError } = await supabase
      .from('webhook_integrations')
      .select('id, advertiser_id, config')
      .eq('api_key', apiKey)
      .eq('source', 'airtable')
      .eq('is_active', true)
      .single() as { data: WebhookIntegration | null; error: unknown }

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Airtable 레코드 데이터 추출
    const record = body.record || body
    const fields = record.fields || record
    const airtableRecordId: string | null = body.record_id || record.id || null

    const airtableConfig: AirtableConfig = integration.config?.airtable || {
      name_field: '이름',
      phone_field: '전화번호',
      ref_code_field: '추천코드',
      status_field: '영업상태',
      valid_values: ['유효'],
      contract_values: ['계약'],
      invalid_values: ['무효'],
    }

    const name = fields[airtableConfig.name_field]
    const phone = fields[airtableConfig.phone_field]
    const refCode = fields[airtableConfig.ref_code_field]
    const status = fields[airtableConfig.status_field]
    const contractDate = airtableConfig.contract_date_field
      ? fields[airtableConfig.contract_date_field]
      : null

    if (!name && !phone && !refCode) {
      return NextResponse.json(
        { error: '이름, 전화번호, 추천코드 중 하나 이상이 필요합니다' },
        { status: 400 }
      )
    }

    // 기존 referral 조회 순서: record_id → 추천코드 → 전화번호
    let existingReferral = null

    // 1순위: airtable record_id (가장 정확, 멱등성 보장)
    if (airtableRecordId) {
      const { data } = await supabase
        .from('referrals')
        .select('id, partner_id, contract_status, is_valid, airtable_record_id')
        .eq('airtable_record_id', airtableRecordId)
        .eq('advertiser_id', integration.advertiser_id)
        .maybeSingle()
      existingReferral = data
    }

    // 2순위: 추천코드
    if (!existingReferral && refCode) {
      const { data } = await supabase
        .from('referrals')
        .select('id, partner_id, contract_status, is_valid')
        .eq('referral_code_input', refCode)
        .eq('advertiser_id', integration.advertiser_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existingReferral = data
    }

    // 3순위: 전화번호
    if (!existingReferral && phone) {
      const { data } = await supabase
        .from('referrals')
        .select('id, partner_id, contract_status, is_valid')
        .eq('phone', phone)
        .eq('advertiser_id', integration.advertiser_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existingReferral = data
    }

    // 영업 상태에 따른 업데이트 내용 결정
    let updateData: Record<string, unknown> = {}
    let action = 'none'

    if (status && airtableConfig.valid_values.includes(status)) {
      updateData = { is_valid: true }
      action = 'valid'
    } else if (status && airtableConfig.contract_values.includes(status)) {
      updateData = {
        is_valid: true,
        contract_status: 'completed',
      }
      action = 'contract'
    } else if (status && airtableConfig.invalid_values.includes(status)) {
      updateData = { is_valid: false }
      action = 'invalid'
    }

    if (existingReferral) {
      // 동일 record_id로 이미 처리된 신규 리드 이벤트 → 멱등 처리
      if (
        airtableRecordId &&
        'airtable_record_id' in existingReferral &&
        existingReferral.airtable_record_id === airtableRecordId &&
        action === 'none'
      ) {
        return NextResponse.json({
          success: true,
          action: 'duplicate_ignored',
          referral_id: existingReferral.id,
          message: '이미 처리된 이벤트입니다',
        })
      }

      // 상태 업데이트
      if (action !== 'none') {
        const { error: updateError } = await supabase
          .from('referrals')
          .update(updateData)
          .eq('id', existingReferral.id)

        if (updateError) {
          // 파트너 없는 리드: 정산 트리거 NOT NULL 오류 → is_valid 제외하고 재시도
          if (updateError.code === '23502' && updateData.is_valid !== undefined) {
            const updateWithoutValid = { ...updateData }
            delete updateWithoutValid.is_valid
            if (Object.keys(updateWithoutValid).length > 0) {
              await supabase.from('referrals').update(updateWithoutValid).eq('id', existingReferral.id)
            }
            console.warn('Referral update: partner_id null, is_valid skipped for', existingReferral.id)
          } else {
            console.error('Referral update error:', updateError)
            return NextResponse.json(
              { error: '업데이트에 실패했습니다' },
              { status: 500 }
            )
          }
        }
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        referral_id: existingReferral.id,
        status_applied: action,
      })
    } else {
      // 새 리드 생성 (추천코드로 파트너 조회)
      let partnerId = null
      if (refCode) {
        const { data: program } = await supabase
          .from('partner_programs')
          .select('partner_id')
          .eq('referral_code', refCode)
          .eq('advertiser_id', integration.advertiser_id)
          .eq('status', 'approved')
          .maybeSingle()

        if (program) {
          partnerId = program.partner_id
        }
      }

      const { data: newReferral, error: createError } = await supabase
        .from('referrals')
        .insert({
          advertiser_id: integration.advertiser_id,
          name: name || '이름 없음',
          phone: phone || null,
          referral_code_input: refCode || null,
          partner_id: partnerId,
          airtable_record_id: airtableRecordId || null,
          contract_status: action === 'contract' ? 'completed' : 'pending',
          is_valid: action === 'valid' || action === 'contract' ? true
            : action === 'invalid' ? false : null,
        })
        .select()
        .single()

      if (createError) {
        // unique constraint 위반 → 멱등 처리 (race condition 방어)
        if (createError.code === '23505') {
          return NextResponse.json({
            success: true,
            action: 'duplicate_ignored',
            message: '이미 처리된 이벤트입니다 (중복 방지)',
          })
        }
        console.error('Referral creation error:', createError)
        return NextResponse.json(
          { error: '리드 생성에 실패했습니다' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        referral_id: newReferral.id,
        partner_matched: !!partnerId,
        status_applied: action,
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Airtable webhook error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}
