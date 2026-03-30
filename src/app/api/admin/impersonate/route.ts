import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';

const PUZLCORP_UUID = '1d4f8ea0-96ad-4f61-90f3-c73cfd08056b';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://referio.puzl.co.kr';

// POST /api/admin/impersonate — create advertiser session for puzlcorp and redirect
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // Verify Supabase session (admin must be logged in)
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 1일 유효 (짧게)

  const { error } = await supabase.from('advertiser_sessions').insert({
    advertiser_id: PUZLCORP_UUID,
    user_id: null,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: '세션 생성 실패' }, { status: 500 });
  }

  const response = NextResponse.json({ success: true, redirect: '/advertiser/dashboard' });

  response.cookies.set('advertiser_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1일
    path: '/',
  });

  return response;
}
