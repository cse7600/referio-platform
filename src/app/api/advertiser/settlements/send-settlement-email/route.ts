import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSettlementConfirmedEmail, sendSettlementInfoRequestEmail } from '@/lib/email';

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

    // Fetch partner info including bank_account from partner_profiles
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, email, partner_profiles(bank_account)')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: '파트너 정보를 찾을 수 없습니다' }, { status: 404 });
    }

    if (!partner.email) {
      return NextResponse.json({ error: '파트너 이메일이 없습니다' }, { status: 400 });
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

    const pendingAmount = (settlements || []).reduce((sum, s) => sum + (s.amount || 0), 0);

    // Check if partner has bank account registered
    const profile = Array.isArray(partner.partner_profiles)
      ? partner.partner_profiles[0]
      : partner.partner_profiles;
    const hasBankAccount = !!(profile?.bank_account);

    const partnerName = partner.name || '파트너';

    let success: boolean;
    let type: 'confirmed' | 'request-info';

    if (hasBankAccount) {
      // Email 10: settlement confirmed (bank info registered)
      success = await sendSettlementConfirmedEmail({
        partnerEmail: partner.email,
        partnerName,
        totalAmount: pendingAmount,
      });
      type = 'confirmed';
    } else {
      // Email 11: request settlement info (bank info not registered)
      success = await sendSettlementInfoRequestEmail({
        partnerEmail: partner.email,
        partnerName,
        pendingAmount,
      });
      type = 'request-info';
    }

    return NextResponse.json({ success, type });

  } catch (error) {
    console.error('Settlement send-settlement-email API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
