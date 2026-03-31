import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSettlementInfoRequestHtml } from '@/lib/email';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

// Send a test copy of the settlement info request email to any address
export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { to, partnerName, pendingAmount } = body as {
    to: string;
    partnerName: string;
    pendingAmount: number;
  };

  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: '올바른 이메일 주소를 입력하세요' }, { status: 400 });
  }

  const html = generateSettlementInfoRequestHtml(partnerName || '파트너', pendingAmount || 0);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@updates.puzl.co.kr';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Referio <${fromEmail}>`,
      to,
      subject: `[테스트] ${partnerName}님 정산 정보 입력 요청 이메일 미리보기`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[test-email] send failed:', err);
    return NextResponse.json({ error: '발송 실패' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
