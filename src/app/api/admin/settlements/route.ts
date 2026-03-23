import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const statusFilter = request.nextUrl.searchParams.get('status');

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
        account_holder
      ),
      referrals (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data } = await query;

  // Also fetch approved partners for the create form
  const { data: partners } = await admin
    .from('partners')
    .select('*')
    .eq('status', 'approved')
    .order('name');

  return NextResponse.json({
    settlements: data || [],
    partners: partners || [],
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
