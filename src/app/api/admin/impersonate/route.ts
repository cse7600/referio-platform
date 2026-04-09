import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

const PUZLCORP_UUID = process.env.PUZLCORP_ADVERTISER_UUID || '1d4f8ea0-96ad-4f61-90f3-c73cfd08056b';

// POST /api/admin/impersonate — create advertiser session for puzlcorp and redirect
export async function POST(request: NextRequest) {
  // Verify Supabase session — same logic as admin layout
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!bearerToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseServer = await createClient();
  const { data: { user }, error: userError } = await supabaseServer.auth.getUser(bearerToken);
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  const isMaster = masterEmail && user.email === masterEmail;
  const isAdmin = user.app_metadata?.role === 'admin';
  if (!isMaster && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create advertiser session for puzlcorp
  const admin = createAdminClient();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 1일 유효

  const { error } = await admin.from('advertiser_sessions').insert({
    advertiser_id: PUZLCORP_UUID,
    user_id: null,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('impersonate session error:', error);
    return NextResponse.json({ error: '세션 생성 실패' }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('advertiser_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1일
    path: '/',
  });

  return response;
}
