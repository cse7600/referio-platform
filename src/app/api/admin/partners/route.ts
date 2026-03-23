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

export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: partnersData } = await admin
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (!partnersData) {
    return NextResponse.json({ partners: [] });
  }

  // Compute stats per partner
  const partnersWithStats = await Promise.all(
    partnersData.map(async (partner) => {
      const { data: referrals } = await admin
        .from('referrals')
        .select('id, is_valid, contract_status, created_at')
        .eq('partner_id', partner.id);

      const total_referrals = referrals?.length || 0;
      const valid_referrals = referrals?.filter(r => r.is_valid === true).length || 0;
      const completed_contracts = referrals?.filter(r => r.contract_status === 'completed').length || 0;
      const conversion_rate = total_referrals > 0
        ? Math.round((completed_contracts / total_referrals) * 100)
        : 0;

      const sortedReferrals = referrals?.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const last_referral_at = sortedReferrals?.[0]?.created_at || null;

      return {
        ...partner,
        total_referrals,
        valid_referrals,
        completed_contracts,
        conversion_rate,
        last_referral_at,
        rank: 0,
      };
    })
  );

  // Compute ranks
  const sorted = [...partnersWithStats].sort((a, b) => b.completed_contracts - a.completed_contracts);
  sorted.forEach((p, i) => { p.rank = i + 1; });

  return NextResponse.json({ partners: partnersWithStats });
}

export async function PATCH(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { partnerId, updates } = body;

  if (!partnerId || !updates) {
    return NextResponse.json({ error: 'Missing partnerId or updates' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('partners')
    .update(updates)
    .eq('id', partnerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
