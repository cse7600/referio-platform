import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession } from '@/lib/auth';
import { sendSettlementInfoRequestEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const session = await getAdvertiserSession();

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partner_ids } = body as { partner_ids: string[] };

    if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
      return NextResponse.json({ error: 'partner_ids is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify partner-advertiser relationship via partner_programs
    const { data: validPrograms, error: progError } = await supabase
      .from('partner_programs')
      .select('partner_id')
      .eq('advertiser_id', session.advertiserUuid)
      .in('partner_id', partner_ids);

    if (progError) {
      return NextResponse.json({ error: progError.message }, { status: 500 });
    }

    const validPartnerIds = (validPrograms || []).map(p => p.partner_id);

    if (validPartnerIds.length === 0) {
      return NextResponse.json({ error: '발송 가능한 파트너가 없습니다' }, { status: 400 });
    }

    // Fetch partner info (only validated ones)
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, email')
      .in('id', validPartnerIds);

    if (partnerError) {
      return NextResponse.json({ error: partnerError.message }, { status: 500 });
    }

    // Fetch pending settlement amounts for this advertiser's partners
    const { data: settlements, error: settError } = await supabase
      .from('settlements')
      .select('partner_id, amount')
      .eq('advertiser_id', session.advertiserUuid)
      .in('partner_id', validPartnerIds)
      .eq('status', 'pending');

    if (settError) {
      return NextResponse.json({ error: settError.message }, { status: 500 });
    }

    // Aggregate pending amounts by partner
    const pendingByPartner: Record<string, number> = {};
    for (const s of settlements || []) {
      pendingByPartner[s.partner_id] = (pendingByPartner[s.partner_id] || 0) + (s.amount || 0);
    }

    // Get advertiser company name
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('company_name')
      .eq('id', session.advertiserUuid)
      .single();

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
        advertiserName: advertiser?.company_name || undefined,
      });

      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({ sent, failed });

  } catch (error) {
    console.error('Settlement request-info API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
