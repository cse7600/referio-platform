import type { NextConfig } from "next";

const securityHeaders = [
  // 클릭재킹 방어: iframe으로 사이트 삽입 차단
  { key: 'X-Frame-Options', value: 'DENY' },
  // MIME 타입 스니핑 방어
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 리퍼러 정보 최소화
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // XSS 필터 강제 활성화
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // DNS 프리페치 제한
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // HTTPS 강제 (1년 캐시, 서브도메인 포함)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // 권한 정책: 불필요한 브라우저 기능 비활성화
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // CSP: 스크립트/스타일 출처 제한
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.kakaocdn.net https://developers.kakao.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.searchad.naver.com https://api.airtable.com https://api.resend.com https://kapi.kakao.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
// deploy trigger 1770630935
