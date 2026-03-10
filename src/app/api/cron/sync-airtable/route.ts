import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AirtableConfig {
  pat: string
  base_id: string
  table_id: string
  last_synced_at: string | null
  name_field: string
  phone_field: string
  ref_code_field: string
  status_field: string
  valid_values: string[]
  contract_values: string[]
  invalid_values: string[]
}

interface Integration {
  id: string
  advertiser_id: string
  config: { airtable?: AirtableConfig }
}

interface AirtableRecord {
  id: string
  fields: Record<string, string>
}

// GET /api/cron/sync-airtable
// Called by Vercel Cron every 5 minutes
// Polls Airtable for recently modified records and syncs to Referio
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get all active airtable integrations that have PAT (auto-sync mode)
  const { data: integrations } = await supabase
    .from('webhook_integrations')
    .select('id, advertiser_id, config')
    .eq('source', 'airtable')
    .eq('is_active', true)

  const autoSyncIntegrations = (integrations || []).filter(
    (i: Integration) => i.config?.airtable?.pat
  ) as Integration[]

  if (!autoSyncIntegrations.length) {
    return NextResponse.json({ synced: 0, message: '자동 동기화 연동 없음' })
  }

  let totalProcessed = 0
  const results: { id: string; processed: number; error?: string }[] = []

  for (const integration of autoSyncIntegrations) {
    const cfg = integration.config?.airtable
    if (!cfg?.pat || !cfg?.base_id || !cfg?.table_id) continue

    try {
      // Calculate time window: from last sync (or 10 min ago if first time)
      const since = cfg.last_synced_at
        ? new Date(cfg.last_synced_at).toISOString()
        : new Date(Date.now() - 10 * 60 * 1000).toISOString()

      const formula = encodeURIComponent(`IS_AFTER(LAST_MODIFIED_TIME(), '${since}')`)
      const tableIdOrName = encodeURIComponent(cfg.table_id)

      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${cfg.base_id}/${tableIdOrName}?filterByFormula=${formula}&maxRecords=100`,
        { headers: { Authorization: `Bearer ${cfg.pat}` } }
      )

      if (!airtableRes.ok) {
        results.push({ id: integration.id, processed: 0, error: `Airtable API ${airtableRes.status}` })
        continue
      }

      const { records } = await airtableRes.json() as { records: AirtableRecord[] }
      if (!records?.length) {
        await updateLastSynced(supabase, integration, cfg)
        results.push({ id: integration.id, processed: 0 })
        continue
      }

      let count = 0
      for (const record of records) {
        const result = await processRecord(supabase, integration, cfg, record)
        if (result === 'inserted' || result === 'updated') count++
      }

      totalProcessed += count
      await updateLastSynced(supabase, integration, cfg)
      results.push({ id: integration.id, processed: count })
    } catch (err) {
      console.error(`Sync error for integration ${integration.id}:`, err)
      results.push({ id: integration.id, processed: 0, error: String(err) })
    }
  }

  return NextResponse.json({ success: true, totalProcessed, results })
}

async function updateLastSynced(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  integration: Integration,
  cfg: AirtableConfig
) {
  await supabase
    .from('webhook_integrations')
    .update({
      config: {
        ...integration.config,
        airtable: { ...cfg, last_synced_at: new Date().toISOString() },
      },
    })
    .eq('id', integration.id)
}

async function processRecord(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  integration: Integration,
  cfg: AirtableConfig,
  record: AirtableRecord
): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {
  const fields = record.fields || {}
  const name = fields[cfg.name_field]
  const phone = fields[cfg.phone_field]
  const refCode = fields[cfg.ref_code_field]
  const status = fields[cfg.status_field]

  // Only sync records with a Referio-issued referral code
  if (!refCode) return 'skipped'

  const { data: program } = await supabase
    .from('partner_programs')
    .select('partner_id')
    .eq('referral_code', refCode)
    .eq('advertiser_id', integration.advertiser_id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!program) return 'skipped'

  const partnerId = program.partner_id

  // Determine status action
  let updateData: Record<string, unknown> = {}
  let action = 'none'

  if (status && cfg.valid_values?.includes(status)) {
    updateData = { is_valid: true }
    action = 'valid'
  } else if (status && cfg.contract_values?.includes(status)) {
    updateData = { is_valid: true, contract_status: 'completed' }
    action = 'contract'
  } else if (status && cfg.invalid_values?.includes(status)) {
    updateData = { is_valid: false }
    action = 'invalid'
  }

  // Check for existing referral
  let existingReferral: { id: string; partner_id: string | null } | null = null

  const { data: byRecordId } = await supabase
    .from('referrals')
    .select('id, partner_id')
    .eq('airtable_record_id', record.id)
    .eq('advertiser_id', integration.advertiser_id)
    .maybeSingle()

  existingReferral = byRecordId

  if (!existingReferral && phone) {
    const { data: byPhone } = await supabase
      .from('referrals')
      .select('id, partner_id')
      .eq('phone', phone)
      .eq('advertiser_id', integration.advertiser_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    existingReferral = byPhone
  }

  if (existingReferral) {
    if (action !== 'none') {
      const { error } = await supabase
        .from('referrals')
        .update(updateData)
        .eq('id', existingReferral.id)
      if (error) {
        console.error('Referral update error:', error)
        return 'error'
      }
    }
    return 'updated'
  }

  // Insert — partnerId is always non-null here
  const insertData: Record<string, unknown> = {
    advertiser_id: integration.advertiser_id,
    name: name || '이름 없음',
    phone: phone || null,
    referral_code_input: refCode,
    partner_id: partnerId,
    airtable_record_id: record.id,
    contract_status: action === 'contract' ? 'completed' : 'pending',
    is_valid: action === 'valid' || action === 'contract' ? true
      : action === 'invalid' ? false : null,
  }

  const { error } = await supabase.from('referrals').insert(insertData)
  if (error) {
    if (error.code !== '23505') console.error('Referral insert error:', error)
    return error.code === '23505' ? 'updated' : 'error'
  }
  return 'inserted'
}
