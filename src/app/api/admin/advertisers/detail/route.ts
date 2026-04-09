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

  const advertiserId = request.nextUrl.searchParams.get('id');
  if (!advertiserId) {
    return NextResponse.json({ error: 'Missing advertiser id' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Partner programs
  const { data: pp } = await admin
    .from('partner_programs')
    .select(`
      partner_id,
      referral_code,
      status,
      partners (id, name, email, status, tier)
    `)
    .eq('advertiser_id', advertiserId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partners = (pp || []).map((p: any) => {
    const partner = Array.isArray(p.partners) ? p.partners[0] : p.partners;
    return {
      id: p.partner_id,
      name: partner?.name || '-',
      email: partner?.email || '-',
      status: p.status || partner?.status || '-',
      tier: partner?.tier || '-',
      referral_code: p.referral_code,
    };
  });

  // Referrals
  const { data: refs } = await admin
    .from('referrals')
    .select(`
      id, name, phone, contract_status, is_valid, created_at,
      partners (name)
    `)
    .eq('advertiser_id', advertiserId)
    .order('created_at', { ascending: false })
    .limit(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const referrals = (refs || []).map((r: any) => {
    const partner = Array.isArray(r.partners) ? r.partners[0] : r.partners;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      contract_status: r.contract_status,
      is_valid: r.is_valid,
      created_at: r.created_at,
      partner_name: partner?.name || null,
    };
  });

  return NextResponse.json({ partners, referrals });
}
