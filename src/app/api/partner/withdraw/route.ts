import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAccountDeletedEmail } from '@/lib/email';

// POST /api/partner/withdraw
// Processes partner account withdrawal:
// 1. Verify auth
// 2. Look up partner info
// 3. Summarise pending settlements
// 4. Mark partner as 'withdrawn'
// 5. Send account-deleted email
// 6. Ban the Supabase Auth user so further logins are blocked
export async function POST(_request: NextRequest) {
  try {
    // 1. Authenticate via Supabase Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 2. Look up partner record
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, email, status')
      .eq('auth_user_id', user.id)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 });
    }

    // Prevent double-withdrawal
    if (partner.status === 'withdrawn') {
      return NextResponse.json({ error: '이미 탈퇴 처리된 계정입니다' }, { status: 400 });
    }

    // 3. Query pending settlements for this partner
    const admin = createAdminClient();

    const { data: settlements } = await admin
      .from('settlements')
      .select('amount, payment_due_date')
      .eq('partner_id', partner.id)
      .in('status', ['pending', 'confirmed']);

    const pendingAmount = (settlements ?? []).reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0,
    );

    // Derive latest payment_due_date (for the email body)
    let paymentDueDate: string | undefined;
    if (pendingAmount > 0 && settlements && settlements.length > 0) {
      const dates = settlements
        .map((s) => s.payment_due_date as string | null)
        .filter(Boolean) as string[];

      if (dates.length > 0) {
        // Pick the latest date
        const latest = dates.sort().at(-1)!;
        // Format as '2026년 04월 30일'
        const d = new Date(latest);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        paymentDueDate = `${y}년 ${m}월 ${day}일`;
      }
    }

    // 4. Mark partner as 'withdrawn' in the partners table
    const { error: updateError } = await admin
      .from('partners')
      .update({ status: 'withdrawn' })
      .eq('id', partner.id);

    if (updateError) {
      console.error('[withdraw] partners update error:', updateError);
      return NextResponse.json({ error: '탈퇴 처리 중 오류가 발생했습니다' }, { status: 500 });
    }

    // 5. Send account-deleted email (fire-and-forget style — do not block response)
    const emailAddress = partner.email ?? user.email;
    if (emailAddress) {
      sendAccountDeletedEmail({
        partnerId: partner.id,
        partnerEmail: emailAddress,
        partnerName: partner.name ?? '파트너',
        pendingSettlementAmount: pendingAmount > 0 ? pendingAmount : undefined,
        paymentDueDate,
      }).catch((err) => {
        console.error('[withdraw] sendAccountDeletedEmail error:', err);
      });
    }

    // 6. Ban the Supabase Auth user to block future logins
    try {
      await admin.auth.admin.updateUserById(user.id, { ban_duration: '87600h' }); // ~10 years
    } catch (banErr) {
      // Non-fatal: log and continue — partner record is already marked withdrawn
      console.warn('[withdraw] auth ban failed (non-fatal):', banErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[withdraw] unexpected error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
