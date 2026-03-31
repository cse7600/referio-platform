import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@updates.puzl.co.kr'
const SITE_URL = 'https://referio.puzl.co.kr'

// In-memory rate limiter (per serverless instance)
// Not perfect across instances, but provides basic defense
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 3 // max 3 requests per email per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const key = email.toLowerCase()
  const entry = rateLimitMap.get(key)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    return true
  }
  return false
}

// Periodically clean up stale entries to prevent memory leak
function cleanupRateLimitMap() {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}

export async function POST(req: NextRequest) {
  // Parse request body safely
  let body: { email?: string; advertiserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { email, advertiserId } = body

  if (!email || !advertiserId) {
    return NextResponse.json({ error: 'email and advertiserId required' }, { status: 400 })
  }

  // Rate limiting check
  if (isRateLimited(email)) {
    // Clean up stale entries on rate limit hit
    cleanupRateLimitMap()
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 1분 후에 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const admin = createAdminClient()

  // 해당 광고주의 파트너인지 확인
  const { data: partner } = await admin
    .from('partners')
    .select('id, name, email, partner_programs!inner(referral_code, advertiser_id)')
    .eq('email', email)
    .eq('partner_programs.advertiser_id',
      // advertiser_id(slug) → UUID 변환
      (await admin.from('advertisers').select('id').eq('advertiser_id', advertiserId).single()).data?.id ?? advertiserId
    )
    .single()

  if (!partner) {
    // 파트너 여부를 노출하지 않기 위해 성공 응답 반환 (보안)
    return NextResponse.json({ ok: true })
  }

  const advertiserUuid = (partner.partner_programs as { referral_code: string; advertiser_id: string }[])[0]?.advertiser_id
  const referralCode = (partner.partner_programs as { referral_code: string }[])[0]?.referral_code ?? ''
  const redirectTo = `${SITE_URL}/signup/${advertiserId}?email=${encodeURIComponent(email)}`

  // 새 recovery 링크 생성
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (linkError) {
    // Mask internal error details from client
    console.error('[resend-setup-link] generateLink error:', linkError.message)
    return NextResponse.json(
      { error: '링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }

  const actionLink = linkData.properties?.action_link

  // 광고주 브랜딩 정보 조회
  const { data: advertiser } = await admin
    .from('advertisers')
    .select('company_name, primary_color')
    .eq('advertiser_id', advertiserId)
    .single()

  const brandColor = advertiser?.primary_color || '#1e3a8a'
  const companyName = advertiser?.company_name || '파트너 포털'

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:40px auto;">
  <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <span style="color:#fff;font-size:20px;font-weight:700;">Referio</span>
  </div>
  <div style="background:${brandColor};padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">비밀번호 설정 링크가 재발송됐습니다</h1>
  </div>
  <div style="background:#fff;padding:36px 32px;">
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.8;">
      ${partner.name}님, 안녕하세요.<br>
      요청하신 ${companyName} 파트너 포털 비밀번호 설정 링크를 발송했습니다.<br>
      <span style="color:#ef4444;font-weight:600;">이 링크는 발송 후 1시간 내에만 유효합니다.</span>
    </p>
    ${referralCode ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0;font-size:13px;color:#6b7280;">추천 코드 <strong style="color:${brandColor};letter-spacing:1px;">${referralCode}</strong></p>
    </div>` : ''}
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${actionLink}" style="display:inline-block;padding:16px 44px;background:${brandColor};color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;">
        비밀번호 설정하기 →
      </a>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;">
      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;">버튼이 작동하지 않으면 아래 주소를 복사해주세요</p>
      <p style="margin:0;color:#6b7280;font-size:11px;word-break:break-all;">${actionLink}</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">문의: <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a></p>
  </div>
</div>
</body>
</html>`

  const { error: sendError } = await resend.emails.send({
    from: `Referio <${FROM_EMAIL}>`,
    to: email,
    subject: `[${companyName}] 비밀번호 설정 링크 재발송`,
    html,
  })

  if (sendError) {
    console.error('[resend-setup-link] email send error:', sendError)
    return NextResponse.json(
      { error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
