import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Verify the current user is the master admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
    if (!masterEmail || user.email !== masterEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Use service_role client to bypass RLS
    const admin = createAdminClient();

    // 3. Fetch all stats in parallel
    const [partnersRes, referralsRes, settlementsRes] = await Promise.all([
      admin.from('partners').select('id, status'),
      admin.from('referrals').select('id, is_valid, contract_status'),
      admin.from('settlements').select('id, status, amount'),
    ]);

    const partners = partnersRes.data || [];
    const referrals = referralsRes.data || [];
    const settlements = settlementsRes.data || [];

    return NextResponse.json({
      partners: {
        total: partners.length,
        pending: partners.filter(p => p.status === 'pending').length,
        approved: partners.filter(p => p.status === 'approved').length,
      },
      referrals: {
        total: referrals.length,
        valid: referrals.filter(r => r.is_valid === true).length,
        contracted: referrals.filter(r => r.contract_status === 'completed').length,
      },
      settlements: {
        total: settlements.length,
        pending: settlements.filter(s => s.status === 'pending').length,
        completed: settlements.filter(s => s.status === 'completed').length,
        totalAmount: settlements.reduce((sum, s) => sum + (s.amount || 0), 0),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
