import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSettlementConfirmedHtml } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession();

    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { partnerId } = body as { partnerId: string };

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify partner belongs to this advertiser via partner_programs
    const { data: program, error: progError } = await supabase
      .from('partner_programs')
      .select('partner_id')
      .eq('advertiser_id', session.advertiserUuid)
      .eq('partner_id', partnerId)
      .single();

    if (progError || !program) {
      return NextResponse.json({ error: '해당 파트너에 대한 권한이 없습니다' }, { status: 403 });
    }

    // Fetch partner info
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, email')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 });
    }

    // Fetch pending settlements for this partner under this advertiser
    const { data: settlements, error: settError } = await supabase
      .from('settlements')
      .select('id, amount, type')
      .eq('advertiser_id', session.advertiserUuid)
      .eq('partner_id', partnerId)
      .eq('status', 'pending');

    if (settError) {
      return NextResponse.json({ error: settError.message }, { status: 500 });
    }

    // Calculate total pending amount
    const pendingAmount = (settlements || []).reduce((sum, s) => sum + (s.amount || 0), 0);

    // Group by type to build settlement items
    const typeMap: Record<string, { count: number; amount: number }> = {};
    for (const s of settlements || []) {
      const label = s.type === 'contract' ? '계약' : '유효DB';
      if (!typeMap[label]) {
        typeMap[label] = { count: 0, amount: 0 };
      }
      typeMap[label].count += 1;
      typeMap[label].amount += s.amount || 0;
    }

    const settlementItems = Object.entries(typeMap).map(([programName, data]) => ({
      programName,
      count: data.count,
      amount: data.amount,
    }));

    // Generate HTML preview
    const html = generateSettlementConfirmedHtml({
      partnerName: partner.name || '파트너',
      totalAmount: pendingAmount,
      settlementItems,
    });

    return NextResponse.json({ html });

  } catch (error) {
    console.error('Settlement preview-email API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
