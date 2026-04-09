import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

// GET /api/admin/advertisers/account?advertiserId=xxx
// 광고주 계정 정보 조회 (advertiser_users + advertisers 레거시)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const advertiserId = searchParams.get('advertiserId')

  if (!advertiserId) {
    return NextResponse.json({ error: 'advertiserId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // advertiser_users 조회
  const { data: users } = await admin
    .from('advertiser_users')
    .select('id, user_id, name, role, status, last_login_at, created_at')
    .eq('advertiser_id', advertiserId)
    .order('created_at', { ascending: true })

  // 레거시 advertisers 계정 조회
  const { data: legacy } = await admin
    .from('advertisers')
    .select('id, user_id, status, created_at')
    .eq('advertiser_id', advertiserId)
    .single()

  return NextResponse.json({
    users: users || [],
    legacy: legacy
      ? {
          id: legacy.id,
          user_id: legacy.user_id,
          status: legacy.status,
          created_at: legacy.created_at,
        }
      : null,
  })
}

// PATCH /api/admin/advertisers/account
// 광고주 계정 비밀번호 변경
export async function PATCH(request: NextRequest) {
  try {
    const { advertiserId, userId, newPassword, isLegacy } = await request.json()

    if (!advertiserId || !newPassword) {
      return NextResponse.json({ error: 'advertiserId, newPassword required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다' }, { status: 400 })
    }

    const admin = createAdminClient()
    const passwordHash = await bcrypt.hash(newPassword, 10)

    if (isLegacy) {
      // 레거시 advertisers 테이블
      const { error } = await admin
        .from('advertisers')
        .update({ password_hash: passwordHash })
        .eq('advertiser_id', advertiserId)

      if (error) throw error
    } else {
      // advertiser_users 테이블
      const query = admin
        .from('advertiser_users')
        .update({ password_hash: passwordHash })
        .eq('advertiser_id', advertiserId)

      if (userId) query.eq('user_id', userId)

      const { error } = await query
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json({ error: '비밀번호 변경에 실패했습니다' }, { status: 500 })
  }
}
