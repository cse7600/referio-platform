// Cron: 월간 성과 리포트 이메일 (이메일 6)
// Schedule: 매월 1일 09:00 KST (vercel.json: "0 0 1 * *" UTC)
// 지난 달 활동이 있는 파트너 전체에게 발송

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canSendEmail, logEmailSent } from '@/lib/email-throttle'

async function sendMonthlyReportEmail(options: {
  partnerEmail: string
  partnerName: string
  targetMonth: string // 예: '2026년 3월'
  totalLeads: number
  totalSettlementAmount: number
  programs: Array<{ programName: string; leads: number; amount: number }>
}): Promise<boolean> {
  const { partnerEmail, partnerName, targetMonth, totalLeads, totalSettlementAmount, programs } = options

  const programRows = programs.slice(0, 5).map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${p.programName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${p.leads}건</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;text-align:right;">${p.amount > 0 ? `₩${p.amount.toLocaleString()}` : '-'}</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1>
      <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">${targetMonth} 월간 성과 리포트</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">${targetMonth} 활동 리포트 📊</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        ${partnerName}님의 지난 달 파트너 활동을 정리했습니다.
      </p>

      <!-- 요약 카드 -->
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:#eef2ff;border-radius:8px;padding:16px;text-align:center;border:1px solid #c7d2fe;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">총 리드 유입</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#4f46e5;">${totalLeads}건</p>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;border:1px solid #86efac;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">확정 커미션</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#15803d;">${totalSettlementAmount > 0 ? `₩${totalSettlementAmount.toLocaleString()}` : '-'}</p>
        </div>
      </div>

      <!-- 프로그램별 상세 -->
      ${programs.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">프로그램</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">리드</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">커미션</th>
          </tr>
        </thead>
        <tbody>${programRows}</tbody>
      </table>` : `
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">이번 달 활동 데이터가 없습니다.</p>
      </div>`}

      <a href="https://referio.puzl.co.kr/dashboard"
         style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        대시보드에서 자세히 보기
      </a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        이 메일은 Referio 월간 성과 요약 메일입니다.
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
      subject: `[Referio] ${partnerName}님의 ${targetMonth} 파트너 활동 리포트`,
      html,
    }),
  })
  return res.ok
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Calculate last month range (KST)
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
    const targetMonth = `${lastMonthStart.getFullYear()}년 ${lastMonthStart.getMonth() + 1}월`

    // Get all active partners with email
    const { data: partners, error: partnerErr } = await supabase
      .from('partners')
      .select('id, name, email')
      .not('email', 'is', null)

    if (partnerErr || !partners) {
      return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 })
    }

    // Get last month referrals grouped by partner+program
    const { data: referrals } = await supabase
      .from('referrals')
      .select('partner_id, advertiser_id, partner_programs!inner(advertisers!inner(company_name, program_name))')
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', lastMonthEnd.toISOString())
      .not('partner_id', 'is', null)

    // Get last month settlements grouped by partner
    const { data: settlements } = await supabase
      .from('settlements')
      .select('partner_id, amount')
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', lastMonthEnd.toISOString())
      .not('partner_id', 'is', null)

    // Build per-partner stats
    const statsMap = new Map<string, {
      totalLeads: number
      totalAmount: number
      programLeads: Map<string, { programName: string; leads: number; amount: number }>
    }>()

    for (const ref of (referrals || [])) {
      if (!ref.partner_id) continue
      if (!statsMap.has(ref.partner_id)) {
        statsMap.set(ref.partner_id, { totalLeads: 0, totalAmount: 0, programLeads: new Map() })
      }
      const stat = statsMap.get(ref.partner_id)!
      stat.totalLeads++

      const pp = Array.isArray(ref.partner_programs) ? ref.partner_programs[0] : ref.partner_programs as { advertisers: { company_name: string; program_name: string | null } }
      const adv = pp ? (Array.isArray(pp.advertisers) ? pp.advertisers[0] : pp.advertisers) : null
      const pName = adv?.program_name || adv?.company_name || '알 수 없음'
      if (!stat.programLeads.has(pName)) stat.programLeads.set(pName, { programName: pName, leads: 0, amount: 0 })
      stat.programLeads.get(pName)!.leads++
    }

    for (const s of (settlements || [])) {
      if (!s.partner_id) continue
      if (!statsMap.has(s.partner_id)) {
        statsMap.set(s.partner_id, { totalLeads: 0, totalAmount: 0, programLeads: new Map() })
      }
      statsMap.get(s.partner_id)!.totalAmount += (s.amount || 0)
    }

    // Only send to partners with at least 1 lead or 1 settlement last month
    const targets = partners.filter(p => statsMap.has(p.id) && p.email)

    let sent = 0
    let skipped = 0

    for (const partner of targets) {
      const check = await canSendEmail(partner.id, 'activity_monthly_report', false)
      if (!check.canSend) {
        skipped++
        await logEmailSent({
          partnerId: partner.id,
          emailType: 'activity_monthly_report',
          isMandatory: false,
          status: 'deferred',
          deferredReason: check.reason,
        })
        continue
      }

      const stat = statsMap.get(partner.id)!
      const programs = Array.from(stat.programLeads.values())

      const ok = await sendMonthlyReportEmail({
        partnerEmail: partner.email!,
        partnerName: partner.name || '파트너',
        targetMonth,
        totalLeads: stat.totalLeads,
        totalSettlementAmount: stat.totalAmount,
        programs,
      })

      await logEmailSent({
        partnerId: partner.id,
        emailType: 'activity_monthly_report',
        isMandatory: false,
        status: ok ? 'sent' : 'failed',
      })

      if (ok) sent++
    }

    console.log(`[Cron monthly-report] sent=${sent} skipped=${skipped} targets=${targets.length} month=${targetMonth}`)
    return NextResponse.json({ sent, skipped, targets: targets.length, month: targetMonth })
  } catch (err) {
    console.error('[Cron monthly-report] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
