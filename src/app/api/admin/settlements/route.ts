import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

interface PartnerGroup {
  partner_id: string;
  partner_name: string;
  partner_email: string;
  bank_name: string | null;
  bank_account: string | null;
  account_holder: string | null;
  has_ssn: boolean;
  total_amount: number;
  pending_amount: number;
  settlement_count: number;
  settlements: SettlementRow[];
}

interface SettlementRow {
  id: string;
  referral_id: string | null;
  referral_name: string | null;
  advertiser_name: string | null;
  amount: number;
  type: string | null;
  status: string;
  settled_at: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const statusFilter = request.nextUrl.searchParams.get('status');
  const advertiserFilter = request.nextUrl.searchParams.get('advertiser_id');

  let query = admin
    .from('settlements')
    .select(`
      *,
      partners (
        id,
        name,
        email,
        bank_name,
        bank_account,
        account_holder,
        ssn_encrypted
      ),
      referrals (
        name
      ),
      advertisers (
        company_name
      )
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (advertiserFilter && advertiserFilter !== 'all') {
    query = query.eq('advertiser_id', advertiserFilter);
  }

  const { data: rawSettlements } = await query;

  // Group settlements by partner
  const partnerMap = new Map<string, PartnerGroup>();

  for (const s of rawSettlements || []) {
    const p = s.partners as {
      id: string;
      name: string;
      email: string;
      bank_name: string | null;
      bank_account: string | null;
      account_holder: string | null;
      ssn_encrypted: string | null;
    } | null;

    const partnerId = p?.id || s.partner_id;

    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, {
        partner_id: partnerId,
        partner_name: p?.name || 'Unknown',
        partner_email: p?.email || '',
        bank_name: p?.bank_name || null,
        bank_account: p?.bank_account || null,
        account_holder: p?.account_holder || null,
        has_ssn: !!p?.ssn_encrypted,
        total_amount: 0,
        pending_amount: 0,
        settlement_count: 0,
        settlements: [],
      });
    }

    const group = partnerMap.get(partnerId)!;
    group.total_amount += s.amount || 0;
    if (s.status === 'pending') {
      group.pending_amount += s.amount || 0;
    }
    group.settlement_count += 1;

    const ref = s.referrals as { name: string } | null;
    const adv = s.advertisers as { company_name: string } | null;
    group.settlements.push({
      id: s.id,
      referral_id: s.referral_id,
      referral_name: ref?.name || null,
      advertiser_name: adv?.company_name || null,
      amount: s.amount || 0,
      type: s.type || null,
      status: s.status,
      settled_at: s.settled_at,
      created_at: s.created_at,
    });
  }

  const partners = Array.from(partnerMap.values()).sort(
    (a, b) => b.pending_amount - a.pending_amount
  );

  // Total stats
  const totalAmount = partners.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPending = partners.reduce((sum, p) => sum + p.pending_amount, 0);
  const totalSettlements = partners.reduce((sum, p) => sum + p.settlement_count, 0);
  const pendingCount = (rawSettlements || []).filter(s => s.status === 'pending').length;

  // Also fetch approved partners for the create form
  // Only select fields needed for the create form — never expose ssn_encrypted
  const { data: approvedPartners } = await admin
    .from('partners')
    .select('id, name, email, bank_name, bank_account, account_holder')
    .eq('status', 'approved')
    .order('name');

  return NextResponse.json({
    partners,
    approved_partners: approvedPartners || [],
    total_stats: {
      partner_count: partners.length,
      total_settlements: totalSettlements,
      total_amount: totalAmount,
      total_pending: totalPending,
      pending_count: pendingCount,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { partner_id, referral_id, amount } = body;

  if (!partner_id || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('settlements').insert({
    partner_id,
    referral_id: referral_id || null,
    amount: parseInt(amount),
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { settlementId, updates } = body;

  if (!settlementId || !updates) {
    return NextResponse.json({ error: 'Missing settlementId or updates' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('settlements')
    .update(updates)
    .eq('id', settlementId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
