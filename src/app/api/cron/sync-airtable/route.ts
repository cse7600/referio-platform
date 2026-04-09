import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 })
  }

  const supabase = createAdminClient()

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
  supabase: ReturnType<typeof createAdminClient>,
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

async function resolveCommission(
  supabase: ReturnType<typeof createAdminClient>,
  advertiserId: string,
  programLead: number,
  programContract: number
): Promise<{ leadCommission: number; contractCommission: number }> {
  let leadCommission = programLead
  let contractCommission = programContract

  // Fallback 1: active campaign
  if (!leadCommission || !contractCommission) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('valid_amount, contract_amount')
      .eq('advertiser_id', advertiserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (campaign) {
      if (!leadCommission) leadCommission = campaign.valid_amount || 0
      if (!contractCommission) contractCommission = campaign.contract_amount || 0
    }
  }

  // Fallback 2: advertiser defaults
  if (!leadCommission || !contractCommission) {
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('default_lead_commission, default_contract_commission')
      .eq('id', advertiserId)
      .maybeSingle()
    if (advertiser) {
      if (!leadCommission) leadCommission = advertiser.default_lead_commission || 0
      if (!contractCommission) contractCommission = advertiser.default_contract_commission || 0
    }
  }

  return { leadCommission, contractCommission }
}

async function processRecord(
  supabase: ReturnType<typeof createAdminClient>,
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
    .select('partner_id, lead_commission, contract_commission')
    .eq('referral_code', refCode)
    .eq('advertiser_id', integration.advertiser_id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!program) return 'skipped'

  const partnerId = program.partner_id

  // Resolve commission with fallback chain
  const { leadCommission, contractCommission } = await resolveCommission(
    supabase,
    integration.advertiser_id,
    program.lead_commission || 0,
    program.contract_commission || 0
  )

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
    // Fix ₩0 valid settlement
    if (leadCommission > 0) {
      await supabase
        .from('settlements')
        .update({ amount: leadCommission })
        .eq('referral_id', existingReferral.id)
        .eq('type', 'valid')
        .eq('amount', 0)
    }
    // Ensure contract settlement exists when action is contract
    if (action === 'contract') {
      const { data: existingContract } = await supabase
        .from('settlements')
        .select('id')
        .eq('referral_id', existingReferral.id)
        .eq('type', 'contract')
        .maybeSingle()

      if (existingContract) {
        if (contractCommission > 0) {
          await supabase
            .from('settlements')
            .update({ amount: contractCommission })
            .eq('id', existingContract.id)
            .eq('amount', 0)
        }
      } else {
        await supabase.from('settlements').insert({
          partner_id: partnerId,
          advertiser_id: integration.advertiser_id,
          referral_id: existingReferral.id,
          type: 'contract',
          amount: contractCommission,
          status: 'pending',
        })
      }
    }
    return 'updated'
  }

  // Insert new referral
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

  const { data: inserted, error } = await supabase
    .from('referrals')
    .insert(insertData)
    .select('id')
    .single()

  if (error) {
    if (error.code !== '23505') console.error('Referral insert error:', error)
    return error.code === '23505' ? 'updated' : 'error'
  }

  // Fix ₩0 valid settlement created by DB trigger
  if (inserted?.id && (action === 'valid' || action === 'contract') && leadCommission > 0) {
    await supabase
      .from('settlements')
      .update({ amount: leadCommission })
      .eq('referral_id', inserted.id)
      .eq('type', 'valid')
      .eq('amount', 0)
  }
  // Create contract settlement
  if (inserted?.id && action === 'contract') {
    await supabase.from('settlements').insert({
      partner_id: partnerId,
      advertiser_id: integration.advertiser_id,
      referral_id: inserted.id,
      type: 'contract',
      amount: contractCommission,
      status: 'pending',
    })
  }

  return 'inserted'
}
