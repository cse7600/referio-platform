import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSSN } from '@/lib/crypto';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const statusFilter = request.nextUrl.searchParams.get('status') || 'all';
  const advertiserFilter = request.nextUrl.searchParams.get('advertiser_id');

  const admin = createAdminClient();

  let query = admin
    .from('settlements')
    .select(`
      *,
      partners (
        id,
        name,
        email,
        bank_name,
        bank_account,
        account_holder,
        ssn_encrypted
      ),
      referrals (
        name
      ),
      advertisers (
        company_name
      )
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (advertiserFilter && advertiserFilter !== 'all') {
    query = query.eq('advertiser_id', advertiserFilter);
  }

  const { data: settlements, error } = await query;

  if (error) {
    return new NextResponse(`Query error: ${error.message}`, { status: 500 });
  }

  // Access log for SSN decryption
  const ssnCount = (settlements || []).filter(
    s => (s.partners as { ssn_encrypted: string | null } | null)?.ssn_encrypted
  ).length;

  console.log('[SSN-ACCESS]', {
    admin_email: user.email,
    timestamp: new Date().toISOString(),
    count: ssnCount,
  });

  // CSV columns
  const STATUS_LABELS: Record<string, string> = {
    pending: '대기',
    completed: '완료',
  };

  const TYPE_LABELS: Record<string, string> = {
    contract: '계약',
    valid: '유효',
  };

  const headers = [
    '정산ID',
    '파트너명',
    '이메일',
    '브랜드',
    '은행명',
    '계좌번호',
    '예금주',
    '주민번호',
    '금액',
    '정산유형',
    '상태',
    '생성일',
    '완료일',
  ];

  const rows = (settlements || []).map(s => {
    const partner = s.partners as {
      id: string;
      name: string;
      email: string;
      bank_name: string | null;
      bank_account: string | null;
      account_holder: string | null;
      ssn_encrypted: string | null;
    } | null;

    const adv = s.advertisers as { company_name: string } | null;

    // Decrypt SSN if available
    let ssn = '';
    if (partner?.ssn_encrypted) {
      try {
        ssn = decryptSSN(partner.ssn_encrypted);
      } catch {
        ssn = '복호화실패';
      }
    }

    const formatDate = (d: string | null) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('ko-KR');
    };

    const typeKey = s.type as string | null;
    const statusKey = s.status as string;

    return [
      s.id,
      partner?.name || '',
      partner?.email || '',
      adv?.company_name || '',
      partner?.bank_name || '',
      partner?.bank_account || '',  // index 5: 계좌번호 → forceText 처리
      partner?.account_holder || '',
      ssn,                          // index 7: 주민번호 → forceText 처리
      s.amount || 0,
      (typeKey ? TYPE_LABELS[typeKey] : '') || typeKey || '',
      STATUS_LABELS[statusKey] || statusKey,
      formatDate(s.created_at),
      formatDate(s.settled_at),
    ];
  });

  // Build CSV string with escaping
  const escapeCsv = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Force Excel to treat as text (prevents scientific notation for account/SSN numbers)
  // Uses ="value" formula syntax: in CSV this becomes "=""value"""
  const forceText = (val: string) => {
    if (!val) return '""';
    const escaped = val.replace(/"/g, '""');
    return `"=""${escaped}"""`;
  };

  // Columns that need forced text treatment (index 5: 계좌번호, index 7: 주민번호)
  const TEXT_FORCE_INDICES = new Set([5, 7]);

  const csvContent = [
    headers.map(h => escapeCsv(h)).join(','),
    ...rows.map(row =>
      row.map((cell, idx) =>
        TEXT_FORCE_INDICES.has(idx)
          ? forceText(String(cell))
          : escapeCsv(cell)
      ).join(',')
    ),
  ].join('\n');

  // UTF-8 BOM for Korean compatibility
  const bom = '\uFEFF';
  const body = bom + csvContent;

  const today = new Date().toISOString().split('T')[0];

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="settlements.csv"; filename*=UTF-8''%EC%A0%95%EC%82%B0%EB%82%B4%EC%97%AD_${today}.csv`,
    },
  });
}
