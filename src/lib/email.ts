// Resend 이메일 라이브러리
// 환경변수: RESEND_API_KEY, FROM_EMAIL (기본값: noreply@updates.puzl.co.kr)

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@updates.puzl.co.kr'
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
      <a href="https://referio.puzl.co.kr/dashboard/customers"
         style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        내 추천 현황 보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 알림 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
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
  advertiserId?: string // advertiser_id (text slug, e.g. "keepermate")
  leadCommission?: number
  contractCommission?: number
}): Promise<boolean> {
  const {
    partnerEmail, partnerName, advertiserCompanyName, programName,
    referralCode, referralUrl, advertiserId, leadCommission, contractCommission,
  } = options

  const displayName = programName || advertiserCompanyName
  const programPageUrl = advertiserId
    ? `https://referio.puzl.co.kr/dashboard/programs/${advertiserId}`
    : 'https://referio.puzl.co.kr/dashboard/programs'

  // Commission info section (only if at least one value exists)
  const hasCommission = (leadCommission && leadCommission > 0) || (contractCommission && contractCommission > 0)
  const commissionRows = hasCommission ? `
      <div style="background:#f0fdf4;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#166534;">커미션 안내</p>
        <table style="width:100%;border-collapse:collapse;">
          ${leadCommission && leadCommission > 0 ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">리드 커미션 (유효 상담 시)</td>
            <td style="padding:4px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">${leadCommission.toLocaleString()}원</td>
          </tr>` : ''}
          ${contractCommission && contractCommission > 0 ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">계약 커미션 (계약 성사 시)</td>
            <td style="padding:4px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">${contractCommission.toLocaleString()}원</td>
          </tr>` : ''}
        </table>
      </div>` : ''

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">파트너 승인 완료!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, <strong>${displayName}</strong> 파트너로 승인되었습니다.<br/>
        지금 바로 추천 활동을 시작해 보세요!
      </p>

      <!-- Referral code -->
      <div style="background:#eef2ff;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #c7d2fe;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4338ca;">내 추천 코드</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#4f46e5;letter-spacing:3px;text-align:center;padding:8px 0;">${referralCode}</p>
        ${referralUrl ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #c7d2fe;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">내 추천 링크</p>
          <p style="margin:0;font-size:13px;color:#4f46e5;word-break:break-all;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #e0e7ff;">${referralUrl}</p>
        </div>` : ''}
      </div>

      <!-- Commission info -->
      ${commissionRows}

      <!-- Program detail guide -->
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">프로그램 상세 페이지 안내</p>
        <p style="margin:0 0 12px;color:#6b7280;font-size:13px;">
          아래 페이지에서 활동에 필요한 모든 정보를 확인할 수 있습니다.
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="color:#4f46e5;font-weight:600;">개요</span>
              <span style="color:#6b7280;"> — 프로그램 설명, 커미션 구조, 지급 조건</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="color:#4f46e5;font-weight:600;">활동가이드</span>
              <span style="color:#6b7280;"> — 추천 시 단계별 가이드</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="color:#dc2626;font-weight:600;">금지활동</span>
              <span style="color:#6b7280;"> — 반드시 확인! 해서는 안 되는 행동</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="color:#4f46e5;font-weight:600;">유의사항</span>
              <span style="color:#6b7280;"> — 중요 규칙과 주의할 점</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="color:#4f46e5;font-weight:600;">미디어</span>
              <span style="color:#6b7280;"> — 홍보용 이미지/영상 자료</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="color:#4f46e5;font-weight:600;">게시판</span>
              <span style="color:#6b7280;"> — 광고주 공지사항, Q&A</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA button -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${programPageUrl}"
           style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
          지금 바로 활동 시작하기
        </a>
      </div>
      <p style="margin:8px 0 0;text-align:center;color:#9ca3af;font-size:12px;">
        프로그램 상세 페이지에서 활동가이드와 금지활동을 꼭 확인해 주세요.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 알림 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${displayName} 파트너로 승인되었습니다`,
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
      <a href="https://referio.puzl.co.kr/advertiser/referrals"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        리드 관리 바로가기 →
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio에서 자동 발송됩니다.
        수신 설정은 <a href="https://referio.puzl.co.kr/advertiser/settings" style="color:#6b7280;">설정 페이지</a>에서 변경하세요.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
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

// 4. 정산 정보 입력 요청 - 파트너에게 계좌/개인정보 입력을 요청

// Generate settlement info request HTML (exported for preview)
export function generateSettlementInfoRequestHtml(partnerName: string, pendingAmount: number): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:36px 32px;">
      <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#111827;">정산 정보 입력 요청</h2>
      <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
        ${partnerName}님, 정산 처리를 위해 아래 정보를 입력해 주세요.
      </p>

      <!-- 입력 필요 항목 -->
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e;">입력이 필요한 항목</p>
        <ul style="margin:0;padding-left:20px;color:#78350f;font-size:14px;line-height:2.2;">
          <li>은행명</li>
          <li>계좌번호</li>
          <li>예금주명</li>
          <li>주민번호 (원천징수 처리용)</li>
        </ul>
      </div>

      <!-- 정산 예정 금액 -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:18px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#166534;">
          정산 예정 금액: <strong style="font-size:18px;">₩${pendingAmount.toLocaleString()}</strong>
        </p>
      </div>

      <!-- CTA 버튼 -->
      <a href="https://referio.puzl.co.kr/dashboard/profile"
         style="display:inline-block;padding:15px 36px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        정산 정보 입력하기 →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio에서 자동 발송됩니다.
        문의: <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendSettlementInfoRequestEmail(options: {
  partnerEmail: string
  partnerName: string
  pendingAmount: number
  advertiserName?: string
}): Promise<boolean> {
  const { partnerEmail, partnerName, pendingAmount } = options

  const html = generateSettlementInfoRequestHtml(partnerName, pendingAmount)

  return sendEmail({
    to: partnerEmail,
    subject: '[Referio] 정산을 위해 계좌 및 개인 정보를 입력해 주세요',
    html,
  })
}

// 5. 파트너 가입 환영 이메일 - Referio에 처음 가입했을 때
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
      <a href="https://referio.puzl.co.kr/dashboard/programs"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        프로그램 둘러보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
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

// CRM 이메일 10: 정산 확정 안내 (정산 정보 등록 완료된 파트너)
export async function sendSettlementConfirmedEmail(options: {
  partnerEmail: string;
  partnerName: string;
  totalAmount: number;
  paymentDueDate?: string; // 예: '2026-04-15'
  accountLastFour?: string; // 계좌 끝 4자리
  settlementItems?: Array<{ programName: string; count: number; amount: number }>;
}): Promise<boolean> {
  const { partnerEmail, partnerName, totalAmount, paymentDueDate, accountLastFour, settlementItems } = options;

  const itemRows = settlementItems?.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${item.programName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;text-align:center;">${item.count}건</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600;text-align:right;">₩${item.amount.toLocaleString()}</td>
    </tr>`).join('') ?? '';

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">정산이 확정됐습니다 ✅</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님의 활동에 대한 정산이 확정됐습니다.<br/>
        별도로 하실 일은 없습니다. 등록하신 계좌로 입금이 진행됩니다.
      </p>

      <!-- 정산 금액 -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#166534;">확정 정산 금액</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#15803d;">₩${totalAmount.toLocaleString()}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">세금 처리 전 금액 · 최종 입금액은 원천징수 후 산정됩니다</p>
      </div>

      <!-- 정산 내역 테이블 -->
      ${settlementItems && settlementItems.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">프로그램</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">건수</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">금액</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="background:#f9fafb;">
            <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700;color:#111827;">합계</td>
            <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#4f46e5;text-align:right;">₩${totalAmount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>` : ''}

      <!-- 입금 일정 -->
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${paymentDueDate ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:110px;">입금 예정일</td>
            <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">${paymentDueDate}</td>
          </tr>` : ''}
          ${accountLastFour ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">입금 계좌</td>
            <td style="padding:4px 0;color:#111827;font-size:13px;">등록된 계좌 (끝 4자리: ${accountLastFour})</td>
          </tr>` : ''}
        </table>
      </div>

      <a href="https://referio.puzl.co.kr/dashboard/settlements"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        정산 내역 확인하기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 정산 처리에 관한 필수 안내 메일입니다.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${partnerName}님, ₩${totalAmount.toLocaleString()} 정산이 확정됐습니다`,
    html,
  });
}

// CRM 이메일 12: 입금 완료 확인
export async function sendSettlementPaidEmail(options: {
  partnerEmail: string;
  partnerName: string;
  paidAmount: number;
  paidAt?: string; // 예: '2026-04-15 14:30'
  accountLastFour?: string;
}): Promise<boolean> {
  const { partnerEmail, partnerName, paidAmount, paidAt, accountLastFour } = options;

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">입금이 완료됐습니다 💰</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님께 정산 금액이 정상 입금됐습니다.
      </p>

      <!-- 입금 금액 -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#166534;">입금 완료 금액</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#15803d;">₩${paidAmount.toLocaleString()}</p>
      </div>

      <!-- 입금 상세 -->
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${paidAt ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:80px;">입금 일시</td>
            <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">${paidAt}</td>
          </tr>` : ''}
          ${accountLastFour ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">입금 계좌</td>
            <td style="padding:4px 0;color:#111827;font-size:13px;">끝 4자리 ${accountLastFour}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">
        입금이 확인되지 않으시면 은행 처리 지연일 수 있습니다 (영업일 기준 1~2일 소요).
      </p>

      <a href="https://referio.puzl.co.kr/dashboard/settlements"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        정산 내역 확인하기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 입금 완료에 관한 필수 안내 메일입니다.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ₩${paidAmount.toLocaleString()} 입금이 완료됐습니다`,
    html,
  });
}

// CRM 이메일 15: 파트너 신청 거절 안내
export async function sendProgramRejectedEmail(options: {
  partnerEmail: string;
  partnerName: string;
  programName: string;
  advertiserCompanyName: string;
  rejectionReason?: string;
}): Promise<boolean> {
  const { partnerEmail, partnerName, programName, advertiserCompanyName, rejectionReason } = options;

  const reasonBlock = rejectionReason ? `
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#713f12;">거절 사유</p>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">${rejectionReason}</p>
      </div>` : '';

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">파트너 신청 결과 안내</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, <strong>${programName || advertiserCompanyName}</strong> 파트너 신청을 검토한 결과를 안내드립니다.
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">
          아쉽게도 이번 신청은 <strong>승인되지 않았습니다</strong>.
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:#b91c1c;">
          이는 ${partnerName}님의 능력이나 신뢰도 문제가 아니라,
          현재 ${advertiserCompanyName}의 파트너 모집 기준과의 적합성 문제입니다.
        </p>
      </div>

      ${reasonBlock}

      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#111827;">다른 프로그램도 둘러보세요</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
          Referio에는 다양한 B2B 파트너 프로그램이 있습니다.
          나에게 맞는 다른 프로그램에 신청해보세요.
        </p>
      </div>

      <a href="https://referio.puzl.co.kr/dashboard/marketplace"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        다른 프로그램 둘러보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 파트너 신청 결과 안내 메일입니다.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${programName || advertiserCompanyName} 파트너 신청 결과 안내`,
    html,
  });
}

// CRM 이메일 7: 첫 고객 유입 축하 (프로그램별 최초 1회)
export async function sendFirstLeadEmail(options: {
  partnerEmail: string;
  partnerName: string;
  programName: string;
  advertiserCompanyName: string;
  referralUrl?: string;
  leadReceivedAt?: string; // 예: '2026-04-01 14:32'
}): Promise<boolean> {
  const { partnerEmail, partnerName, programName, advertiserCompanyName, referralUrl, leadReceivedAt } = options;
  const displayName = programName || advertiserCompanyName;

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">첫 번째 고객이 문을 두드렸습니다 🎯</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님의 추천 링크로 <strong>${displayName}</strong>에 첫 번째 고객이 유입됐습니다.<br/>
        ${leadReceivedAt ? `유입 시각: ${leadReceivedAt}` : ''}
      </p>

      <div style="background:#eef2ff;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #c7d2fe;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#4338ca;">처음은 언제나 특별합니다 ✨</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          이 첫 발걸음이 쌓이면 — 한 명이 열 명이 되고, 열 명이 수익이 됩니다.<br/>
          유입된 고객이 계약으로 이어지면 커미션이 자동으로 확정됩니다.
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#111827;">전환율을 높이는 파트너들의 방법</p>
        <ul style="margin:0;padding-left:18px;color:#374151;font-size:13px;line-height:2;">
          <li>링크를 한 곳에만 두지 않기 — 블로그, 카톡, SNS에 나눠서 노출</li>
          <li>직접 추천 멘트 붙이기 — "제가 써봤는데 좋았어요"가 클릭률 3배</li>
          <li>꾸준히 노출하기 — 오늘 클릭 → 2주 뒤 계약이 되는 경우가 많습니다</li>
        </ul>
      </div>

      ${referralUrl ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#166534;font-weight:600;">내 추천 링크</p>
        <p style="margin:0;font-size:13px;color:#15803d;word-break:break-all;">${referralUrl}</p>
      </div>` : ''}

      <a href="https://referio.puzl.co.kr/dashboard/customers"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        유입 현황 대시보드 보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 활동 관련 정보 제공을 위해 발송됩니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${partnerName}님, 첫 번째 고객이 ${displayName}에 문의했습니다 🎯`,
    html,
  });
}

// CRM 이메일 8: 첫 수익 확정 축하 (파트너 최초 settlement 생성 시)
export async function sendFirstRevenueEmail(options: {
  partnerEmail: string;
  partnerName: string;
  programName: string;
  advertiserCompanyName: string;
  commissionAmount: number;
}): Promise<boolean> {
  const { partnerEmail, partnerName, programName, advertiserCompanyName, commissionAmount } = options;
  const displayName = programName || advertiserCompanyName;

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">첫 번째 수익이 확정됐습니다 🎉</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, <strong>${displayName}</strong>에서 첫 번째 커미션이 확정됐습니다!
      </p>

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:24px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#166534;">확정 커미션</p>
        <p style="margin:0;font-size:36px;font-weight:700;color:#15803d;">₩${commissionAmount.toLocaleString()}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">정산 정보 등록 후 정산 일정에 맞춰 입금됩니다</p>
      </div>

      <div style="background:#eef2ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #c7d2fe;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#4338ca;">이제 진짜 시작입니다</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          첫 수익을 만들어낸 파트너는 계속 수익을 만들어냅니다.<br/>
          지금처럼만 계속하면 됩니다. 다음 커미션도 곧 만들어보세요!
        </p>
      </div>

      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#713f12;">
          💡 정산을 받으려면 <strong>계좌 및 정산 정보를 먼저 등록</strong>해주세요.
          아직 등록하지 않으셨다면 지금 바로 등록하세요.
        </p>
      </div>

      <a href="https://referio.puzl.co.kr/dashboard/settlements"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        수익 내역 확인하기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 활동 관련 정보 제공을 위해 발송됩니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${partnerName}님, 첫 번째 커미션 ₩${commissionAmount.toLocaleString()}이 확정됐습니다 🎉`,
    html,
  });
}
