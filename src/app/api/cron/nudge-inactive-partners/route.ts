// Cron: 가입 후 3일 경과 + 프로그램 미신청 파트너에게 참여 독려 이메일 (이메일 2)
// Schedule: 매일 09:00 KST (vercel.json: "0 0 * * *" UTC = 00:00 UTC = 09:00 KST)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canSendEmail, logEmailSent } from '@/lib/email-throttle'

// Internal helper — not exported from email.ts
async function sendNudgeJoinProgramEmail(options: {
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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">아직 프로그램을 신청하지 않으셨네요 🤔</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, Referio에 가입하신 지 3일이 됐습니다.<br/>
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

  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@updates.puzl.co.kr'
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Referio <${FROM_EMAIL}>`,
      to: partnerEmail,
      subject: `[Referio] ${partnerName}님, 아직 프로그램 신청 전이시죠? 2분이면 됩니다`,
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
    const targets = partners.filter(p => !enrolledIds.has(p.id) && p.email)

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

      const ok = await sendNudgeJoinProgramEmail({
        partnerEmail: partner.email!,
        partnerName: partner.name || '파트너',
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
