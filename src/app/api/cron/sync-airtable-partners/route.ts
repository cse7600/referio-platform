import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AirtableConfig {
  pat: string
  base_id: string
  partner_table_id?: string
  last_partner_synced_at?: string | null
  invite_email?: boolean
  invite_redirect_path?: string
}

interface Integration {
  id: string
  advertiser_id: string
  config: { airtable?: AirtableConfig }
}

interface AirtablePartnerRecord {
  id: string
  fields: Record<string, unknown>
}

// 추천인코드 필드가 formula 필드라 {state, value} 객체로 올 수 있음
function extractCode(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return String((raw as Record<string, unknown>).value).trim()
  }
  return String(raw).trim()
}

// GET /api/cron/sync-airtable-partners
// Vercel Cron 30분 주기 실행
// 1. Airtable 파트너 테이블 → DB 신규 등록
// 2. Supabase Auth 계정 생성 + auth_user_id 연결
// 3. 초대 이메일 발송 (invite_email: true인 경우)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: integrations } = await supabase
    .from('webhook_integrations')
    .select('id, advertiser_id, config')
    .eq('source', 'airtable')
    .eq('is_active', true)

  const partnerSyncIntegrations = ((integrations || []) as Integration[]).filter(
    (i) => i.config?.airtable?.pat && i.config?.airtable?.partner_table_id
  )

  if (!partnerSyncIntegrations.length) {
    return NextResponse.json({ synced: 0, message: 'partner_table_id가 설정된 연동 없음' })
  }

  let totalAdded = 0
  const results: {
    advertiser_id: string
    added: number
    skipped_no_code: number
    emails_sent: number
    error?: string
  }[] = []

  for (const integration of partnerSyncIntegrations) {
    const cfg = integration.config?.airtable!
    const partnerTableId = cfg.partner_table_id!

    try {
      const atPartners = await fetchAllAirtablePartners(cfg.pat, cfg.base_id, partnerTableId)

      // 기존 등록된 파트너 이메일 + 코드 조회
      const { data: existingPrograms } = await supabase
        .from('partner_programs')
        .select('referral_code, partners(id, email)')
        .eq('advertiser_id', integration.advertiser_id)
        .eq('status', 'approved')

      const existingEmails = new Set<string>()
      const existingCodes = new Set<string>()
      type ProgramRow = { referral_code: string; partners: { email: string } | { email: string }[] | null }
      for (const prog of (existingPrograms || []) as unknown as ProgramRow[]) {
        const partnerEmail = Array.isArray(prog.partners) ? prog.partners[0]?.email : prog.partners?.email
        if (partnerEmail) existingEmails.add(partnerEmail.toLowerCase())
        if (prog.referral_code) existingCodes.add(prog.referral_code)
      }

      let added = 0
      let skippedNoCode = 0
      let emailsSent = 0

      for (const record of atPartners) {
        const f = record.fields
        const name = (f['파트너이름'] as string || '').trim()
        const email = (f['이메일'] as string || '').trim().toLowerCase()
        const phone = (f['연락처'] as string || '').trim() || null
        const refCode = extractCode(f['추천인코드(5글자 이내)'])

        if (!email) continue
        if (existingEmails.has(email)) continue // 이미 등록됨

        // 추천인코드 없으면 AT에 코드가 입력될 때까지 대기
        if (!refCode) {
          skippedNoCode++
          continue
        }

        if (existingCodes.has(refCode)) {
          console.warn(`중복 추천코드 ${refCode} (${email}), 스킵`)
          continue
        }

        // 1. partners + partner_programs DB 등록
        const { data: newPartner, error: partnerErr } = await supabase
          .from('partners')
          .upsert({ name, email, phone, status: 'approved' }, { onConflict: 'email' })
          .select('id, auth_user_id')
          .single()

        if (partnerErr || !newPartner) {
          console.error('Partner upsert error:', partnerErr)
          continue
        }

        const { error: progErr } = await supabase
          .from('partner_programs')
          .insert({
            partner_id: newPartner.id,
            advertiser_id: integration.advertiser_id,
            referral_code: refCode,
            status: 'approved',
          })

        if (progErr && progErr.code !== '23505') {
          console.error('Program insert error:', progErr)
          continue
        }

        existingCodes.add(refCode)
        existingEmails.add(email)
        added++

        // 2. 이메일 발송 옵션이 켜져 있으면 Auth 계정 생성 + 초대 이메일
        if (cfg.invite_email) {
          const sent = await createAuthAndSendInvite(supabase, {
            partnerId: newPartner.id,
            name,
            email,
            refCode,
            redirectPath: cfg.invite_redirect_path || '/signup',
          })
          if (sent) emailsSent++
        }
      }

      // last_partner_synced_at 업데이트
      await supabase
        .from('webhook_integrations')
        .update({
          config: {
            ...integration.config,
            airtable: { ...cfg, last_partner_synced_at: new Date().toISOString() },
          },
        })
        .eq('id', integration.id)

      totalAdded += added
      results.push({ advertiser_id: integration.advertiser_id, added, skipped_no_code: skippedNoCode, emails_sent: emailsSent })
    } catch (err) {
      console.error(`Partner sync error for ${integration.advertiser_id}:`, err)
      results.push({ advertiser_id: integration.advertiser_id, added: 0, skipped_no_code: 0, emails_sent: 0, error: String(err) })
    }
  }

  return NextResponse.json({ success: true, totalAdded, results })
}

async function createAuthAndSendInvite(
  supabase: ReturnType<typeof createAdminClient>,
  opts: { partnerId: string; name: string; email: string; refCode: string; redirectPath: string }
): Promise<boolean> {
  const SITE_URL = 'https://referio.puzl.co.kr'
  const { partnerId, name, email, refCode, redirectPath } = opts

  try {
    // Auth 계정 생성 (이미 있으면 기존 계정 사용)
    let authUserId: string | null = null

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError) {
      if (createError.message.includes('already') || createError.message.includes('exists')) {
        const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = userList?.users?.find((u) => u.email === email)
        if (existing) authUserId = existing.id
      } else {
        console.error(`Auth 생성 실패 (${email}):`, createError.message)
        return false
      }
    } else {
      authUserId = created.user.id
    }

    if (!authUserId) return false

    // auth_user_id 연결
    await supabase.from('partners').update({ auth_user_id: authUserId }).eq('id', partnerId)

    // Recovery 링크 생성
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE_URL}${redirectPath}` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`Recovery 링크 생성 실패 (${email}):`, linkError?.message)
      return false
    }

    const actionLink = linkData.properties.action_link

    // 초대 이메일 발송
    const html = buildInviteEmailHtml(name, actionLink, refCode)
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.warn('RESEND_API_KEY 없음, 이메일 스킵')
      return false
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Referio <${process.env.FROM_EMAIL || 'noreply@updates.puzl.co.kr'}>`,
        to: email,
        subject: '[한화비전 키퍼메이트] Referio 파트너 포털 계정 안내',
        html,
      }),
    })

    if (!res.ok) {
      console.error(`이메일 발송 실패 (${email}):`, await res.text())
      return false
    }

    return true
  } catch (err) {
    console.error(`createAuthAndSendInvite 오류 (${email}):`, err)
    return false
  }
}

function buildInviteEmailHtml(name: string, actionLink: string, referralCode: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:40px auto;">
  <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <table style="width:100%;"><tr>
      <td><span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Referio</span></td>
      <td style="text-align:right;"><span style="color:#64748b;font-size:12px;">파트너 포털</span></td>
    </tr></table>
  </div>
  <div style="background:#1e3a8a;padding:28px 32px;">
    <p style="margin:0 0 6px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">한화비전 키퍼메이트</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.4;">파트너 포털 계정이 준비됐습니다 🎉</h1>
  </div>
  <div style="background:#fff;padding:36px 32px;">
    <p style="margin:0 0 8px;color:#111827;font-size:16px;font-weight:600;">${name}님, 안녕하세요.</p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.8;">
      한화비전 키퍼메이트 파트너로 등록되셨습니다.<br>
      <strong>Referio 파트너 포털</strong>에서 추천 현황, 커미션, 활동 데이터를 직접 확인하고 관리하실 수 있습니다.
    </p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e3a8a;">✅ 파트너 등록 정보</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">파트너 상태</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#15803d;">✓ 승인 완료</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">추천 코드</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1e3a8a;letter-spacing:1px;">${referralCode}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#111827;">시작하기 (2단계)</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;padding:10px 0;width:40px;">
          <div style="width:30px;height:30px;background:#1e3a8a;border-radius:50%;text-align:center;line-height:30px;color:#fff;font-size:13px;font-weight:700;">1</div>
        </td>
        <td style="vertical-align:top;padding:10px 0 10px 14px;">
          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#111827;">아래 버튼 클릭 → 비밀번호 설정</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">링크는 24시간 유효합니다</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:10px 0;width:40px;">
          <div style="width:30px;height:30px;background:#1e3a8a;border-radius:50%;text-align:center;line-height:30px;color:#fff;font-size:13px;font-weight:700;">2</div>
        </td>
        <td style="vertical-align:top;padding:10px 0 10px 14px;">
          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#111827;">이메일 + 새 비밀번호로 로그인</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">로그인 주소: <strong>referio.puzl.co.kr</strong></p>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${actionLink}" style="display:inline-block;padding:16px 44px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">
        비밀번호 설정하고 포털 입장하기 →
      </a>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;">
      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;">버튼이 작동하지 않으면 아래 주소를 브라우저에 복사해주세요</p>
      <p style="margin:0;color:#6b7280;font-size:11px;word-break:break-all;line-height:1.6;">${actionLink}</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">이 메일은 한화비전 키퍼메이트 파트너 포털 계정 안내입니다.</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">문의: <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a></p>
  </div>
</div>
</body>
</html>`
}

async function fetchAllAirtablePartners(
  pat: string,
  baseId: string,
  tableId: string
): Promise<AirtablePartnerRecord[]> {
  const all: AirtablePartnerRecord[] = []
  let offset: string | undefined

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${pat}` } })
    if (!res.ok) throw new Error(`Airtable API ${res.status}`)

    const data = await res.json() as { records: AirtablePartnerRecord[]; offset?: string }
    all.push(...(data.records || []))
    offset = data.offset
  } while (offset)

  return all
}
