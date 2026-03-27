// Slack Incoming Webhook 알림 라이브러리
// 환경변수: SLACK_WEBHOOK_URL
// 없으면 조용히 skip (서비스 동작에 영향 없음)

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

async function sendSlackMessage(text: string, blocks?: unknown[]): Promise<void> {
  if (!WEBHOOK_URL) return

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    })
  } catch (err) {
    console.error('[Slack] 알림 전송 실패:', err)
  }
}

// 1. 새 문의 접수 (inquiry 폼)
export async function notifyNewInquiry(options: {
  leadName: string
  leadPhone: string
  companyName: string
  referralCode?: string | null
  partnerMatched: boolean
}): Promise<void> {
  const { leadName, leadPhone, companyName, referralCode, partnerMatched } = options

  const partnerLine = referralCode
    ? partnerMatched
      ? `\n• 추천코드: \`${referralCode}\` ✅ 파트너 귀속`
      : `\n• 추천코드: \`${referralCode}\` ⚠️ 매칭 파트너 없음`
    : ''

  const text = `📥 새 문의 접수 — *${companyName}*\n• 이름: ${leadName}\n• 연락처: ${leadPhone}${partnerLine}`

  await sendSlackMessage(text)
}

// 2. Airtable 웹훅으로 새 리드 생성
export async function notifyAirtableLead(options: {
  leadName: string
  leadPhone?: string
  companyName: string
  referralCode?: string | null
  partnerMatched: boolean
}): Promise<void> {
  const { leadName, leadPhone, companyName, referralCode, partnerMatched } = options

  const partnerLine = referralCode
    ? partnerMatched
      ? `\n• 추천코드: \`${referralCode}\` ✅ 파트너 귀속`
      : `\n• 추천코드: \`${referralCode}\` ⚠️ 매칭 파트너 없음`
    : ''

  const phoneLine = leadPhone ? `\n• 연락처: ${leadPhone}` : ''
  const text = `📋 Airtable 리드 접수 — *${companyName}*\n• 이름: ${leadName}${phoneLine}${partnerLine}`

  await sendSlackMessage(text)
}

// 3. 파트너 프로그램 신청
export async function notifyPartnerApply(options: {
  partnerName: string
  partnerEmail: string
  companyName: string
  autoApproved: boolean
}): Promise<void> {
  const { partnerName, partnerEmail, companyName, autoApproved } = options

  const statusLine = autoApproved ? '✅ 자동 승인됨' : '⏳ 승인 대기 중'
  const text = `🙋 파트너 신청 — *${companyName}*\n• 파트너: ${partnerName} (${partnerEmail})\n• 상태: ${statusLine}`

  await sendSlackMessage(text)
}

// 4. 고객 피드백/문의 접수
export async function notifyFeedback(options: {
  userName: string
  userEmail: string
  userType: 'partner' | 'advertiser'
  message: string
}): Promise<void> {
  const { userName, userEmail, userType, message } = options
  const typeLabel = userType === 'partner' ? '파트너' : '광고주'
  const preview = message.length > 100 ? message.slice(0, 100) + '...' : message

  const text = `💬 새 문의/피드백 — *${typeLabel}*\n• 이름: ${userName} (${userEmail})\n• 내용: ${preview}`

  await sendSlackMessage(text)
}

// 5. 파트너 승인 완료
export async function notifyPartnerApproval(options: {
  partnerName: string
  partnerEmail: string
  companyName: string
  referralCode: string
}): Promise<void> {
  const { partnerName, partnerEmail, companyName, referralCode } = options

  const text = `✅ 파트너 승인 — *${companyName}*\n• 파트너: ${partnerName} (${partnerEmail})\n• 추천코드: \`${referralCode}\``

  await sendSlackMessage(text)
}
