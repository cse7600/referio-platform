/**
 * Sync Airtable partner settlement info (bank, SSN) to Supabase partners table.
 * Target: Keepermate (advertiser_id = ab7da1e1-2bef-4065-8c84-88c037f2b4dc)
 *
 * Usage: node scripts/sync-airtable-settlement.js
 */

const crypto = require('crypto');

// ── Credentials (from environment variables) ──
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appFM6alzmqS4RS4G';
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblAp6jZVz4tB5jxU';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqdnirtgmevhobmycxzn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADVERTISER_UUID = 'ab7da1e1-2bef-4065-8c84-88c037f2b4dc';

if (!AIRTABLE_PAT || !SUPABASE_SERVICE_KEY) {
  console.error('Required env vars: AIRTABLE_PAT, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── SSN Encryption (AES-256-GCM) ──
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SSN_KEY = Buffer.from('f29d71cfc271b1e89486cba93d2367e6581c1ed1e039447e693a547395920d3b', 'hex');

function encryptSSN(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SSN_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

// ── Airtable API ──
async function fetchAirtableRecords() {
  const records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });

    if (!res.ok) {
      throw new Error(`Airtable API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset || null;
  } while (offset);

  return records;
}

// ── Supabase helpers ──
async function supabaseQuery(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=minimal',
      ...options.headers,
    },
  });
  return res;
}

async function findPartnerByRefCode(refCode) {
  const res = await supabaseQuery(
    `partner_programs?advertiser_id=eq.${ADVERTISER_UUID}&referral_code=eq.${encodeURIComponent(refCode)}&select=partner_id`,
    { headers: { Prefer: 'return=representation' } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.length > 0 ? rows[0].partner_id : null;
}

async function updatePartner(partnerId, data) {
  const res = await supabaseQuery(
    `partners?id=eq.${partnerId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
      prefer: 'return=representation',
      headers: { Prefer: 'return=representation' },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update failed for ${partnerId}: ${res.status} ${text}`);
  }
  return await res.json();
}

// ── Main ──
async function main() {
  console.log('=== Airtable → Supabase Settlement Sync ===\n');

  // 1. Fetch Airtable records
  console.log('Fetching Airtable records...');
  const allRecords = await fetchAirtableRecords();
  console.log(`Total Airtable records: ${allRecords.length}`);

  // Filter: must have bank_name or bank_account
  const targets = allRecords.filter((r) => {
    const f = r.fields;
    return f['은행명'] || f['계좌번호'];
  });
  console.log(`Records with settlement info: ${targets.length}\n`);

  const results = { success: [], failed: [], noMatch: [] };

  for (const record of targets) {
    const f = record.fields;
    const refCode = f['ref코드'];
    const bankName = f['은행명'] || null;
    const bankAccount = f['계좌번호'] || null;
    const accountHolder = f['예금주'] || null;
    const ssn = f['주민등록번호'] || null;
    const name = f['이름'] || f['Name'] || refCode;

    if (!refCode) {
      results.failed.push({ name, reason: 'No ref code' });
      continue;
    }

    // 2. Find partner in Supabase
    const partnerId = await findPartnerByRefCode(refCode);
    if (!partnerId) {
      results.noMatch.push({ refCode, name });
      continue;
    }

    // 3. Build update payload
    const updateData = {};
    if (bankName) updateData.bank_name = bankName;
    if (bankAccount) updateData.bank_account = String(bankAccount);
    if (accountHolder) updateData.account_holder = accountHolder;
    if (ssn) updateData.ssn_encrypted = encryptSSN(String(ssn));

    if (Object.keys(updateData).length === 0) {
      results.failed.push({ name, refCode, reason: 'No data to update' });
      continue;
    }

    // 4. Update Supabase
    try {
      await updatePartner(partnerId, updateData);
      results.success.push({ refCode, name, partnerId, fields: Object.keys(updateData) });
      console.log(`  ✓ ${refCode} (${name}) → updated: ${Object.keys(updateData).join(', ')}`);
    } catch (err) {
      results.failed.push({ refCode, name, reason: err.message });
      console.log(`  ✗ ${refCode} (${name}) → ${err.message}`);
    }
  }

  // 5. Report
  console.log('\n=== Results ===');
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed:  ${results.failed.length}`);
  console.log(`No match (ref code not in Supabase): ${results.noMatch.length}`);

  if (results.noMatch.length > 0) {
    console.log('\nUnmatched ref codes:');
    results.noMatch.forEach((r) => console.log(`  - ${r.refCode} (${r.name})`));
  }

  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach((r) => console.log(`  - ${r.refCode || r.name}: ${r.reason}`));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
