import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const isSignup = searchParams.get('signup') === 'true'
  const nameParam = searchParams.get('name')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // user metadata에서 이름 가져오기 (URL 파라미터보다 우선)
      const userName = nameParam
        ? decodeURIComponent(nameParam)
        : (data.user.user_metadata?.name as string) || '파트너'

      // partners 테이블에서 현재 유저 확인
      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id, phone, channels')
        .eq('auth_user_id', data.user.id)
        .single()

      if (!existingPartner) {
        // 이메일로 기존 파트너 확인 (Airtable에서 마이그레이션된 데이터)
        const { data: partnerByEmail } = await supabase
          .from('partners')
          .select('id')
          .eq('email', data.user.email)
          .single()

        if (partnerByEmail) {
          // 기존 파트너에 auth_user_id 연결
          await supabase
            .from('partners')
            .update({ auth_user_id: data.user.id })
            .eq('id', partnerByEmail.id)
        } else {
          // 새 파트너 레코드 생성
          await supabase.from('partners').insert({
            name: userName,
            email: data.user.email,
            auth_user_id: data.user.id,
            status: 'pending',
          })

          // 환영 이메일 발송 (비동기, 실패해도 가입 진행)
          if (data.user.email) {
            sendWelcomeEmail({
              partnerEmail: data.user.email,
              partnerName: userName,
            }).catch(console.error)
          }
        }

        // 신규 또는 연결된 파트너 → 온보딩
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // 기존 로그인 - 온보딩 완료 여부 확인
      if (!existingPartner.phone) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // 에러 발생 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
