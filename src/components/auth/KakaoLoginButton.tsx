'use client'

import { createClient } from '@/lib/supabase/client'

interface KakaoLoginButtonProps {
  redirectTo?: string
}

export default function KakaoLoginButton({ redirectTo }: KakaoLoginButtonProps) {
  const enabled = process.env.NEXT_PUBLIC_KAKAO_ENABLED === 'true'
  if (!enabled) return null

  const handleKakaoLogin = async () => {
    const supabase = createClient()
    const scopes = ['profile_nickname', 'account_email']
    // Phase 2: channel follow consent (auto-enabled when NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID is set)
    if (process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID) {
      scopes.push('plusfriends')
    }

    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        scopes: scopes.join(' '),
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleKakaoLogin}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-opacity hover:opacity-90 active:opacity-75"
      style={{ backgroundColor: '#FEE500', color: '#000000' }}
    >
      {/* Kakao logo SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M9 0.5C4.30558 0.5 0.5 3.36853 0.5 6.875C0.5 9.02294 1.74794 10.9218 3.71618 12.0951L2.875 16.25L7.50882 13.1584C7.99412 13.2181 8.49118 13.25 9 13.25C13.6944 13.25 17.5 10.3815 17.5 6.875C17.5 3.36853 13.6944 0.5 9 0.5Z" fill="black" fillOpacity="0.85"/>
      </svg>
      카카오로 시작하기
    </button>
  )
}
