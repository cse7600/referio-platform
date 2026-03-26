import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AirtableConfig {
  pat: string
  base_id: string
  partner_table_id?: string
  last_partner_synced_at?: string | null
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

// Generates a random 5-char alphanumeric code
function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// GET /api/cron/sync-airtable-partners
// Called by Vercel Cron — syncs new partners from Airtable partner table into DB
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all active airtable integrations that have a partner_table_id configured
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
  const results: { advertiser_id: string; added: number; updated_codes: number; error?: string }[] = []

  for (const integration of partnerSyncIntegrations) {
    const cfg = integration.config?.airtable!
    const partnerTableId = cfg.partner_table_id!

    try {
      // 1. Fetch all partners from Airtable partner table
      const atPartners = await fetchAllAirtablePartners(cfg.pat, cfg.base_id, partnerTableId)

      // 2. Get all existing partner emails for this advertiser from DB
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
      let updatedCodes = 0

      for (const record of atPartners) {
        const f = record.fields
        const name = (f['파트너이름'] as string || '').trim()
        const email = (f['이메일'] as string || '').trim().toLowerCase()
        const phone = (f['연락처'] as string || '').trim() || null
        const refCode = (f['ref코드'] as string || '').trim()

        if (!email) continue

        const isNewPartner = !existingEmails.has(email)
        const needsCode = !refCode

        if (!isNewPartner && !needsCode) continue // already synced, skip

        // Generate unique code if needed
        let codeToUse = refCode
        if (!codeToUse) {
          let attempt = 0
          do {
            codeToUse = generateRefCode()
            attempt++
          } while (existingCodes.has(codeToUse) && attempt < 10)
          existingCodes.add(codeToUse)
        }

        if (isNewPartner) {
          // Insert partner + partner_program
          const { data: newPartner, error: partnerErr } = await supabase
            .from('partners')
            .upsert({ name, email, phone, status: 'approved' }, { onConflict: 'email' })
            .select('id')
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
              referral_code: codeToUse,
              status: 'approved',
            })

          if (progErr && progErr.code !== '23505') {
            console.error('Program insert error:', progErr)
            continue
          }

          added++
        }

        // Update Airtable with the ref code (if it was missing)
        if (needsCode) {
          await updateAirtableRefCode(cfg.pat, cfg.base_id, partnerTableId, record.id, codeToUse)
          updatedCodes++
        }
      }

      // Update last_partner_synced_at
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
      results.push({ advertiser_id: integration.advertiser_id, added, updated_codes: updatedCodes })
    } catch (err) {
      console.error(`Partner sync error for ${integration.advertiser_id}:`, err)
      results.push({ advertiser_id: integration.advertiser_id, added: 0, updated_codes: 0, error: String(err) })
    }
  }

  return NextResponse.json({ success: true, totalAdded, results })
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

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (!res.ok) throw new Error(`Airtable API ${res.status}`)

    const data = await res.json() as { records: AirtablePartnerRecord[]; offset?: string }
    all.push(...(data.records || []))
    offset = data.offset
  } while (offset)

  return all
}

async function updateAirtableRefCode(
  pat: string,
  baseId: string,
  tableId: string,
  recordId: string,
  code: string
): Promise<void> {
  await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { 'ref코드': code } }),
  })
}
