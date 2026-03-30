import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 커스텀 문의폼 API - 파트너가 자체 폼에서 사용
// ref 코드와 API 키를 기반으로 리드 생성
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

    // API 키로 파트너 조회
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('partner_api_keys')
      .select(`
        *,
        partners!inner(id, name, referral_code, advertiser_id, status),
        advertisers!inner(id, advertiser_id)
      `)
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    // Supabase !inner join with .single() returns object, not array
    const partnerData = apiKeyData?.partners as unknown as { id: string; name: string; referral_code: string; advertiser_id: string; status: string } | undefined
    const advertiserData = apiKeyData?.advertisers as unknown as { id: string; advertiser_id: string } | undefined

    if (apiKeyError || !apiKeyData) {
      await supabase.from('api_usage_logs').insert({
        source_type: 'partner_api',
        endpoint: '/api/referral',
        method: 'POST',
        status_code: 401,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      })

      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다' },
        { status: 401 }
      )
    }

    // 파트너 상태 확인
    if (partnerData!.status !== 'approved') {
      return NextResponse.json(
        { error: '승인된 파트너만 API를 사용할 수 있습니다' },
        { status: 403 }
      )
    }

    // Rate limit 체크
    if (apiKeyData.requests_this_month >= apiKeyData.rate_limit_monthly) {
      await supabase.from('api_usage_logs').insert({
        source_type: 'partner_api',
        source_id: apiKeyData.id,
        endpoint: '/api/referral',
        method: 'POST',
        status_code: 429,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
        response_summary: 'rate_limit_exceeded',
      })

      return NextResponse.json(
        { error: '월간 API 호출 한도를 초과했습니다' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, phone, email, inquiry, utm_source, utm_medium, utm_campaign } = body

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: '이름은 필수입니다' },
        { status: 400 }
      )
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: '연락처(전화번호 또는 이메일)는 필수입니다' },
        { status: 400 }
      )
    }

    // 중복 체크 (90일 이내)
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - 90)

    if (phone) {
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('phone', phone)
        .eq('advertiser_id', apiKeyData.advertiser_id)
        .gte('created_at', checkDate.toISOString())
        .single()

      if (existingReferral) {
        await supabase.from('api_usage_logs').insert({
          source_type: 'partner_api',
          source_id: apiKeyData.id,
          endpoint: '/api/referral',
          method: 'POST',
          status_code: 409,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent'),
          request_body: { name, phone: '***masked***' },
          response_summary: 'duplicate_referral',
        })

        return NextResponse.json(
          { error: '이미 등록된 연락처입니다', duplicate: true },
          { status: 409 }
        )
      }
    }

    // 리드 생성
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        advertiser_id: apiKeyData.advertiser_id,
        partner_id: apiKeyData.partner_id,
        name,
        phone: phone || null,
        referral_code_input: partnerData!.referral_code,
        inquiry: inquiry || null,
        channel: utm_source || null,
        contract_status: 'pending',
        is_valid: null,
      })
      .select()
      .single()

    if (referralError) {
      console.error('Referral creation error:', referralError)
      return NextResponse.json(
        { error: '리드 생성에 실패했습니다' },
        { status: 500 }
      )
    }

    // API 사용 횟수 증가
    await supabase
      .from('partner_api_keys')
      .update({
        requests_this_month: apiKeyData.requests_this_month + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', apiKeyData.id)

    // API 사용량 로그 (성공)
    await supabase.from('api_usage_logs').insert({
      source_type: 'partner_api',
      source_id: apiKeyData.id,
      endpoint: '/api/referral',
      method: 'POST',
      status_code: 201,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      request_body: {
        name,
        phone: '***masked***',
        utm_source,
        utm_medium,
        utm_campaign,
      },
      response_summary: `referral_id: ${referral.id}`,
    })

    return NextResponse.json({
      success: true,
      referral_id: referral.id,
      message: '문의가 성공적으로 접수되었습니다',
    }, { status: 201 })

  } catch (error) {
    console.error('Referral API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// GET - API 키 유효성 확인
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    const { data: apiKeyData, error } = await supabase
      .from('partner_api_keys')
      .select(`
        id,
        name,
        rate_limit_monthly,
        requests_this_month,
        is_active,
        partners!inner(name, referral_code, status)
      `)
      .eq('api_key', apiKey)
      .single()

    if (error || !apiKeyData) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다' },
        { status: 401 }
      )
    }

    const partner = apiKeyData.partners as unknown as { name: string; referral_code: string; status: string }

    return NextResponse.json({
      valid: true,
      key_name: apiKeyData.name,
      partner_name: partner.name,
      partner_status: partner.status,
      rate_limit: apiKeyData.rate_limit_monthly,
      requests_used: apiKeyData.requests_this_month,
      requests_remaining: apiKeyData.rate_limit_monthly - apiKeyData.requests_this_month,
    })

  } catch (error) {
    console.error('API key check error:', error)
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}
