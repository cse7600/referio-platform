import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const partnerId = request.nextUrl.searchParams.get('partner_id');
  if (!partnerId) {
    return NextResponse.json({ referrals: [] });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from('referrals')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('is_valid', true)
    .order('created_at', { ascending: false });

  return NextResponse.json({ referrals: data || [] });
}
