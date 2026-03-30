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

// Returns HTML preview of settlement info request email
export async function POST(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { partnerName, pendingAmount } = body as {
    partnerName: string;
    pendingAmount: number;
  };

  const html = generateSettlementInfoRequestHtml(
    partnerName || '파트너',
    pendingAmount || 0
  );

  return NextResponse.json({ html });
}
