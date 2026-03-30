import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSettlementInfoRequestEmail } from '@/lib/email';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { partner_ids } = body as { partner_ids: string[] };

  if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
    return NextResponse.json({ error: 'partner_ids is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch partner info
  const { data: partners, error: partnerError } = await admin
    .from('partners')
    .select('id, name, email')
    .in('id', partner_ids);

  if (partnerError) {
    return NextResponse.json({ error: partnerError.message }, { status: 500 });
  }

  // Fetch pending settlement amounts per partner
  const { data: settlements, error: settError } = await admin
    .from('settlements')
    .select('partner_id, amount')
    .in('partner_id', partner_ids)
    .eq('status', 'pending');

  if (settError) {
    return NextResponse.json({ error: settError.message }, { status: 500 });
  }

  // Aggregate pending amounts by partner
  const pendingByPartner: Record<string, number> = {};
  for (const s of settlements || []) {
    pendingByPartner[s.partner_id] = (pendingByPartner[s.partner_id] || 0) + (s.amount || 0);
  }

  let sent = 0;
  let failed = 0;

  for (const partner of partners || []) {
    if (!partner.email) {
      failed++;
      continue;
    }

    const pendingAmount = pendingByPartner[partner.id] || 0;

    const ok = await sendSettlementInfoRequestEmail({
      partnerEmail: partner.email,
      partnerName: partner.name || '파트너',
      pendingAmount,
    });

    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({ sent, failed });
}
