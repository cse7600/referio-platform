// 키퍼메이트 이벤트 조기 마감 + 새 이벤트 예고 안내 메일
// 발송 대상: 키퍼메이트 전체 파트너 (수신거부자 제외)
//
// 사용법:
//   테스트 발송: node --env-file=.env.local scripts/send-keepermate-event-closure.js test
//   실제 발송:   node --env-file=.env.local scripts/send-keepermate-event-closure.js send

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const FROM_NAME = 'Referio × 키퍼메이트';
const KEEPERMATE_ADVERTISER_ID = 'ab7da1e1-2bef-4065-8c84-88c037f2b4dc';

// ── 이메일 HTML ──────────────────────────────────────────────────────────────
function buildEmailHtml({ partnerName = '파트너님' } = {}) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이벤트 조기 마감 · 새로운 이벤트 예정 안내</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <div style="max-width:580px;margin:36px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

    <!-- 헤더 -->
    <div style="background:#0f172a;padding:24px 32px;">
      <table style="width:100%;"><tr>
        <td><span style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-0.5px;">Referio</span><span style="color:#64748b;font-size:11px;margin-left:8px;vertical-align:middle;">× 키퍼메이트 파트너 전용</span></td>
      </tr></table>
    </div>

    <!-- 공지 배지 -->
    <div style="background:linear-gradient(90deg,#1e40af,#3b82f6);padding:12px 32px;">
      <span style="color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.3px;">📢 이벤트 조기 마감 · 새로운 이벤트 예정 안내</span>
    </div>

    <!-- 본문 -->
    <div style="padding:36px 32px 28px;">

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        안녕하세요, <strong style="color:#111827;">${partnerName}</strong> 😊<br>
        <strong>키퍼메이트팀</strong>입니다.
      </p>

      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.8;">
        먼저 첫 활동 인증 이벤트에 참여해주신 분들 정말 감사드립니다 🙏
      </p>

      <!-- 마감 안내 박스 -->
      <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:22px 24px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#dc2626;font-size:13px;font-weight:800;letter-spacing:0.3px;">🔔 이벤트 조기 마감 안내</p>
        <p style="margin:0 0 12px;color:#1f2937;font-size:14px;line-height:1.75;">
          더 큰 혜택의 이벤트를 준비하게 되어 기존 이벤트는<br>
          <strong style="color:#dc2626;">4월 8일(화) 오후 12시부</strong>로 조기 마감될 예정입니다.
        </p>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.7;">
          기존 이벤트 참여자분들께는 상품이 순차적으로 발송될 예정이니<br>
          조금만 기다려 주시면 감사하겠습니다. 😊
        </p>
      </div>

      <!-- 새 이벤트 예고 박스 -->
      <div style="background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);border:1.5px solid #93c5fd;border-radius:12px;padding:22px 24px;margin-bottom:28px;">
        <p style="margin:0 0 10px;color:#1d4ed8;font-size:13px;font-weight:800;letter-spacing:0.3px;">👀 새로운 이벤트 예고</p>
        <p style="margin:0 0 14px;color:#1f2937;font-size:15px;font-weight:700;line-height:1.5;">
          총 상금 <span style="color:#059669;font-size:20px;">60만원</span> 규모의<br>새 이벤트가 곧 시작됩니다!
        </p>
        <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.75;">
          기존 이벤트 참여자분들도 물론 참여하실 수 있습니다 🙂
        </p>
        <div style="background:#ffffff;border-radius:8px;padding:14px 18px;border:1px solid #bfdbfe;">
          <p style="margin:0;color:#1d4ed8;font-size:14px;font-weight:700;text-align:center;">
            📅 새 이벤트 공개: <strong>4월 9일(수)</strong>
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://referio.puzl.co.kr/dashboard/events"
           style="display:inline-block;background:#1e40af;color:#ffffff;font-size:15px;font-weight:800;padding:15px 40px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">
          대시보드에서 이벤트 확인하기 →
        </a>
      </div>

      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.7;text-align:center;">
        새 이벤트도 많은 관심 부탁드립니다 🎉
      </p>

    </div>

    <!-- 구분선 -->
    <div style="height:1px;background:#f3f4f6;margin:0 32px;"></div>

    <!-- 푸터 -->
    <div style="padding:22px 32px;background:#fafafa;">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.6;">
        본 메일은 Referio 키퍼메이트 파트너 프로그램 소속 파트너님께 발송됩니다.
      </p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        문의: <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a>
        &nbsp;·&nbsp;
        <a href="https://referio.puzl.co.kr/dashboard" style="color:#6b7280;">대시보드 바로가기</a>
      </p>
    </div>

  </div>

</body>
</html>`;
}

// ── 발송 함수 ──────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY 환경변수가 없습니다.');
    process.exit(1);
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error('❌ 발송 실패:', JSON.stringify(body, null, 2));
    return false;
  }
  console.log('✅ 발송 성공:', body.id, '→', to);
  return true;
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  const mode = process.argv[2] || 'test';
  const SUBJECT = '[키퍼메이트] 📢 이벤트 조기 마감 안내 + 총 상금 60만원 새 이벤트 예고';

  if (mode === 'test') {
    console.log('📧 테스트 이메일 발송 중... → referio@puzl.co.kr');
    const html = buildEmailHtml({ partnerName: '파트너님 (테스트)' });
    await sendEmail({ to: 'referio@puzl.co.kr', subject: SUBJECT, html });
    return;
  }

  if (mode === 'send') {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: programs, error } = await supabase
      .from('partner_programs')
      .select('partner_id, partners(id, name, email, email_opted_out)')
      .eq('advertiser_id', KEEPERMATE_ADVERTISER_ID)
      .not('partners', 'is', null);

    if (error) {
      console.error('❌ 파트너 조회 실패:', error.message);
      process.exit(1);
    }

    let sent = 0, skipped = 0;
    console.log(`전체 파트너: ${programs?.length ?? 0}명`);

    for (const prog of programs || []) {
      const partner = prog.partners;
      if (!partner?.email || partner.email_opted_out) {
        skipped++;
        console.log(`⏭️  건너뜀 (수신거부/이메일없음): ${partner?.name ?? '-'}`);
        continue;
      }

      const html = buildEmailHtml({ partnerName: partner.name || '파트너님' });
      const ok = await sendEmail({ to: partner.email, subject: SUBJECT, html });
      if (ok) sent++; else skipped++;

      // 초당 2건 제한
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n📬 완료: 발송 ${sent}건 / 건너뜀 ${skipped}건`);
  }
}

main().catch(console.error);
