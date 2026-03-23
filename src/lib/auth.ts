import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export interface AdvertiserUser {
  id: string
  advertiserUuid: string
  advertiserId: string
  userId: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
  companyName: string
  logoUrl: string | null
  primaryColor: string | null
}

/**
 * 광고주 세션 확인 (서버 컴포넌트/API에서 사용)
 * @returns 광고주 정보 또는 null
 */
export async function getAdvertiserSession(): Promise<AdvertiserUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('advertiser_token')?.value

    if (!token) {
      return null
    }

    const admin = createAdminClient()

    // 세션 조회 (RLS 우회 — 쿠키 기반 광고주 인증)
    const { data: session, error: sessionError } = await admin
      .from('advertiser_sessions')
      .select(`
        id,
        advertiser_id,
        user_id,
        expires_at,
        advertisers!inner(
          id,
          advertiser_id,
          company_name,
          logo_url,
          primary_color
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return null
    }

    // 사용자 정보 조회
    const { data: user, error: userError } = await admin
      .from('advertiser_users')
      .select('*')
      .eq('id', session.user_id)
      .eq('status', 'active')
      .single()

    if (userError || !user) {
      // 레거시 advertisers 테이블에서 시도
      const advertisers = session.advertisers as unknown as {
        id: string
        advertiser_id: string
        company_name: string
        logo_url: string | null
        primary_color: string | null
      }

      return {
        id: session.advertiser_id,
        advertiserUuid: advertisers.id,
        advertiserId: advertisers.advertiser_id,
        userId: 'admin',
        name: advertisers.company_name + ' Admin',
        role: 'admin',
        companyName: advertisers.company_name,
        logoUrl: advertisers.logo_url,
        primaryColor: advertisers.primary_color,
      }
    }

    const advertisers = session.advertisers as unknown as {
      id: string
      advertiser_id: string
      company_name: string
      logo_url: string | null
      primary_color: string | null
    }

    return {
      id: user.id,
      advertiserUuid: advertisers.id,
      advertiserId: user.advertiser_id,
      userId: user.user_id,
      name: user.name || user.user_id,
      role: user.role as 'admin' | 'manager' | 'viewer',
      companyName: advertisers.company_name,
      logoUrl: advertisers.logo_url,
      primaryColor: advertisers.primary_color,
    }
  } catch (error) {
    console.error('getAdvertiserSession error:', error)
    return null
  }
}

/**
 * 광고주 세션이 필요한 페이지에서 사용
 * 세션이 없으면 예외 발생 (미들웨어에서 처리)
 */
export async function requireAdvertiserSession(): Promise<AdvertiserUser> {
  const session = await getAdvertiserSession()
  if (!session) {
    throw new Error('Unauthorized: Advertiser session required')
  }
  return session
}

/**
 * 특정 권한이 필요한 작업에서 사용
 */
export function checkAdvertiserPermission(
  user: AdvertiserUser,
  requiredRoles: Array<'admin' | 'manager' | 'viewer'>
): boolean {
  return requiredRoles.includes(user.role)
}

/**
 * Admin 또는 Manager 권한 확인
 */
export function canManage(user: AdvertiserUser): boolean {
  return checkAdvertiserPermission(user, ['admin', 'manager'])
}

/**
 * Admin 권한 확인
 */
export function isAdmin(user: AdvertiserUser): boolean {
  return user.role === 'admin'
}
