import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 보호된 라우트 체크
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                       request.nextUrl.pathname.startsWith('/signup')
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')
    const isAdmin = request.nextUrl.pathname.startsWith('/admin')

    // 로그인하지 않은 사용자가 대시보드/온보딩/어드민 접근 시
    if (!user && (isDashboard || isOnboarding || isAdmin)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 로그인한 사용자가 로그인/회원가입 페이지 접근 시
    if (user && isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  } catch {
    // Supabase 연결 오류 시 통과 (인증 없이 진행)
  }

  return supabaseResponse
}
