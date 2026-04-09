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

export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data } = await admin
    .from('referrals')
    .select(`
      *,
      partners (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  return NextResponse.json({ referrals: data || [] });
}

export async function PATCH(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { referralId, updates } = body;

  if (!referralId || !updates) {
    return NextResponse.json({ error: 'Missing referralId or updates' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('referrals')
    .update(updates)
    .eq('id', referralId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
