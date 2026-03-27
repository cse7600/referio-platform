/**
 * send-test-email.js
 * cym@puzl.co.kr 로 비밀번호 설정 테스트 이메일 발송
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eqdnirtgmevhobmycxzn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZG5pcnRnbWV2aG9ibXljeHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI1OTIwMSwiZXhwIjoyMDg1ODM1MjAxfQ.n9mhy92E3ePAXAvlat60wVKqd2H0BpdNmrmKindHlxU';
const RESEND_API_KEY = 're_eS5DK9gX_JWh6hjbLK2NdbLLcghtmFuot';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const SITE_URL = 'https://referio.puzl.co.kr';
const KEEPERMATE_RESET_PATH = '/signup/keepermate';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildEmailHtml(name, actionLink, referralCode) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:40px auto;">

  <!-- 헤더 -->
  <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <table style="width:100%;"><tr>
      <td><span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Referio</span></td>
      <td style="text-align:right;"><span style="color:#64748b;font-size:12px;">파트너 포털</span></td>
    </tr></table>
  </div>

  <!-- 배너 -->
  <div style="background:#1e3a8a;padding:28px 32px;">
    <p style="margin:0 0 6px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">한화비전 키퍼메이트</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.4;">파트너 포털 계정이 준비됐습니다 🎉</h1>
  </div>

  <!-- 본문 -->
  <div style="background:#fff;padding:36px 32px;">
    <p style="margin:0 0 8px;color:#111827;font-size:16px;font-weight:600;">${name}님, 안녕하세요.</p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.8;">
      기존 한화비전 키퍼메이트 파트너 활동 내역이 <strong>Referio 파트너 포털</strong>로 이전됐습니다.<br>
      앞으로는 Referio에서 추천 현황, 커미션, 활동 데이터를 직접 확인하고 관리하실 수 있습니다.
    </p>

    <!-- 이전 완료 내역 -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e3a8a;">✅ 이전 완료 내역</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">파트너 상태</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#15803d;">✓ 승인 완료 (Authorized)</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">추천 코드</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1e3a8a;letter-spacing:1px;">${referralCode || '포털에서 확인'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">기존 실적</td>
          <td style="padding:6px 0;font-size:13px;color:#374151;">포털에서 확인 가능</td>
        </tr>
      </table>
    </div>

    <!-- 시작 단계 -->
    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#111827;">시작하기 (2단계)</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;padding:10px 0;width:40px;">
          <div style="width:30px;height:30px;background:#1e3a8a;border-radius:50%;text-align:center;line-height:30px;color:#fff;font-size:13px;font-weight:700;">1</div>
        </td>
        <td style="vertical-align:top;padding:10px 0 10px 14px;">
          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#111827;">아래 버튼 클릭 → 비밀번호 설정</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">링크는 24시간 유효합니다</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:10px 0;width:40px;">
          <div style="width:30px;height:30px;background:#1e3a8a;border-radius:50%;text-align:center;line-height:30px;color:#fff;font-size:13px;font-weight:700;">2</div>
        </td>
        <td style="vertical-align:top;padding:10px 0 10px 14px;">
          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#111827;">이메일 + 새 비밀번호로 로그인</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">로그인 주소: <strong>referio.puzl.co.kr</strong></p>
        </td>
      </tr>
    </table>

    <!-- CTA 버튼 -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${actionLink}"
         style="display:inline-block;padding:16px 44px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">
        비밀번호 설정하고 포털 입장하기 →
      </a>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;">
      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;">버튼이 작동하지 않으면 아래 주소를 브라우저에 복사해주세요</p>
      <p style="margin:0;color:#6b7280;font-size:11px;word-break:break-all;line-height:1.6;">${actionLink}</p>
    </div>
  </div>

  <!-- 푸터 -->
  <div style="background:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">이 메일은 한화비전 키퍼메이트 파트너 포털 이전 안내입니다.</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">문의: <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a></p>
  </div>

</div>
</body>
</html>`;
}

async function main() {
  const targetEmail = 'cym@puzl.co.kr';
  const targetName = '최영민';

  console.log(`\n비밀번호 설정 링크 생성 중... (${targetEmail})`);

  // 1. 파트너 추천코드 조회
  const { data: ppData } = await admin
    .from('partner_programs')
    .select('referral_code, partners!inner(name, email)')
    .eq('advertiser_id', 'ab7da1e1-2bef-4065-8c84-88c037f2b4dc')
    .eq('partners.email', targetEmail)
    .single();

  const referralCode = ppData?.referral_code || '';

  // 2. Supabase recovery 링크 생성
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: targetEmail,
    options: {
      redirectTo: `${SITE_URL}${KEEPERMATE_RESET_PATH}`,
    },
  });

  if (linkError) {
    console.error('링크 생성 실패:', linkError.message);
    process.exit(1);
  }

  const actionLink = linkData.properties?.action_link;
  console.log('생성된 링크:', actionLink);

  // 3. 이메일 발송
  const html = buildEmailHtml(targetName, actionLink, referralCode);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Referio <${FROM_EMAIL}>`,
      to: targetEmail,
      subject: '[한화비전 키퍼메이트] Referio 파트너 포털 계정 안내',
      html,
    }),
  });

  const result = await res.json();

  if (res.ok) {
    console.log(`\n✅ 이메일 발송 완료 → ${targetEmail}`);
    console.log(`   Resend ID: ${result.id}`);
    console.log(`   추천 코드: ${referralCode}`);
    console.log(`   redirect URL: ${SITE_URL}${KEEPERMATE_RESET_PATH}`);
  } else {
    console.error('이메일 발송 실패:', result);
  }
}

main().catch(console.error);
