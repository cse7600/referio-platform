import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAdvertiserSession();

    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: settlements, error } = await supabase
      .from('settlements')
      .select(`
        *,
        partners (
          id,
          name,
          bank_name,
          bank_account,
          account_holder
        ),
        referrals (
          id,
          name
        )
      `)
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export query error:', error);
      return NextResponse.json(
        { error: 'CSV 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // Build CSV (no SSN included)
    const headers = [
      '정산ID',
      '파트너명',
      '은행명',
      '계좌번호',
      '예금주',
      '연결고객',
      '금액',
      '정산유형',
      '상태',
      '생성일',
      '완료일',
    ];

    const escCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const rows = (settlements || []).map(s => {
      const partner = s.partners as {
        name: string;
        bank_name: string | null;
        bank_account: string | null;
        account_holder: string | null;
      } | null;
      const referral = s.referrals as { name: string } | null;

      return [
        s.id,
        partner?.name || '',
        partner?.bank_name || '',
        partner?.bank_account || '',
        partner?.account_holder || '',
        referral?.name || '',
        String(s.amount || 0),
        s.type === 'valid' ? '유효DB' : s.type === 'contract' ? '계약' : (s.type || ''),
        s.status === 'pending' ? '대기' : '완료',
        s.created_at ? new Date(s.created_at).toLocaleDateString('ko-KR') : '',
        s.settled_at ? new Date(s.settled_at).toLocaleDateString('ko-KR') : '',
      ].map(v => escCsv(v)).join(',');
    });

    const csv = [headers.map(h => escCsv(h)).join(','), ...rows].join('\n');

    // UTF-8 BOM
    const bom = '\uFEFF';

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="settlements_${today}.csv"`,
      },
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
