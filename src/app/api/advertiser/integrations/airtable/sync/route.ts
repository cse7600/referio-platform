import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdvertiserSession } from '@/lib/auth'

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

interface AirtableRecord {
  id: string
  fields: Record<string, string>
}

type RecordResult = {
  id: string
  action: 'inserted' | 'updated' | 'skipped' | 'error'
  reason?: string
  error?: string
}

// POST /api/advertiser/integrations/airtable/sync
// Triggers an immediate sync for the current advertiser (manual "sync now")
export async function POST() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: integration } = await supabase
      .from('webhook_integrations')
      .select('id, advertiser_id, config')
      .eq('advertiser_id', session.advertiserUuid)
      .eq('source', 'airtable')
      .eq('is_active', true)
      .maybeSingle()

    if (!integration) {
      return NextResponse.json({ error: '연동 설정을 찾을 수 없습니다' }, { status: 404 })
    }

    const cfg = integration.config?.airtable as AirtableConfig | undefined
    if (!cfg?.pat || !cfg?.base_id || !cfg?.table_id) {
      return NextResponse.json({ error: '자동 동기화 설정이 없습니다' }, { status: 400 })
    }

    // Manual sync: fetch ALL records (no date filter)
    const tableId = encodeURIComponent(cfg.table_id)

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${cfg.base_id}/${tableId}?maxRecords=500`,
      { headers: { Authorization: `Bearer ${cfg.pat}` } }
    )

    if (!airtableRes.ok) {
      const errText = await airtableRes.text()
      return NextResponse.json({ error: 'Airtable 연결 실패', detail: errText }, { status: 500 })
    }

    const { records } = await airtableRes.json() as { records: AirtableRecord[] }

    if (!records?.length) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        message: 'Airtable에서 레코드를 찾지 못했습니다',
        debug: { base_id: cfg.base_id, table_id: cfg.table_id },
      })
    }

    // Show field names from first record for debugging
    const sampleFields = Object.keys(records[0]?.fields || {})

    // Fetch partner codes for this advertiser (for debug comparison)
    const { data: partnerCodes } = await supabase
      .from('partner_programs')
      .select('referral_code, status')
      .eq('advertiser_id', integration.advertiser_id)
      .limit(20)

    const results: RecordResult[] = []
    for (const record of records) {
      const result = await processRecord(supabase, integration, cfg, record)
      results.push(result)
    }

    const inserted = results.filter(r => r.action === 'inserted').length
    const updated = results.filter(r => r.action === 'updated').length
    const skipped = results.filter(r => r.action === 'skipped').length
    const errors = results.filter(r => r.action === 'error').length

    // Update last_synced_at
    await supabase
      .from('webhook_integrations')
      .update({
        config: {
          ...integration.config,
          airtable: { ...cfg, last_synced_at: new Date().toISOString() },
        },
      })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      total: records.length,
      inserted,
      updated,
      skipped,
      errors,
      debug: {
        configFields: {
          name_field: cfg.name_field,
          phone_field: cfg.phone_field,
          ref_code_field: cfg.ref_code_field,
          status_field: cfg.status_field,
          valid_values: cfg.valid_values,
          contract_values: cfg.contract_values,
          invalid_values: cfg.invalid_values,
        },
        sampleAirtableFields: sampleFields,
        partnerCodesInDB: partnerCodes?.map(p => `${p.referral_code} (${p.status})`),
        details: results,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다', detail: String(err) }, { status: 500 })
  }
}

async function processRecord(
  supabase: ReturnType<typeof createAdminClient>,
  integration: { id: string; advertiser_id: string; config: Record<string, unknown> },
  cfg: AirtableConfig,
  record: AirtableRecord
): Promise<RecordResult> {
  const fields = record.fields || {}
  const name = fields[cfg.name_field]
  const phone = fields[cfg.phone_field]
  const refCode = fields[cfg.ref_code_field]
  const status = fields[cfg.status_field]

  // Only sync records that have a referral code issued by Referio
  if (!refCode) {
    return { id: record.id, action: 'skipped', reason: `추천코드 없음 (field: "${cfg.ref_code_field}", value: ${refCode ?? 'undefined'})` }
  }

  // Lookup partner by referral code — skip if not a Referio-issued code
  const { data: program } = await supabase
    .from('partner_programs')
    .select('partner_id, lead_commission, contract_commission')
    .eq('referral_code', refCode)
    .eq('advertiser_id', integration.advertiser_id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!program) {
    return { id: record.id, action: 'skipped', reason: `Referio 미발급 코드: "${refCode}"` }
  }

  const partnerId = program.partner_id

  // Resolve commission: partner_programs → campaigns → advertisers.default_*
  let leadCommission: number = program.lead_commission || 0
  let contractCommission: number = program.contract_commission || 0

  if (!leadCommission || !contractCommission) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('valid_amount, contract_amount')
      .eq('advertiser_id', integration.advertiser_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (campaign) {
      if (!leadCommission) leadCommission = campaign.valid_amount || 0
      if (!contractCommission) contractCommission = campaign.contract_amount || 0
    }
  }

  // Final fallback: advertisers.default_lead_commission / default_contract_commission
  if (!leadCommission || !contractCommission) {
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('default_lead_commission, default_contract_commission')
      .eq('id', integration.advertiser_id)
      .maybeSingle()
    if (advertiser) {
      if (!leadCommission) leadCommission = advertiser.default_lead_commission || 0
      if (!contractCommission) contractCommission = advertiser.default_contract_commission || 0
    }
  }

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

  // Check for existing referral by airtable_record_id
  let existingReferral: { id: string } | null = null

  const { data: byRecordId } = await supabase
    .from('referrals')
    .select('id')
    .eq('airtable_record_id', record.id)
    .eq('advertiser_id', integration.advertiser_id)
    .maybeSingle()

  existingReferral = byRecordId

  // Fallback: match by phone
  if (!existingReferral && phone) {
    const { data: byPhone } = await supabase
      .from('referrals')
      .select('id')
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
        return { id: record.id, action: 'error', error: `update: ${error.code} ${error.message}` }
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
        // Update ₩0 contract settlement
        if (contractCommission > 0) {
          await supabase
            .from('settlements')
            .update({ amount: contractCommission })
            .eq('id', existingContract.id)
            .eq('amount', 0)
        }
      } else {
        // Create missing contract settlement
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
    return { id: record.id, action: 'updated' }
  }

  // Insert new referral — partnerId is always non-null here
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
    if (error.code === '23505') {
      return { id: record.id, action: 'updated', reason: '중복 레코드, insert 스킵' }
    }
    return { id: record.id, action: 'error', error: `insert: ${error.code} ${error.message}` }
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
  // Create contract settlement (DB trigger does not create this)
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

  return { id: record.id, action: 'inserted' }
}
