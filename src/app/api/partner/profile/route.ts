import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptSSN } from '@/lib/crypto';

// PATCH: Update partner profile (SSN goes through server-side encryption)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 });
    }

    const body = await request.json();
    const { ssn, bank_name, bank_account, account_holder, main_channel_link } = body;

    // Build update payload — only include fields that were actually sent
    const updateData: Record<string, unknown> = {};

    if (bank_name !== undefined) updateData.bank_name = bank_name || null;
    if (bank_account !== undefined) updateData.bank_account = bank_account || null;
    if (account_holder !== undefined) updateData.account_holder = account_holder || null;
    if (main_channel_link !== undefined) updateData.main_channel_link = main_channel_link || null;

    // SSN: encrypt before storing, never store plaintext
    if (ssn) {
      // Validate: 13 digits, no hyphens
      const ssnClean = ssn.replace(/[^0-9]/g, '');
      if (ssnClean.length !== 13) {
        return NextResponse.json(
          { error: '주민번호는 하이픈 없이 13자리 숫자여야 합니다' },
          { status: 400 }
        );
      }
      updateData.ssn_encrypted = encryptSSN(ssnClean);
    }
    // If ssn is not in request, ssn_encrypted stays unchanged (no null override)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '변경할 데이터가 없습니다' }, { status: 400 });
    }

    const { error } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', partner.id);

    if (error) {
      console.error('Partner profile update error:', error);
      return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 });
    }

    // Check if SSN exists after update
    const { data: updated } = await supabase
      .from('partners')
      .select('ssn_encrypted')
      .eq('id', partner.id)
      .single();

    return NextResponse.json({
      success: true,
      has_ssn: !!updated?.ssn_encrypted,
    });
  } catch (err) {
    console.error('Partner profile API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
