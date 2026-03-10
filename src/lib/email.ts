// Resend 이메일 라이브러리
// 환경변수: RESEND_API_KEY, FROM_EMAIL (기본값: noreply@referio.kr)

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@referio.kr'
const FROM_NAME = 'Referio'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY가 설정되지 않았습니다. 이메일을 건너뜁니다.')
    console.info(`[Email 미전송] to: ${options.to}, subject: ${options.subject}`)
    return false
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('[Email] 전송 실패:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Email] 전송 오류:', error)
    return false
  }
}

// 1. 파트너 추천 알림 - 추천 링크로 문의가 들어왔을 때
export async function sendReferralNotification(options: {
  partnerEmail: string
  partnerName: string
  leadName: string
  advertiserCompanyName: string
  programName: string
}): Promise<boolean> {
  const { partnerEmail, partnerName, leadName, advertiserCompanyName, programName } = options

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">새 문의가 들어왔습니다! 🎉</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님의 추천 링크를 통해 새 고객이 문의를 남겼습니다.
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:100px;">고객명</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${leadName}님</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">파트너 프로그램</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${programName || advertiserCompanyName}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        ${advertiserCompanyName} 담당자가 고객에게 연락할 예정입니다. 상담이 유효 처리되면 커미션이 자동으로 적립됩니다.
      </p>
      <a href="https://referio.kr/dashboard/customers"
         style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        내 추천 현황 보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 알림 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${leadName}님이 ${advertiserCompanyName}에 문의를 남겼습니다`,
    html,
  })
}

// 2. 파트너 승인 알림 - 광고주가 파트너를 승인했을 때
export async function sendPartnerApprovalEmail(options: {
  partnerEmail: string
  partnerName: string
  advertiserCompanyName: string
  programName: string
  referralCode: string
  referralUrl?: string
}): Promise<boolean> {
  const { partnerEmail, partnerName, advertiserCompanyName, programName, referralCode, referralUrl } = options

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">파트너 승인을 축하합니다! 🎊</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님이 <strong>${programName || advertiserCompanyName}</strong> 파트너로 승인되었습니다.
        지금 바로 추천 링크를 공유하고 커미션을 받아보세요!
      </p>
      <div style="background:#eef2ff;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #c7d2fe;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4338ca;">내 추천 코드</p>
        <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#4f46e5;letter-spacing:2px;">${referralCode}</p>
        ${referralUrl ? `
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">내 추천 링크</p>
        <p style="margin:0;font-size:12px;color:#4f46e5;word-break:break-all;">${referralUrl}</p>
        ` : ''}
      </div>
      <a href="https://referio.kr/dashboard"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        대시보드로 이동
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 알림 메일입니다.
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${programName || advertiserCompanyName} 파트너로 승인되었습니다`,
    html,
  })
}

// 3. 광고주 새 리드 알림 - 문의폼 또는 Airtable 웹훅으로 리드가 생성됐을 때
export async function sendAdvertiserNewLeadEmail(options: {
  advertiserEmail: string
  companyName: string
  leadName: string
  leadPhone: string
  referralCode?: string | null
  partnerMatched: boolean
  source: 'inquiry' | 'airtable'
}): Promise<boolean> {
  const { advertiserEmail, companyName, leadName, leadPhone, referralCode, partnerMatched, source } = options

  const sourceLabel = source === 'inquiry' ? '문의 폼' : 'Airtable'
  const partnerLine = partnerMatched
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">파트너</td><td style="padding:6px 0;color:#4f46e5;font-size:13px;font-weight:600;">✅ 추천코드 ${referralCode} — 파트너 자동 귀속</td></tr>`
    : referralCode
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">파트너</td><td style="padding:6px 0;color:#f59e0b;font-size:13px;">⚠️ 추천코드 ${referralCode} 입력됐지만 매칭 파트너 없음</td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">새 리드가 접수됐습니다</h1>
      <p style="margin:4px 0 0;color:#c7d2fe;font-size:14px;">${companyName}</p>
    </div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:90px;">이름</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${leadName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">연락처</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${leadPhone}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">유입 경로</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${sourceLabel}</td>
          </tr>
          ${partnerLine}
        </table>
      </div>
      <a href="https://referio.kr/advertiser/referrals"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        리드 관리 바로가기 →
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio에서 자동 발송됩니다.
        수신 설정은 <a href="https://referio.kr/advertiser/settings" style="color:#6b7280;">설정 페이지</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to: advertiserEmail,
    subject: `[Referio] 새 리드 접수 — ${leadName}`,
    html,
  })
}

// 4. 파트너 가입 환영 이메일 - Referio에 처음 가입했을 때
export async function sendWelcomeEmail(options: {
  partnerEmail: string
  partnerName: string
}): Promise<boolean> {
  const { partnerEmail, partnerName } = options

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Referio에 오신 것을 환영합니다! 👋</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, 가입을 진심으로 환영합니다.<br/>
        Referio는 B2B 서비스 기업의 파트너 추천 프로그램을 관리하는 플랫폼입니다.
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">시작하기</p>
        <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:2;">
          <li>프로그램 마켓플레이스에서 참가할 프로그램을 선택하세요</li>
          <li>승인이 완료되면 나만의 추천 링크가 발급됩니다</li>
          <li>추천 링크를 통해 고객이 상담을 신청하면 커미션이 지급됩니다</li>
        </ol>
      </div>
      <a href="https://referio.kr/dashboard/programs"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        프로그램 둘러보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        문의: <a href="mailto:sales@referio.kr" style="color:#6b7280;">sales@referio.kr</a>
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to: partnerEmail,
    subject: '[Referio] 가입을 환영합니다!',
    html,
  })
}
