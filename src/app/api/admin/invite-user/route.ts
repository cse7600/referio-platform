import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  const isMaster = masterEmail && user.email === masterEmail;
  const isAdmin = user.app_metadata?.role === 'admin';
  if (!isMaster && !isAdmin) return null;
  return user;
}

// POST /api/admin/invite-user — 어드민 초대 이메일 발송 + app_metadata.role=admin 설정
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

  // 이미 가입된 유저인지 먼저 확인
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existing?.users?.find((u) => u.email === email);

  if (existingUser) {
    // 이미 어드민이면 중복 처리
    if (existingUser.app_metadata?.role === 'admin') {
      return NextResponse.json({ error: '이미 어드민 권한이 부여된 계정입니다' }, { status: 409 });
    }
    // 기존 유저에게 어드민 권한 부여
    await admin.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { ...existingUser.app_metadata, role: 'admin' },
    });
    return NextResponse.json({ success: true, userId: existingUser.id, existing: true });
  }

  // 신규 유저 초대
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://referio.puzl.co.kr'}/login`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 초대 직후 app_metadata에 admin 역할 설정
  if (data.user?.id) {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: 'admin' },
    });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}

// GET /api/admin/invite-user — 어드민 유저 목록만 조회
export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 어드민 유저만 필터: app_metadata.role=admin 또는 마스터 이메일
  const users = (data.users || [])
    .filter((u) => u.app_metadata?.role === 'admin' || u.email === masterEmail)
    .map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      confirmed: !!u.confirmed_at,
      invitedAt: u.invited_at,
      isMaster: u.email === masterEmail,
    }));

  return NextResponse.json({ users });
}

// DELETE /api/admin/invite-user — 어드민 액세스 취소
export async function DELETE(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 });
  }

  // 마스터 계정은 취소 불가
  const admin = createAdminClient();
  const { data: targetUser } = await admin.auth.admin.getUserById(userId);
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  if (targetUser?.user?.email === masterEmail) {
    return NextResponse.json({ error: '마스터 계정의 액세스는 취소할 수 없습니다' }, { status: 403 });
  }

  // app_metadata에서 role 제거
  const currentMeta = targetUser?.user?.app_metadata || {};
  const { role: _removed, ...rest } = currentMeta;
  await admin.auth.admin.updateUserById(userId, { app_metadata: rest });

  return NextResponse.json({ success: true });
}
