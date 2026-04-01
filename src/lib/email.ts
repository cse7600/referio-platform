// Resend 이메일 라이브러리
// 환경변수: RESEND_API_KEY, FROM_EMAIL (기본값: noreply@updates.puzl.co.kr)

import { canSendEmail, isEmailOptedOut, logEmailSent } from '@/lib/email-throttle';
import { generateUnsubscribeUrl } from '@/lib/email-token';
import { createAdminClient } from '@/lib/supabase/admin';

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
  partnerId?: string
}): Promise<boolean> {
  const { partnerEmail, partnerName, leadName, advertiserCompanyName, programName, partnerId } = options

  if (partnerId && await isEmailOptedOut(partnerId)) return false;

  const unsubscribeUrl = partnerId
    ? generateUnsubscribeUrl(partnerId)
    : 'https://referio.puzl.co.kr/dashboard/profile';

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
        수신 거부를 원하시면 <a href="${unsubscribeUrl}" style="color:#6b7280;">수신거부</a>하세요.<br/>
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
  partnerId?: string
}): Promise<boolean> {
  const {
    partnerEmail, partnerName, advertiserCompanyName, programName,
    referralCode, referralUrl, advertiserId, leadCommission, contractCommission, partnerId,
  } = options

  if (partnerId && await isEmailOptedOut(partnerId)) return false;

  const unsubscribeUrl = partnerId
    ? generateUnsubscribeUrl(partnerId)
    : 'https://referio.puzl.co.kr/dashboard/profile';

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
        수신 거부를 원하시면 <a href="${unsubscribeUrl}" style="color:#6b7280;">수신거부</a>하세요.<br/>
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
        이 메일은 Referio 가입 시 발송되는 서비스 안내 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.<br/>
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
  partnerId?: string;
}): Promise<boolean> {
  const { partnerEmail, partnerName, programName, advertiserCompanyName, referralUrl, leadReceivedAt, partnerId } = options;

  if (partnerId && await isEmailOptedOut(partnerId)) return false;

  const unsubscribeUrl = partnerId
    ? generateUnsubscribeUrl(partnerId)
    : 'https://referio.puzl.co.kr/dashboard/profile';
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
        수신 거부를 원하시면 <a href="${unsubscribeUrl}" style="color:#6b7280;">수신거부</a>하세요.
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
  partnerId?: string;
}): Promise<boolean> {
  const { partnerEmail, partnerName, programName, advertiserCompanyName, commissionAmount, partnerId } = options;

  if (partnerId && await isEmailOptedOut(partnerId)) return false;

  const unsubscribeUrl = partnerId
    ? generateUnsubscribeUrl(partnerId)
    : 'https://referio.puzl.co.kr/dashboard/profile';
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
        수신 거부를 원하시면 <a href="${unsubscribeUrl}" style="color:#6b7280;">수신거부</a>하세요.
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

// CRM 이메일 5: 신규 프로그램 안내 (광고주가 프로그램 is_active=true 전환 시)
// partnerIds: 발송 대상 파트너 ID 목록 (이미 필터링된 상태로 전달)
export async function sendNewProgramEmail(options: {
  programId: string;
  programName: string;
  advertiserName: string;
  commissionValid: number;
  commissionContract: number;
  shortDescription: string;
  conditionSummary?: string;
  partnerIds: string[];
}): Promise<{ sent: number; skipped: number }> {
  const {
    programId,
    programName,
    advertiserName,
    commissionValid,
    commissionContract,
    shortDescription,
    conditionSummary,
    partnerIds,
  } = options;

  const applyLink = `https://referio.kr/dashboard/marketplace/${programId}`;

  // Fetch partner emails + names from DB
  const admin = createAdminClient();
  const { data: partners, error } = await admin
    .from('partners')
    .select('id, name, email')
    .in('id', partnerIds)
    .not('auth_user_id', 'is', null);

  if (error || !partners || partners.length === 0) {
    console.error('[sendNewProgramEmail] 파트너 조회 실패:', error);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const partner of partners) {
    if (!partner.email) {
      skipped++;
      continue;
    }

    // Throttle check
    const throttle = await canSendEmail(partner.id, 'activity_new_program', false);
    if (!throttle.canSend) {
      await logEmailSent({
        partnerId: partner.id,
        emailType: 'activity_new_program',
        isMandatory: false,
        programId,
        status: 'deferred',
        deferredReason: throttle.reason,
      });
      skipped++;
      continue;
    }

    const unsubscribeUrl = generateUnsubscribeUrl(partner.id);

    const commissionRows = [
      commissionValid > 0 ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">유효 리드 커미션</td>
            <td style="padding:4px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">₩${commissionValid.toLocaleString()}</td>
          </tr>` : '',
      commissionContract > 0 ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">계약 완료 커미션</td>
            <td style="padding:4px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">₩${commissionContract.toLocaleString()}</td>
          </tr>` : '',
    ].join('');

    const conditionRow = conditionSummary ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">파트너 조건</td>
            <td style="padding:4px 0;color:#374151;font-size:13px;">${conditionSummary}</td>
          </tr>` : '';

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">신규 파트너 프로그램 오픈</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partner.name || '파트너'}님, 새로운 파트너 프로그램이 열렸습니다. 빨리 알려드리고 싶었어요.
      </p>

      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${advertiserName}</p>
        <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">${programName}</p>
        <p style="margin:0 0 16px;font-size:13px;color:#374151;line-height:1.6;">${shortDescription}</p>
        <div style="background:#fff;border-radius:8px;padding:14px 16px;">
          <table style="width:100%;border-collapse:collapse;">
            ${commissionRows}
            ${conditionRow}
          </table>
        </div>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#166534;">왜 지금 신청해야 할까요?</p>
        <ul style="margin:0;padding-left:18px;color:#374151;font-size:13px;line-height:2;">
          <li>초기 파트너에게 광고주 지원이 집중됩니다</li>
          <li>경쟁이 적은 지금 내 콘텐츠가 더 잘 보입니다</li>
          <li>먼저 시작한 파트너일수록 실적 이력이 쌓입니다</li>
        </ul>
      </div>

      <a href="${applyLink}"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        ${programName} 신청하기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 활동 관련 정보 제공을 위해 발송됩니다.
        수신 거부를 원하시면 <a href="${unsubscribeUrl}" style="color:#6b7280;">수신거부</a>하세요.<br/>
        문의가 있으시면 <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>로 연락해 주세요.
      </p>
    </div>
  </div>
</body>
</html>`;

    const ok = await sendEmail({
      to: partner.email,
      subject: `[Referio] 신규 파트너 프로그램 오픈 — ${programName} 먼저 시작한 파트너가 유리합니다`,
      html,
    });

    await logEmailSent({
      partnerId: partner.id,
      emailType: 'activity_new_program',
      isMandatory: false,
      programId,
      status: ok ? 'sent' : 'failed',
    });

    if (ok) sent++;
    else skipped++;
  }

  console.info(`[sendNewProgramEmail] programId=${programId} sent=${sent} skipped=${skipped}`);
  return { sent, skipped };
}

// CRM 이메일 14: 탈퇴 처리 완료 (파트너 탈퇴 신청 완료 직후 즉시 발송)
export async function sendAccountDeletedEmail(options: {
  partnerId: string;
  partnerEmail: string;
  partnerName: string;
  pendingSettlementAmount?: number; // 미완료 정산 합산 금액 (없으면 0 또는 undefined)
  paymentDueDate?: string; // 예: '2026년 04월 30일'
}): Promise<boolean> {
  const { partnerId, partnerEmail, partnerName, pendingSettlementAmount, paymentDueDate } = options;

  const hasPendingSettlement = (pendingSettlementAmount ?? 0) > 0;

  // Subject: 미완료 정산 유무에 따라 분기
  const subject = hasPendingSettlement
    ? `[Referio] 탈퇴 처리 완료 — 미완료 정산 ${pendingSettlementAmount!.toLocaleString()}원 처리 안내 포함`
    : `[Referio] ${partnerName}님, 탈퇴 처리가 완료됐습니다`;

  // Conditional: 미완료 정산 안내 섹션 (정산 있을 때만 표시)
  const pendingSettlementSection = hasPendingSettlement ? `
      <!-- 미완료 정산 안내 -->
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#713f12;">미완료 정산 안내</p>
        <p style="margin:0 0 12px;font-size:13px;color:#78350f;line-height:1.6;">
          탈퇴 처리 후에도 확정된 정산은 정상적으로 지급됩니다.
        </p>
        <div style="background:#fff;border-radius:8px;padding:14px 16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;color:#6b7280;font-size:13px;width:130px;">미완료 정산 금액</td>
              <td style="padding:4px 0;color:#92400e;font-size:14px;font-weight:700;">₩${pendingSettlementAmount!.toLocaleString()}</td>
            </tr>
            ${paymentDueDate ? `
            <tr>
              <td style="padding:4px 0;color:#6b7280;font-size:13px;">입금 예정일</td>
              <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">${paymentDueDate}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:4px 0;color:#6b7280;font-size:13px;">입금 계좌</td>
              <td style="padding:4px 0;color:#374151;font-size:13px;">탈퇴 전 등록된 계좌</td>
            </tr>
          </table>
        </div>
        <p style="margin:12px 0 0;font-size:12px;color:#78350f;">
          입금은 탈퇴 이후에도 등록된 계좌로 자동 처리됩니다. 별도 조치는 필요하지 않습니다.<br/>
          입금 완료 시 이메일로 별도 안내드립니다. 문의: support@referio.kr
        </p>
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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">탈퇴 처리가 완료됐습니다</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, 탈퇴 신청이 정상적으로 처리됐습니다.<br/>
        Referio에서 활동해주신 시간에 감사드립니다.
      </p>

      <!-- 탈퇴 처리 내역 -->
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#111827;">탈퇴 처리 내역</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;width:100px;">계정 상태</td>
            <td style="padding:4px 0;color:#374151;font-size:13px;">탈퇴 완료</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">처리 일시</td>
            <td style="padding:4px 0;color:#374151;font-size:13px;">본 이메일 수신 시점</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">개인정보</td>
            <td style="padding:4px 0;color:#374151;font-size:13px;">관련 법령에 따라 보관 후 파기됩니다</td>
          </tr>
        </table>
      </div>

      ${pendingSettlementSection}

      <!-- 탈퇴 사유 설문 -->
      <div style="background:#eef2ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #c7d2fe;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#4338ca;">마지막으로 한 가지만 여쭤볼게요</p>
        <p style="margin:0 0 12px;font-size:13px;color:#374151;line-height:1.6;">
          탈퇴하신 이유를 알려주시면 서비스 개선에 참고하겠습니다. (선택 사항)
        </p>
        <a href="https://referio.kr/exit-survey"
           style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
          탈퇴 사유 선택하기 (1분 소요)
        </a>
      </div>

      <!-- 재가입 안내 -->
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">언제든 다시 오실 수 있습니다</p>
        <a href="https://referio.puzl.co.kr/signup"
           style="font-size:13px;color:#4f46e5;text-decoration:none;">
          재가입하기 →
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        본 메일은 정산/계약/보안 관련 필수 통지 이메일로, 수신거부 대상에서 제외됩니다.<br/>
        주식회사 퍼즐 | 서울특별시 |
        <a href="https://referio.kr/privacy" style="color:#6b7280;">개인정보처리방침</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const ok = await sendEmail({ to: partnerEmail, subject, html });

  await logEmailSent({
    partnerId,
    emailType: 'account_deleted',
    isMandatory: true,
    status: ok ? 'sent' : 'failed',
  });

  return ok;
}

// CRM 이메일 13: 가이드라인 위반 경고 (Admin 확정 후 즉시 발송)
export async function sendViolationWarningEmail(options: {
  partnerEmail: string;
  partnerName: string;
  partnerId: string;
  programName?: string;
  programId?: string;
  violationDescription: string;
  occurredAt: Date;
}): Promise<boolean> {
  const { partnerEmail, partnerName, partnerId, programName, programId, violationDescription, occurredAt } = options;

  // Format occurred_at in KST
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(occurredAt.getTime() + kstOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  const occurredAtKst = `${kstDate.getUTCFullYear()}년 ${pad(kstDate.getUTCMonth() + 1)}월 ${pad(kstDate.getUTCDate())}일 ${pad(kstDate.getUTCHours())}:${pad(kstDate.getUTCMinutes())}`;

  // Objection deadline = send date + 7 days (KST)
  const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + kstOffset);
  const objectionDeadline = `${deadlineDate.getUTCFullYear()}년 ${pad(deadlineDate.getUTCMonth() + 1)}월 ${pad(deadlineDate.getUTCDate())}일`;

  const programRow = programName
    ? `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #fecaca;font-size:13px;color:#6b7280;width:110px;">위반 프로그램</td>
          <td style="padding:8px 12px;border-bottom:1px solid #fecaca;font-size:13px;color:#111827;">${programName}</td>
        </tr>`
    : '';

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">가이드라인 위반이 확인됐습니다</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, Referio 운영팀에서 ${partnerName}님의 활동을 검토한 결과,<br/>
        아래 내용의 가이드라인 위반이 확인되어 공식적으로 안내드립니다.
      </p>

      <!-- 위반 확인 내역 -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <div style="padding:12px 16px;background:#fee2e2;border-bottom:1px solid #fecaca;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#991b1b;">위반 확인 내역</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${programRow}
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #fecaca;font-size:13px;color:#6b7280;width:110px;">위반 일시</td>
            <td style="padding:8px 12px;border-bottom:1px solid #fecaca;font-size:13px;color:#111827;">${occurredAtKst}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:13px;color:#6b7280;vertical-align:top;padding-top:12px;">위반 항목</td>
            <td style="padding:8px 12px;font-size:13px;color:#111827;line-height:1.6;">${violationDescription}</td>
          </tr>
        </table>
      </div>

      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:4px 0;margin-bottom:20px;">
        <p style="margin:0;padding:8px 16px;font-size:12px;color:#713f12;">
          위 내용은 시스템 기록 및 운영팀 검토를 통해 확인된 사실에 기반합니다.
        </p>
      </div>

      <!-- 1차 경고 조치 내용 -->
      <div style="background:#f8fafc;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827;">이번 조치 내용 — 1차 경고</p>
        <p style="margin:0 0 8px;font-size:13px;color:#374151;">
          이번 위반은 <strong>1차 경고</strong>로 처리되며, 현재 계정 및 파트너 활동은 유지됩니다.
        </p>
        <ul style="margin:8px 0 0;padding-left:18px;color:#374151;font-size:13px;line-height:2.0;">
          <li>해당 위반 행위는 즉시 중단되어야 합니다.</li>
          <li>동일하거나 유사한 위반이 재발할 경우, <strong>계정 활동이 정지될 수 있습니다.</strong></li>
          <li>정지 처리 시 진행 중인 추천 건의 정산은 약관에 따라 처리됩니다.</li>
        </ul>
      </div>

      <!-- 가이드라인 위반이란? -->
      <div style="background:#f8fafc;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827;">가이드라인 위반이란?</p>
        <ul style="margin:0;padding-left:18px;color:#374151;font-size:13px;line-height:2.0;">
          <li>허위 정보 또는 과장된 내용을 이용한 추천 유도</li>
          <li>본인 또는 지인의 계정을 이용한 자가 추천(셀프 리퍼럴)</li>
          <li>타인의 동의 없이 추천 코드를 무단 등록</li>
          <li>광고주가 명시적으로 금지한 채널을 통한 홍보</li>
          <li>봇, 자동화 프로그램 등을 이용한 클릭·리드 조작</li>
        </ul>
        <p style="margin:10px 0 0;font-size:13px;color:#6b7280;">
          전체 가이드라인은 파트너 대시보드 내 '가이드라인' 메뉴에서 확인하실 수 있습니다.
        </p>
      </div>

      <!-- 이의제기 안내 -->
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#4338ca;">이의가 있으신가요?</p>
        <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.7;">
          위반 내용이 사실과 다르거나 이의를 제기하고자 하시는 경우,
          <strong>${objectionDeadline}까지</strong> 아래 방법으로 접수해주세요.<br/>
          접수된 이의는 영업일 기준 5일 이내 검토 후 결과를 이메일로 안내드립니다.
        </p>
        <a href="https://referio.kr/dashboard/support"
           style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:8px;">
          이의제기 접수하기
        </a>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
          또는 이메일: <a href="mailto:support@referio.kr" style="color:#4f46e5;">support@referio.kr</a>
        </p>
      </div>

      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
        본 이메일은 공식 경고 기록으로 보관됩니다. 앞으로도 건강한 파트너 활동을 기대합니다.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        Referio | <a href="https://referio.kr/privacy" style="color:#9ca3af;">개인정보처리방침</a><br/>
        본 메일은 정산/계약/보안 관련 필수 통지 이메일로, 수신거부 대상에서 제외됩니다.<br/>
        주식회사 퍼즐 | 서울특별시 | noreply@updates.puzl.co.kr
      </p>
    </div>
  </div>
</body>
</html>`;

  const ok = await sendEmail({
    to: partnerEmail,
    subject: `[Referio] ${partnerName}님 계정에 가이드라인 위반이 확인됐습니다 — 조치 안내`,
    html,
  });

  await logEmailSent({
    partnerId,
    emailType: 'violation_warning',
    isMandatory: true,
    programId: programId ?? undefined,
    status: ok ? 'sent' : 'failed',
  });

  return ok;
}

// 이벤트 알림 이메일 — 광고주가 파트너들에게 단체 발송
export async function sendEventNotificationEmail(options: {
  eventId: string;
  eventTitle: string;
  eventType: 'event' | 'bonus' | 'ranking' | 'post_verification';
  rewardDescription?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  bannerBgColor?: string | null;
  advertiserName: string;
  programName: string;
  partnerIds: string[];
}): Promise<{ sent: number; skipped: number }> {
  const {
    eventId,
    eventTitle,
    eventType,
    rewardDescription,
    startDate,
    endDate,
    bannerBgColor,
    advertiserName,
    programName,
    partnerIds,
  } = options;

  const eventUrl = `https://referio.kr/dashboard/events`;

  const TYPE_LABELS: Record<string, string> = {
    event: '이벤트',
    bonus: '보너스',
    ranking: '랭킹',
    post_verification: '게시물 인증',
  };
  const TYPE_EMOJIS: Record<string, string> = {
    event: '🎉',
    bonus: '🎁',
    ranking: '🏆',
    post_verification: '📸',
  };

  const PARTICIPATION_GUIDES: Record<string, string[]> = {
    event: [
      '아래 버튼을 눌러 Referio 대시보드로 이동하세요',
      '이벤트 탭에서 이벤트를 확인하세요',
      '"신청하기" 버튼을 눌러 참여를 완료하세요',
    ],
    bonus: [
      '아래 버튼을 눌러 Referio 대시보드로 이동하세요',
      '이벤트 탭에서 보너스 프로모션을 확인하세요',
      '조건을 달성하면 자동으로 보너스가 적립됩니다',
    ],
    ranking: [
      '아래 버튼을 눌러 Referio 대시보드로 이동하세요',
      '이벤트 탭에서 랭킹 이벤트를 확인하세요',
      '추천 실적을 높여 상위 랭킹에 도전하세요',
    ],
    post_verification: [
      '아래 버튼을 눌러 Referio 대시보드로 이동하세요',
      '이벤트 탭에서 게시물 인증 이벤트를 확인하세요',
      '블로그/SNS에 게시물을 작성하고 URL을 제출하세요',
      '검토 완료 후 리워드가 지급됩니다',
    ],
  };

  const admin = createAdminClient();
  const { data: partners, error } = await admin
    .from('partners')
    .select('id, name, email, email_opted_out')
    .in('id', partnerIds)
    .not('auth_user_id', 'is', null);

  if (error || !partners || partners.length === 0) {
    console.error('[sendEventNotificationEmail] 파트너 조회 실패:', error);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  const headerBg = bannerBgColor || '#4f46e5';
  const typeLabel = TYPE_LABELS[eventType] ?? '이벤트';
  const typeEmoji = TYPE_EMOJIS[eventType] ?? '🎉';
  const guideSteps = PARTICIPATION_GUIDES[eventType] ?? PARTICIPATION_GUIDES.event;

  const dateText = (() => {
    if (startDate && endDate) return `${startDate} ~ ${endDate}`;
    if (startDate) return `${startDate}부터`;
    if (endDate) return `${endDate}까지`;
    return null;
  })();

  for (const partner of partners) {
    if (!partner.email || partner.email_opted_out) {
      skipped++;
      continue;
    }

    const throttle = await canSendEmail(partner.id, 'event_notification', false);
    if (!throttle.canSend) {
      skipped++;
      continue;
    }

    const unsubscribeUrl = generateUnsubscribeUrl(partner.id);

    const stepsHtml = guideSteps.map((step, i) => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#4f46e5;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:24px;text-align:center;">${i + 1}</div>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;padding-top:3px;">${step}</p>
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${eventTitle}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:580px;margin:40px auto 60px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#4f46e5;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:32px;height:32px;background:#ffffff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#4f46e5;font-weight:900;font-size:16px;">R</span>
      </div>
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Referio</span>
    </div>

    <!-- Event Banner -->
    <div style="background:${headerBg};padding:32px 32px 28px;">
      <div style="display:inline-block;background:rgba(255,255,255,0.25);border-radius:20px;padding:4px 12px;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:600;color:#1e1b4b;">${typeEmoji} ${typeLabel}</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1e1b4b;line-height:1.3;">${eventTitle}</h1>
      ${rewardDescription ? `<p style="margin:0 0 4px;font-size:15px;color:#312e81;font-weight:600;">🎁 ${rewardDescription}</p>` : ''}
      ${dateText ? `<p style="margin:8px 0 0;font-size:13px;color:#4338ca;">📅 ${dateText}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 6px;font-size:15px;color:#374151;">안녕하세요, <strong>${partner.name}</strong>님 👋</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${advertiserName}</strong>의 <strong>${programName}</strong> 파트너 여러분께<br>
        새로운 이벤트 소식을 전합니다!
      </p>

      <!-- Divider -->
      <div style="height:1px;background:#e5e7eb;margin:0 0 24px;"></div>

      <!-- How to participate -->
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">✅ 참여 방법</h2>
      ${stepsHtml}

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0 8px;">
        <a href="${eventUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">이벤트 참여하기 →</a>
      </div>
      <p style="text-align:center;margin:12px 0 0;font-size:12px;color:#9ca3af;">버튼이 작동하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요<br>
        <a href="${eventUrl}" style="color:#6366f1;font-size:11px;">${eventUrl}</a>
      </p>

      <!-- Divider -->
      <div style="height:1px;background:#e5e7eb;margin:28px 0;"></div>

      <!-- Program info -->
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">파트너 프로그램</p>
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">${programName}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${advertiserName}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">이 이메일은 Referio 파트너 프로그램을 통해 발송되었습니다.</p>
      <a href="${unsubscribeUrl}" style="font-size:11px;color:#9ca3af;text-decoration:underline;">수신 거부하기</a>
    </div>

  </div>
</body>
</html>`;

    const ok = await sendEmail({
      to: partner.email,
      subject: `[${advertiserName}] ${typeEmoji} ${eventTitle} — 지금 참여하세요!`,
      html,
    });

    if (ok) {
      await logEmailSent({
        partnerId: partner.id,
        emailType: 'event_notification',
        isMandatory: false,
        status: 'sent',
      });
      sent++;
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}

// 이벤트 알림 이메일 미리보기 HTML 생성 (발송 없이 HTML만 반환)
export function generateEventNotificationPreview(options: {
  eventTitle: string;
  eventType: 'event' | 'bonus' | 'ranking' | 'post_verification';
  rewardDescription?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  bannerBgColor?: string | null;
  advertiserName: string;
  programName: string;
}): string {
  const {
    eventTitle,
    eventType,
    rewardDescription,
    startDate,
    endDate,
    bannerBgColor,
    advertiserName,
    programName,
  } = options;

  const TYPE_LABELS: Record<string, string> = {
    event: '이벤트', bonus: '보너스', ranking: '랭킹', post_verification: '게시물 인증',
  };
  const TYPE_EMOJIS: Record<string, string> = {
    event: '🎉', bonus: '🎁', ranking: '🏆', post_verification: '📸',
  };
  const PARTICIPATION_GUIDES: Record<string, string[]> = {
    event: ['아래 버튼을 눌러 Referio 대시보드로 이동하세요', '이벤트 탭에서 이벤트를 확인하세요', '"신청하기" 버튼을 눌러 참여를 완료하세요'],
    bonus: ['아래 버튼을 눌러 Referio 대시보드로 이동하세요', '이벤트 탭에서 보너스 프로모션을 확인하세요', '조건을 달성하면 자동으로 보너스가 적립됩니다'],
    ranking: ['아래 버튼을 눌러 Referio 대시보드로 이동하세요', '이벤트 탭에서 랭킹 이벤트를 확인하세요', '추천 실적을 높여 상위 랭킹에 도전하세요'],
    post_verification: ['아래 버튼을 눌러 Referio 대시보드로 이동하세요', '이벤트 탭에서 게시물 인증 이벤트를 확인하세요', '블로그/SNS에 게시물을 작성하고 URL을 제출하세요', '검토 완료 후 리워드가 지급됩니다'],
  };

  const eventUrl = 'https://referio.kr/dashboard/events';
  const headerBg = bannerBgColor || '#4f46e5';
  const typeLabel = TYPE_LABELS[eventType] ?? '이벤트';
  const typeEmoji = TYPE_EMOJIS[eventType] ?? '🎉';
  const guideSteps = PARTICIPATION_GUIDES[eventType] ?? PARTICIPATION_GUIDES.event;
  const dateText = (() => {
    if (startDate && endDate) return `${startDate} ~ ${endDate}`;
    if (startDate) return `${startDate}부터`;
    if (endDate) return `${endDate}까지`;
    return null;
  })();

  const stepsHtml = guideSteps.map((step, i) => `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
      <div style="width:24px;height:24px;border-radius:50%;background:#4f46e5;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:24px;text-align:center;">${i + 1}</div>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;padding-top:3px;">${step}</p>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${eventTitle}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:580px;margin:40px auto 60px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:32px;height:32px;background:#ffffff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#4f46e5;font-weight:900;font-size:16px;">R</span>
      </div>
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Referio</span>
    </div>
    <div style="background:${headerBg};padding:32px 32px 28px;">
      <div style="display:inline-block;background:rgba(255,255,255,0.25);border-radius:20px;padding:4px 12px;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:600;color:#1e1b4b;">${typeEmoji} ${typeLabel}</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1e1b4b;line-height:1.3;">${eventTitle}</h1>
      ${rewardDescription ? `<p style="margin:0 0 4px;font-size:15px;color:#312e81;font-weight:600;">🎁 ${rewardDescription}</p>` : ''}
      ${dateText ? `<p style="margin:8px 0 0;font-size:13px;color:#4338ca;">📅 ${dateText}</p>` : ''}
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 6px;font-size:15px;color:#374151;">안녕하세요, <strong>파트너</strong>님 👋</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;"><strong>${advertiserName}</strong>의 <strong>${programName}</strong> 파트너 여러분께<br>새로운 이벤트 소식을 전합니다!</p>
      <div style="height:1px;background:#e5e7eb;margin:0 0 24px;"></div>
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">✅ 참여 방법</h2>
      ${stepsHtml}
      <div style="text-align:center;margin:32px 0 8px;">
        <a href="${eventUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">이벤트 참여하기 →</a>
      </div>
      <p style="text-align:center;margin:12px 0 0;font-size:12px;color:#9ca3af;">버튼이 작동하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요<br><a href="${eventUrl}" style="color:#6366f1;font-size:11px;">${eventUrl}</a></p>
      <div style="height:1px;background:#e5e7eb;margin:28px 0;"></div>
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">파트너 프로그램</p>
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">${programName}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${advertiserName}</p>
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">이 이메일은 Referio 파트너 프로그램을 통해 발송되었습니다.</p>
      <span style="font-size:11px;color:#9ca3af;">수신 거부는 파트너 프로필 설정에서 변경하실 수 있습니다.</span>
    </div>
  </div>
</body>
</html>`;
}
