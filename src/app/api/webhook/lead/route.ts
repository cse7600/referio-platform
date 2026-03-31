import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendReferralNotification } from '@/lib/email'

// HMAC-SHA256 서명 검증
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// 리드(피추천인) 웹훅 - 리캐치/세일즈맵에서 호출
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    const signature = request.headers.get('X-Webhook-Signature')
    const timestamp = request.headers.get('X-Webhook-Timestamp')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // API 키로 웹훅 통합 설정 조회
    const { data: integration, error: integrationError } = await supabase
      .from('webhook_integrations')
      .select('*, advertisers!inner(id, advertiser_id)')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      // API 사용량 로그 (실패)
      await supabase.from('api_usage_logs').insert({
        source_type: 'webhook',
        endpoint: '/api/webhook/lead',
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

    const rawBody = await request.text()

    // 서명 검증 (api_secret이 설정된 경우 signature 필수)
    if (integration.api_secret) {
      if (!signature) {
        return NextResponse.json(
          { error: '서명이 필요합니다' },
          { status: 401 }
        )
      }
      if (!verifySignature(rawBody, signature, integration.api_secret)) {
        return NextResponse.json(
          { error: '서명 검증 실패' },
          { status: 401 }
        )
      }
    }

    // 타임스탬프 검증 (5분 이내)
    if (timestamp) {
      const requestTime = parseInt(timestamp)
      if (isNaN(requestTime)) {
        return NextResponse.json(
          { error: '유효하지 않은 타임스탬프입니다' },
          { status: 400 }
        )
      }
      const currentTime = Math.floor(Date.now() / 1000)
      if (Math.abs(currentTime - requestTime) > 300) {
        return NextResponse.json(
          { error: '요청 시간이 만료되었습니다' },
          { status: 401 }
        )
      }
    }

    const body = JSON.parse(rawBody)

    // 필수 필드 검증
    const { name, phone, email, ref_code, inquiry, source_url } = body

    if (!name) {
      return NextResponse.json(
        { error: '이름은 필수입니다' },
        { status: 400 }
      )
    }

    // ref_code로 파트너 조회 (partner_programs 우선, 레거시 fallback)
    let partnerId = null
    if (ref_code) {
      // partner_programs에서 먼저 조회
      const { data: program } = await supabase
        .from('partner_programs')
        .select('partner_id')
        .eq('referral_code', ref_code)
        .eq('advertiser_id', integration.advertiser_id)
        .eq('status', 'approved')
        .single()

      if (program) {
        partnerId = program.partner_id
      } else {
        // 레거시 fallback: partners 테이블에서 조회
        const { data: partner } = await supabase
          .from('partners')
          .select('id')
          .eq('referral_code', ref_code)
          .eq('advertiser_id', integration.advertiser_id)
          .eq('status', 'approved')
          .single()

        partnerId = partner?.id || null
      }
    }

    // 중복 체크 (같은 연락처가 최근에 등록되었는지)
    const config = integration.config as Record<string, number> || {}
    const duplicateCheckDays = config.duplicate_check_days || 90

    if (phone) {
      const checkDate = new Date()
      checkDate.setDate(checkDate.getDate() - duplicateCheckDays)

      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('phone', phone)
        .eq('advertiser_id', integration.advertiser_id)
        .gte('created_at', checkDate.toISOString())
        .single()

      if (existingReferral) {
        // 중복 로그 기록
        await supabase.from('api_usage_logs').insert({
          source_type: 'webhook',
          source_id: integration.id,
          endpoint: '/api/webhook/lead',
          method: 'POST',
          status_code: 409,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent'),
          request_body: { name, phone: '***masked***', ref_code },
          response_summary: 'duplicate_lead',
        })

        return NextResponse.json(
          { error: '이미 등록된 연락처입니다', duplicate: true },
          { status: 409 }
        )
      }
    }

    // 피추천인(리드) 생성
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        advertiser_id: integration.advertiser_id,
        name,
        phone: phone || null,
        referral_code_input: ref_code || null,
        partner_id: partnerId,
        inquiry: inquiry || null,
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

    // API 사용량 로그 (성공)
    await supabase.from('api_usage_logs').insert({
      source_type: 'webhook',
      source_id: integration.id,
      endpoint: '/api/webhook/lead',
      method: 'POST',
      status_code: 201,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      request_body: { name, phone: '***masked***', ref_code, source: integration.source },
      response_summary: `referral_id: ${referral.id}`,
    })

    // 파트너 이메일 알림 발송 (파트너가 매칭된 경우)
    if (partnerId) {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('name, email')
        .eq('id', partnerId)
        .single()

      const { data: advertiserData } = await supabase
        .from('advertisers')
        .select('company_name, program_name')
        .eq('id', integration.advertiser_id)
        .single()

      if (partnerData?.email && advertiserData) {
        sendReferralNotification({
          partnerEmail: partnerData.email,
          partnerName: partnerData.name,
          leadName: name,
          advertiserCompanyName: advertiserData.company_name,
          programName: advertiserData.program_name || advertiserData.company_name,
          partnerId,
        }).catch(console.error)
      }
    }

    return NextResponse.json({
      success: true,
      referral_id: referral.id,
      partner_matched: !!partnerId,
    }, { status: 201 })

  } catch (error) {
    console.error('Webhook lead error:', error)
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
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Webhook-Signature, X-Webhook-Timestamp',
    },
  })
}
