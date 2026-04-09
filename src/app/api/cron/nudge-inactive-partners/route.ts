// Cron: 가입 후 3일 경과 + 프로그램 미신청 파트너에게 참여 독려 이메일 (이메일 2)
// Schedule: 매월 15일 09:00 KST (vercel.json: "0 0 15 * *" UTC = 00:00 UTC = 09:00 KST)
// 회차별 다른 내용: 1회차(기초 가이드) → 2회차(성공 사례) → 3회차+(개인 도움 제안)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canSendEmail, logEmailSent } from '@/lib/email-throttle'

function buildEmailHtml(partnerName: string, round: number): string {
  if (round === 1) {
    return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">아직 프로그램을 신청하지 않으셨네요 🤔</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, Referio에 가입하신 지 시간이 좀 됐습니다.<br/>
        아직 파트너 프로그램을 신청하지 않으셨더라고요.
      </p>

      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">프로그램 신청, 2분이면 됩니다</p>
        <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:2.2;">
          <li>마켓플레이스에서 관심 있는 프로그램 클릭</li>
          <li>"신청하기" 버튼 하나</li>
          <li>광고주 승인 후 추천 링크 발급 완료</li>
        </ol>
      </div>

      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          💡 추천 링크 하나만 있으면 지인에게 공유하거나 SNS에 올리는 것만으로도 커미션을 받을 수 있습니다.
        </p>
      </div>

      <a href="https://referio.puzl.co.kr/dashboard/marketplace"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        지금 프로그램 신청하기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 활동 안내 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`
  }

  if (round === 2) {
    return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">다시 한번 말씀드리는 이유가 있어요 📢</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, Referio 파트너로 가입하셨지만 아직 프로그램 신청을 안 하셨더라고요.<br/>
        실제로 활동 중인 파트너분들이 어떻게 시작했는지 알려드릴게요.
      </p>

      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:16px;border-left:3px solid #4f46e5;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#4f46e5;">블로거 파트너의 경우</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          관심 있는 서비스 하나를 골라 프로그램 신청 후, 평소 쓰던 블로그에 후기 글 하나를 올렸습니다.<br/>
          첫 달 커미션: <strong>43,000원</strong>
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;border-left:3px solid #4f46e5;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#4f46e5;">SNS 운영 파트너의 경우</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          인스타그램 스토리에 추천 링크를 공유했습니다. 팔로워 600명 계정이었어요.<br/>
          첫 달 커미션: <strong>28,000원</strong>
        </p>
      </div>

      <p style="margin:0 0 20px;color:#374151;font-size:13px;">
        대단한 인플루언서가 아니어도 됩니다. 시작이 전부입니다.
      </p>

      <a href="https://referio.puzl.co.kr/dashboard/marketplace"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        프로그램 둘러보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 활동 안내 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`
  }

  // Round 3+
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">솔직히 여쭤볼게요 🙏</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, 몇 달째 프로그램 신청을 안 하고 계신 데에 이유가 있을 것 같아요.<br/>
        혹시 막히는 부분이 있으신가요?
      </p>

      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#92400e;">자주 들리는 이야기들</p>
        <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:2.2;">
          <li>"어떤 프로그램을 골라야 할지 모르겠어요" → <strong>관심사 기반으로 1개만 먼저</strong></li>
          <li>"링크를 어디에 써야 할지 모르겠어요" → <strong>카톡 or SNS 한 곳이면 충분</strong></li>
          <li>"승인이 안 날 것 같아요" → <strong>대부분의 프로그램은 자동 승인</strong></li>
        </ul>
      </div>

      <p style="margin:0 0 20px;color:#374151;font-size:13px;line-height:1.7;">
        만약 다른 이유가 있다면 이 메일에 바로 답장해 주셔도 됩니다.<br/>
        직접 도움을 드리겠습니다.
      </p>

      <a href="https://referio.puzl.co.kr/dashboard/marketplace"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        지금 시작해보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 파트너 활동 안내 메일입니다.
        수신 거부를 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">프로필 설정</a>에서 변경하세요.
      </p>
    </div>
  </div>
</body>
</html>`
}

function buildSubject(partnerName: string, round: number): string {
  if (round === 1) return `[Referio] ${partnerName}님, 아직 프로그램 신청 전이시죠? 2분이면 됩니다`
  if (round === 2) return `[Referio] 이렇게 시작한 파트너들이 첫 달에 받은 커미션`
  return `[Referio] ${partnerName}님, 혹시 막히는 부분이 있으신가요?`
}

async function sendNudgeJoinProgramEmail(options: {
  partnerEmail: string
  partnerName: string
  round: number
}): Promise<boolean> {
  const { partnerEmail, partnerName, round } = options
  const html = buildEmailHtml(partnerName, round)
  const subject = buildSubject(partnerName, round)

  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@updates.puzl.co.kr'
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Referio <${FROM_EMAIL}>`,
      to: partnerEmail,
      subject,
      html,
    }),
  })
  return res.ok
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Partners who joined 3+ days ago but have no partner_programs
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: partners, error } = await supabase
      .from('partners')
      .select('id, name, email, created_at')
      .lte('created_at', threeDaysAgo)
      .not('email', 'is', null)

    if (error) {
      console.error('[Cron nudge-inactive] Query error:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No partners found' })
    }

    // Get partner IDs that have at least one partner_program
    const { data: enrolled } = await supabase
      .from('partner_programs')
      .select('partner_id')
      .in('partner_id', partners.map(p => p.id))

    const enrolledIds = new Set((enrolled || []).map(e => e.partner_id))
    const unenrolled = partners.filter(p => !enrolledIds.has(p.id) && p.email)

    // 28-day dedup: skip partners who already received this email in the last 28 days
    const since28days = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentlySent } = await supabase
      .from('email_log')
      .select('partner_id')
      .eq('email_type', 'onboarding_nudge')
      .eq('status', 'sent')
      .gte('sent_at', since28days)
      .in('partner_id', unenrolled.map(p => p.id))

    const recentlySentIds = new Set((recentlySent || []).map(r => r.partner_id))
    const targets = unenrolled.filter(p => !recentlySentIds.has(p.id))

    if (targets.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No targets after dedup' })
    }

    // Get all-time send count per partner to determine round
    const { data: allTimeSent } = await supabase
      .from('email_log')
      .select('partner_id')
      .eq('email_type', 'onboarding_nudge')
      .eq('status', 'sent')
      .in('partner_id', targets.map(p => p.id))

    const sendCountMap = new Map<string, number>()
    for (const row of allTimeSent || []) {
      sendCountMap.set(row.partner_id, (sendCountMap.get(row.partner_id) ?? 0) + 1)
    }

    let sent = 0
    let skipped = 0

    for (const partner of targets) {
      const check = await canSendEmail(partner.id, 'onboarding_nudge', false)
      if (!check.canSend) {
        skipped++
        await logEmailSent({
          partnerId: partner.id,
          emailType: 'onboarding_nudge',
          isMandatory: false,
          status: 'deferred',
          deferredReason: check.reason,
        })
        continue
      }

      const previousSends = sendCountMap.get(partner.id) ?? 0
      const round = Math.min(previousSends + 1, 3)

      const ok = await sendNudgeJoinProgramEmail({
        partnerEmail: partner.email!,
        partnerName: partner.name || '파트너',
        round,
      })

      await logEmailSent({
        partnerId: partner.id,
        emailType: 'onboarding_nudge',
        isMandatory: false,
        status: ok ? 'sent' : 'failed',
      })

      if (ok) sent++
    }

    console.log(`[Cron nudge-inactive] sent=${sent} skipped=${skipped} total_targets=${targets.length}`)
    return NextResponse.json({ sent, skipped, total_targets: targets.length })
  } catch (err) {
    console.error('[Cron nudge-inactive] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
