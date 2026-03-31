// One-click email unsubscribe endpoint
// GET /api/partner/unsubscribe?pid=PARTNER_UUID&token=HMAC_TOKEN
// Sets partners.email_opted_out = true on valid token

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/email-token';

const errorHtml = (msg: string) => new Response(
  `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>수신거부 — Referio</title>
  <style>body{margin:0;padding:40px 20px;background:#f8fafc;font-family:-apple-system,sans-serif;}.card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);text-align:center;}h2{color:#ef4444;}p{color:#6b7280;font-size:14px;}a{color:#4f46e5;}</style>
  </head><body><div class="card"><h2>오류</h2><p>${msg}</p><p><a href="https://referio.puzl.co.kr">홈으로 돌아가기</a></p></div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pid = searchParams.get('pid');
  const token = searchParams.get('token');

  if (!pid || !token) return errorHtml('잘못된 요청입니다.');
  if (!verifyUnsubscribeToken(pid, token)) return errorHtml('유효하지 않은 수신거부 링크입니다.');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('partners')
    .update({ email_opted_out: true })
    .eq('id', pid);

  if (error) {
    console.error('[Unsubscribe] DB update error:', error);
    return errorHtml('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  const successHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>수신거부 완료 — Referio</title>
  <style>
    body { margin: 0; padding: 40px 20px; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; }
    h2 { color: #111827; margin: 0 0 12px; font-size: 22px; }
    p { color: #6b7280; font-size: 14px; line-height: 1.7; margin: 0 0 8px; }
    .note { font-size: 13px; color: #9ca3af; margin-top: 16px; }
    a.btn { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; }
    a.link { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>수신거부가 완료됐습니다</h2>
    <p>이제부터 Referio의 마케팅 이메일을 받지 않습니다.</p>
    <p class="note">정산 확정, 계약 관련 필수 통지 이메일은 계속 발송됩니다.</p>
    <p class="note">수신을 다시 원하시면 <a href="https://referio.puzl.co.kr/dashboard/profile" class="link">프로필 설정</a>에서 변경할 수 있습니다.</p>
    <a href="https://referio.puzl.co.kr/dashboard" class="btn">대시보드로 돌아가기</a>
  </div>
</body>
</html>`;

  return new Response(successHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
