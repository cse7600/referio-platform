import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

// POST /api/admin/invite-user — 새 유저 초대 이메일 발송
export async function POST(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, redirectTo } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://referio.puzl.co.kr'}/login`,
  });

  if (error) {
    // 이미 존재하는 유저
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}

// GET /api/admin/invite-user — 전체 유저 목록 조회
export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    confirmed: !!u.confirmed_at,
    invitedAt: u.invited_at,
  }));

  return NextResponse.json({ users });
}
