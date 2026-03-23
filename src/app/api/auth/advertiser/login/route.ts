import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json()

    if (!loginId || !password) {
      return NextResponse.json(
        { error: '로그인 ID와 비밀번호를 입력해주세요' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const admin = createAdminClient()

    // advertiser_users에서 user_id로 조회 (RLS 우회 — 로그인은 인증 전이므로 admin 사용)
    const { data: user, error: userError } = await admin
      .from('advertiser_users')
      .select('*')
      .eq('user_id', loginId)
      .single()

    if (userError || !user) {
      // 기존 advertisers 테이블에서도 시도 (마이그레이션 호환성)
      const { data: legacyUser, error: legacyError } = await admin
        .from('advertisers')
        .select('*')
        .eq('user_id', loginId)
        .single()

      if (legacyError || !legacyUser) {
        return NextResponse.json(
          { error: '로그인 ID 또는 비밀번호가 일치하지 않습니다' },
          { status: 401 }
        )
      }

      // 레거시 로그인 처리
      return handleLogin(supabase, admin, {
        id: legacyUser.id,
        advertiserId: legacyUser.advertiser_id,
        userId: legacyUser.user_id,
        passwordHash: legacyUser.password_hash,
        name: legacyUser.company_name + ' Admin',
        role: 'admin',
        status: legacyUser.status,
        companyName: legacyUser.company_name,
        logoUrl: legacyUser.logo_url,
        primaryColor: legacyUser.primary_color,
      }, password)
    }

    // 광고주 정보 조회 (id 포함, RLS 우회)
    const { data: advertiser } = await admin
      .from('advertisers')
      .select('id, company_name, logo_url, primary_color')
      .eq('advertiser_id', user.advertiser_id)
      .single()

    return handleLogin(supabase, admin, {
      id: user.id,
      advertiserUuid: advertiser?.id,  // advertisers.id (외래키용)
      advertiserId: user.advertiser_id,
      userId: user.user_id,
      passwordHash: user.password_hash,
      name: user.name,
      role: user.role,
      status: user.status,
      companyName: advertiser?.company_name || loginId,
      logoUrl: advertiser?.logo_url,
      primaryColor: advertiser?.primary_color,
    }, password)

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

async function handleLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  userData: {
    id: string
    advertiserUuid?: string  // advertisers.id (세션 외래키용)
    advertiserId: string
    userId: string
    passwordHash: string
    name: string
    role: string
    status: string
    companyName: string
    logoUrl?: string
    primaryColor?: string
  },
  password: string
) {
  // 비밀번호 확인
  const isValidPassword = await bcrypt.compare(password, userData.passwordHash)

  if (!isValidPassword) {
    return NextResponse.json(
      { error: '광고주 ID, 사용자 ID 또는 비밀번호가 일치하지 않습니다' },
      { status: 401 }
    )
  }

  // 계정 상태 확인
  if (userData.status !== 'active') {
    const statusMessages: Record<string, string> = {
      suspended: '계정이 일시 정지되었습니다. 담당자에게 문의해주세요.',
      inactive: '비활성화된 계정입니다. 담당자에게 문의해주세요.',
    }
    return NextResponse.json(
      { error: statusMessages[userData.status] || '계정을 사용할 수 없습니다' },
      { status: 403 }
    )
  }

  // 세션 토큰 생성
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7일 유효

  // 세션 저장 - admin client로 RLS 우회
  const { error: sessionError } = await admin
    .from('advertiser_sessions')
    .insert({
      advertiser_id: userData.advertiserUuid || userData.id,  // advertisers.id
      user_id: userData.id,  // advertiser_users.id
      token,
      expires_at: expiresAt.toISOString(),
    })

  if (sessionError) {
    console.error('Session creation error:', sessionError)
    return NextResponse.json(
      { error: '세션 생성에 실패했습니다' },
      { status: 500 }
    )
  }

  // 마지막 로그인 시간 업데이트
  await admin
    .from('advertiser_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userData.id)

  // 응답에 쿠키 설정
  const response = NextResponse.json({
    success: true,
    user: {
      id: userData.id,
      advertiserId: userData.advertiserId,
      userId: userData.userId,
      name: userData.name,
      role: userData.role,
      companyName: userData.companyName,
      logoUrl: userData.logoUrl,
      primaryColor: userData.primaryColor,
    },
  })

  // HttpOnly 쿠키로 토큰 저장
  response.cookies.set('advertiser_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/',
  })

  return response
}
