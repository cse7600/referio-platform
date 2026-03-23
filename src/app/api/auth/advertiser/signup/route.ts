import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const {
      companyName,
      representativeName,
      managerEmail,
      managerPhone,
      loginId,
      password,
    } = await request.json()

    if (!companyName || !representativeName || !managerEmail || !loginId || !password) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // advertiser_id = loginId (가입 시 설정한 로그인 ID와 동일)
    const advertiserId = loginId

    // 이메일 중복 체크
    const { data: existingEmail } = await supabase
      .from('advertisers')
      .select('id')
      .eq('manager_email', managerEmail)
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다' },
        { status: 409 }
      )
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10)

    // free 플랜 조회
    const { data: freePlan } = await supabase
      .from('advertiser_plans')
      .select('id')
      .eq('name', 'free')
      .single()

    // 광고주 생성
    const { data: advertiser, error: advError } = await supabase
      .from('advertisers')
      .insert({
        advertiser_id: advertiserId,
        company_name: companyName,
        representative_name: representativeName,
        manager_email: managerEmail,
        manager_phone: managerPhone || null,
        contact_email: managerEmail,
        contact_phone: managerPhone || null,
        user_id: loginId,
        password_hash: passwordHash,
        status: 'active',
        is_public: false,
        plan_id: freePlan?.id || null,
        credit_balance: 0,
      })
      .select('id')
      .single()

    if (advError) {
      console.error('Advertiser creation error:', advError)
      if (advError.message.includes('duplicate') || advError.message.includes('unique')) {
        return NextResponse.json(
          { error: '이미 사용 중인 정보입니다. 다른 로그인 ID를 사용해주세요.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: '가입에 실패했습니다' }, { status: 500 })
    }

    // advertiser_users 생성
    const { error: userError } = await supabase
      .from('advertiser_users')
      .insert({
        advertiser_id: advertiserId,
        user_id: loginId,
        password_hash: passwordHash,
        name: representativeName,
        role: 'admin',
        status: 'active',
      })

    if (userError) {
      console.error('Advertiser user creation error:', userError)
      // rollback advertiser
      await supabase.from('advertisers').delete().eq('id', advertiser.id)
      return NextResponse.json({ error: '가입에 실패했습니다' }, { status: 500 })
    }

    // 기본 캠페인 자동 생성 (RLS 우회 위해 adminClient 사용)
    const adminSupabase = createAdminClient()
    await adminSupabase.from('campaigns').insert({
      advertiser_id: advertiser.id,
      name: `${companyName} 파트너 프로그램`,
      is_active: true,
      valid_amount: 0,
      contract_amount: 0,
      tier_pricing_enabled: false,
      commission_rate: 0,
      min_settlement: 0,
      duplicate_check_days: 90,
      valid_deadline_days: 7,
      contract_deadline_days: 30,
    })

    // 세션 생성 (자동 로그인)
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await supabase.from('advertiser_sessions').insert({
      advertiser_id: advertiser.id,
      token,
      expires_at: expiresAt.toISOString(),
    })

    const response = NextResponse.json({
      success: true,
      advertiser: {
        id: advertiser.id,
        advertiserId,
        companyName,
      },
    }, { status: 201 })

    response.cookies.set('advertiser_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Advertiser signup error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
