// Cron: 승인 후 7일 경과 + 리드 0건 파트너에게 활동 넛지 이메일 (이메일 4)
// Schedule: 매월 8일 10:00 KST (vercel.json: "0 1 8 * *" UTC = 01:00 UTC = 10:00 KST)
// 회차별 다른 내용: 1회차(기초 실행 가이드) → 2회차(구체적 전략 3가지) → 3회차+(공감 + 소프트 CTA)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canSendEmail, logEmailSent } from '@/lib/email-throttle'

function buildEmailHtml(
  partnerName: string,
  programs: Array<{ programName: string; referralUrl: string }>,
  round: number
): string {
  const programLinks = programs.slice(0, 3).map(p => `
    <div style="background:#f8fafc;border-radius:6px;padding:12px 16px;margin-bottom:8px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111827;">${p.programName}</p>
      <p style="margin:0;font-size:12px;color:#4f46e5;word-break:break-all;">${p.referralUrl}</p>
    </div>`).join('')

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">추천 링크, 아직 한 번도 못 쓰셨나요?</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, 승인된 지 일주일이 됐는데 아직 활동을 시작 못 하셨더라고요.<br/>
        사실 시작이 어려울 뿐, 막상 해보면 생각보다 훨씬 쉽습니다.
      </p>

      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#111827;">지금 바로 쓸 수 있는 내 추천 링크</p>
        ${programLinks}
      </div>

      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4338ca;">오늘 딱 하나만 해보세요</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          내 추천 링크를 복사해서, 관심 있을 것 같은 지인 1명에게 카톡으로 보내보세요.<br/>
          <em>"이거 혹시 써봤어? 나 요즘 이거 추천하고 있는데"</em> — 이 한 줄이면 됩니다.
        </p>
      </div>

      <a href="https://referio.puzl.co.kr/dashboard"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        내 추천 링크 확인하기
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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">실제로 효과 있었던 방법 3가지 📌</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, 아직 첫 리드가 나오지 않으셨더라고요.<br/>
        다른 파트너분들이 실제로 쓴 방법을 공유합니다.
      </p>

      <div style="margin-bottom:12px;background:#f8fafc;border-radius:8px;padding:16px 20px;border-left:3px solid #4f46e5;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">① 카카오톡 오픈채팅</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          관련 주제 오픈채팅방에서 자연스럽게 언급. 강요 없이 "저 이거 써보니 괜찮더라" 한 줄이면 충분합니다.
        </p>
      </div>

      <div style="margin-bottom:12px;background:#f8fafc;border-radius:8px;padding:16px 20px;border-left:3px solid #4f46e5;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">② 블로그 후기 글</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          "내가 써본 [서비스명] 솔직 후기" 형식으로 글 하나. 검색에 걸리면 수동으로 계속 유입됩니다.
        </p>
      </div>

      <div style="margin-bottom:24px;background:#f8fafc;border-radius:8px;padding:16px 20px;border-left:3px solid #4f46e5;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">③ 지인 개인 메시지</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          가장 단순하지만 전환율이 가장 높습니다. 관심 있을 것 같은 친구 3명에게 직접 링크를 공유해보세요.
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">내 추천 링크</p>
        ${programLinks}
      </div>

      <a href="https://referio.puzl.co.kr/dashboard"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        대시보드에서 링크 복사하기
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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">여전히 응원하고 있습니다 🌱</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님, 아직 첫 리드가 나오지 않으셨더라고요.<br/>
        바쁘거나 타이밍이 안 맞을 수 있다는 거 충분히 이해합니다.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#166534;">기억해두세요</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          추천 링크에는 유효기간이 없습니다.<br/>
          지금 당장 활동 못 하셔도 괜찮아요. 준비가 됐을 때 언제든 시작하실 수 있습니다.<br/>
          그 때를 위해 링크는 항상 켜두겠습니다.
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">내 추천 링크 (언제든 사용 가능)</p>
        ${programLinks}
      </div>

      <p style="margin:0 0 20px;color:#374151;font-size:13px;line-height:1.7;">
        혹시 프로그램이 잘 맞지 않으신다면 다른 프로그램으로 바꾸셔도 됩니다.<br/>
        마켓플레이스에서 더 많은 프로그램을 확인해 보세요.
      </p>

      <a href="https://referio.puzl.co.kr/dashboard"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        대시보드 확인하기
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
  if (round === 1) return `[Referio] ${partnerName}님, 아직 시작 전이시죠? 괜찮아요 — 지금도 충분합니다`
  if (round === 2) return `[Referio] 첫 리드, 이 방법으로 만든 파트너들이 있어요`
  return `[Referio] ${partnerName}님, 여전히 응원하고 있습니다`
}

async function sendNudgeNoActivityEmail(options: {
  partnerEmail: string
  partnerName: string
  programs: Array<{ programName: string; referralUrl: string }>
  round: number
}): Promise<boolean> {
  const { partnerEmail, partnerName, programs, round } = options
  const html = buildEmailHtml(partnerName, programs, round)
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

    // Approved partner_programs approved 7+ days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: approvedPrograms, error } = await supabase
      .from('partner_programs')
      .select(`
        partner_id,
        referral_code,
        approved_at,
        advertisers!inner(company_name, program_name, homepage_url),
        partners!inner(id, name, email)
      `)
      .eq('status', 'approved')
      .lte('approved_at', sevenDaysAgo)
      .not('partners.email', 'is', null)

    if (error) {
      console.error('[Cron nudge-no-activity] Query error:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    if (!approvedPrograms || approvedPrograms.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No targets' })
    }

    // Group by partner, collect referral 0 count check
    const partnerMap = new Map<string, {
      partner: { id: string; name: string; email: string }
      programs: Array<{ programName: string; referralUrl: string }>
    }>()

    for (const prog of approvedPrograms) {
      const partner = Array.isArray(prog.partners) ? prog.partners[0] : prog.partners as { id: string; name: string; email: string }
      const adv = Array.isArray(prog.advertisers) ? prog.advertisers[0] : prog.advertisers as { company_name: string; program_name: string | null; homepage_url: string | null }
      if (!partner?.email) continue

      const referralUrl = adv?.homepage_url
        ? `${adv.homepage_url}${adv.homepage_url.includes('?') ? '&' : '?'}ref=${prog.referral_code}`
        : `https://referio.puzl.co.kr?ref=${prog.referral_code}`

      if (!partnerMap.has(partner.id)) {
        partnerMap.set(partner.id, { partner, programs: [] })
      }
      partnerMap.get(partner.id)!.programs.push({
        programName: adv?.program_name || adv?.company_name || '',
        referralUrl,
      })
    }

    // Filter: only partners with 0 referrals
    const partnerIds = Array.from(partnerMap.keys())
    const { data: activeReferrals } = await supabase
      .from('referrals')
      .select('partner_id')
      .in('partner_id', partnerIds)

    const activePartnerIds = new Set((activeReferrals || []).map(r => r.partner_id))
    const noActivityTargets = Array.from(partnerMap.values()).filter(p => !activePartnerIds.has(p.partner.id))

    // 28-day dedup: skip partners who already received this email in the last 28 days
    const since28days = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentlySent } = await supabase
      .from('email_log')
      .select('partner_id')
      .eq('email_type', 'activity_nudge')
      .eq('status', 'sent')
      .gte('sent_at', since28days)
      .in('partner_id', noActivityTargets.map(p => p.partner.id))

    const recentlySentIds = new Set((recentlySent || []).map(r => r.partner_id))
    const targets = noActivityTargets.filter(p => !recentlySentIds.has(p.partner.id))

    if (targets.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No targets after dedup' })
    }

    // Get all-time send count per partner to determine round
    const { data: allTimeSent } = await supabase
      .from('email_log')
      .select('partner_id')
      .eq('email_type', 'activity_nudge')
      .eq('status', 'sent')
      .in('partner_id', targets.map(p => p.partner.id))

    const sendCountMap = new Map<string, number>()
    for (const row of allTimeSent || []) {
      sendCountMap.set(row.partner_id, (sendCountMap.get(row.partner_id) ?? 0) + 1)
    }

    let sent = 0
    let skipped = 0

    for (const { partner, programs } of targets) {
      const check = await canSendEmail(partner.id, 'activity_nudge', false)
      if (!check.canSend) {
        skipped++
        await logEmailSent({
          partnerId: partner.id,
          emailType: 'activity_nudge',
          isMandatory: false,
          status: 'deferred',
          deferredReason: check.reason,
        })
        continue
      }

      const previousSends = sendCountMap.get(partner.id) ?? 0
      const round = Math.min(previousSends + 1, 3)

      const ok = await sendNudgeNoActivityEmail({
        partnerEmail: partner.email,
        partnerName: partner.name || '파트너',
        programs,
        round,
      })

      await logEmailSent({
        partnerId: partner.id,
        emailType: 'activity_nudge',
        isMandatory: false,
        status: ok ? 'sent' : 'failed',
      })

      if (ok) sent++
    }

    console.log(`[Cron nudge-no-activity] sent=${sent} skipped=${skipped} total_targets=${targets.length}`)
    return NextResponse.json({ sent, skipped, total_targets: targets.length })
  } catch (err) {
    console.error('[Cron nudge-no-activity] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
