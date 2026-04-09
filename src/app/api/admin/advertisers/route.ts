import { NextResponse } from 'next/server';
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

  const { data: adList } = await admin
    .from('advertisers')
    .select('*')
    .order('created_at', { ascending: false });

  if (!adList) {
    return NextResponse.json({ advertisers: [] });
  }

  const rows = await Promise.all(
    adList.map(async (ad) => {
      const { count: partnerCount } = await admin
        .from('partner_programs')
        .select('*', { count: 'exact', head: true })
        .eq('advertiser_id', ad.id);

      const { data: referrals } = await admin
        .from('referrals')
        .select('id, is_valid, contract_status')
        .eq('advertiser_id', ad.id);

      const referral_count = referrals?.length || 0;
      const valid_count = referrals?.filter(r => r.is_valid === true).length || 0;
      const contract_count = referrals?.filter(r => r.contract_status === 'completed').length || 0;

      const { data: settlements } = await admin
        .from('settlements')
        .select('status, amount')
        .eq('advertiser_id', ad.id);

      const pending_settlement = settlements
        ?.filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const completed_settlement = settlements
        ?.filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      const { data: campaign } = await admin
        .from('campaigns')
        .select('name, valid_amount, contract_amount, is_active')
        .eq('advertiser_id', ad.id)
        .eq('is_active', true)
        .maybeSingle();

      return {
        ...ad,
        partner_count: partnerCount || 0,
        referral_count,
        valid_count,
        contract_count,
        pending_settlement,
        completed_settlement,
        campaign_name: campaign?.name || null,
        valid_amount: campaign?.valid_amount || null,
        contract_amount: campaign?.contract_amount || null,
        campaign_active: campaign?.is_active || null,
      };
    })
  );

  return NextResponse.json({ advertisers: rows });
}
