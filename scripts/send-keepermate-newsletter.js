// 키퍼메이트 파트너 뉴스레터 발송 스크립트
// 2026 창업 트렌드 리포트 공유 + 추천 링크 활용 안내
//
// 사용법:
//   테스트 발송: node --env-file=.env.local scripts/send-keepermate-newsletter.js test
//   실제 발송:   node --env-file=.env.local scripts/send-keepermate-newsletter.js send

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const FROM_NAME = 'Referio';

// ── 뉴스레터 HTML ──────────────────────────────────────────────────────────
function buildNewsletterHtml({ partnerName = '파트너님', referralCode = 'YOUR_CODE' } = {}) {
  const reportUrl = `https://keeper.ceo/2026-trend-report?REF=${referralCode}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2026 창업 트렌드 리포트 — 지금 가장 잘 되는 콘텐츠입니다</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <div style="max-width:580px;margin:36px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

    <!-- 헤더 -->
    <div style="background:#111111;padding:26px 32px 22px;">
      <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">keeper</span>
      <span style="font-size:11px;color:#6b7280;margin-left:10px;vertical-align:middle;">× Keepermate 파트너 전용</span>
    </div>

    <!-- 긴급 배지 -->
    <div style="background:linear-gradient(90deg,#ff6b35,#ff4500);padding:11px 32px;display:flex;align-items:center;">
      <span style="color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.3px;">🔥 현재 가장 높은 전환율 콘텐츠 &nbsp;|&nbsp; 파트너 전용 안내</span>
    </div>

    <!-- 본문 -->
    <div style="padding:36px 32px 28px;">

      <p style="margin:0 0 6px;color:#9ca3af;font-size:14px;">안녕하세요, <strong style="color:#111827;">${partnerName}</strong></p>
      <h1 style="margin:0 0 8px;color:#111827;font-size:23px;font-weight:800;line-height:1.35;letter-spacing:-0.5px;">
        지금 내부에서 <span style="color:#ff6b35;">전환율 1위</span> 콘텐츠,<br>
        파트너님께만 먼저 공유합니다.
      </h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">keeper.ceo · 2026 창업 트렌드 리포트 Vol.1 &amp; Vol.2</p>

      <!-- 전환율 강조 박스 -->
      <div style="background:#fff8f5;border-left:4px solid #ff6b35;border-radius:0 10px 10px 0;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#ff6b35;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Why This Works</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.75;">
          이 리포트는 창업을 <strong>이미 고민 중인 사람</strong>이 찾아보는 콘텐츠입니다.<br>
          "다운로드하러 왔다가 키퍼메이트까지 알게 됐다" — 실제로 가장 많이 나오는 가입 경로입니다.<br>
          콘텐츠 자체가 설득을 대신해 줍니다. 파트너님은 링크만 공유하면 됩니다.
        </p>
      </div>

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
        한화비전 키퍼가 서울 63개 지역 실제 데이터를 분석한 <strong>무료 리포트</strong>입니다.<br>
        창업을 고민 중인 분들이 자발적으로 찾아보는 자료라 거부감이 없고, 공유하기도 쉽습니다.
      </p>

      <!-- 리포트 핵심 내용 카드 -->
      <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:22px 24px;margin-bottom:24px;">
        <p style="margin:0 0 16px;color:#111827;font-size:13px;font-weight:700;letter-spacing:0.3px;">📌 리포트 핵심 데이터 (이걸 보여주면 관심이 생깁니다)</p>

        <div style="display:flex;gap:0;margin-bottom:16px;">
          <div style="flex:1;padding-right:16px;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;color:#059669;font-size:12px;font-weight:700;">↑ 지금 뜨는 업종</p>
            <p style="margin:0;color:#111827;font-size:13px;line-height:1.8;">
              피부관리실 <strong>+28.8%</strong><br>
              무인매장 <strong>+22.3%</strong><br>
              특수음식점 <strong>+18.5%</strong>
            </p>
          </div>
          <div style="flex:1;padding-left:16px;">
            <p style="margin:0 0 8px;color:#dc2626;font-size:12px;font-weight:700;">↓ 피해야 할 업종</p>
            <p style="margin:0;color:#111827;font-size:13px;line-height:1.8;">
              호프/주점 <strong>-12.4%</strong><br>
              PC방 <strong>-9.7%</strong><br>
              세탁소 <strong>-8.2%</strong>
            </p>
          </div>
        </div>

        <div style="border-top:1px solid #e5e7eb;padding-top:14px;">
          <p style="margin:0 0 6px;color:#7c3aed;font-size:12px;font-weight:700;">📈 창업 5년 후 내 매장은?</p>
          <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;">
            신규 매장 <strong>1년 내 25% 폐업</strong> · 5년 내 누적 <strong>70% 폐업</strong><br>
            생존율은 업종보다 <strong>상권 선택</strong>이 결정한다 (종로구 57% vs 관악구 41%)
          </p>
        </div>
      </div>

      <!-- 구분선 텍스트 -->
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
        위 데이터를 보고 "어? 나도 봐야겠다"고 느끼셨다면, 주변 창업 고민하는 분들도 똑같이 느낍니다.<br>
        그 분들이 파트너님 링크로 들어와야 실적이 쌓입니다.
      </p>

      <!-- 추천 링크 안내 박스 — 핵심 -->
      <div style="background:#111111;border-radius:14px;padding:24px 26px;margin-bottom:28px;">
        <p style="margin:0 0 14px;color:#ff6b35;font-size:13px;font-weight:800;letter-spacing:0.3px;">🔗 파트너님 전용 링크 (바로 복사해서 쓰세요)</p>

        <div style="background:#1f1f1f;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:11px;font-weight:600;">파트너님 추천 코드가 반영된 링크</p>
          <p style="margin:0;color:#f97316;font-size:13px;font-weight:700;word-break:break-all;letter-spacing:0.2px;">
            https://keeper.ceo/2026-trend-report?REF=<strong style="color:#fbbf24;">${referralCode}</strong>
          </p>
        </div>

        <p style="margin:0 0 10px;color:#9ca3af;font-size:13px;line-height:1.6;">
          위 링크에는 파트너님 추천 코드 <strong style="color:#fbbf24;">${referralCode}</strong>가 자동으로 들어있습니다.<br>
          그대로 복사해서 공유하면 됩니다.
        </p>
        <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
          💡 다른 페이지를 공유할 때도 동일하게 <code style="background:#2d2d2d;color:#f97316;padding:1px 5px;border-radius:3px;">?REF=${referralCode}</code>를 붙이면 실적이 잡힙니다.
        </p>
      </div>

      <!-- 활용 아이디어 -->
      <div style="background:#f0f9ff;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 14px;color:#0284c7;font-size:13px;font-weight:700;">💡 어디서 공유하면 잘 될까요?</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#374151;font-size:13px;vertical-align:top;width:28px;">📝</td>
            <td style="padding:6px 0;color:#374151;font-size:13px;line-height:1.5;"><strong>블로그·네이버 카페</strong> — "2026 창업 트렌드 후기" 포스팅 + 링크 → 검색 유입 노림</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#374151;font-size:13px;vertical-align:top;">📱</td>
            <td style="padding:6px 0;color:#374151;font-size:13px;line-height:1.5;"><strong>인스타·스레드</strong> — 리포트 캡처 이미지 공유 + "링크는 바이오에"</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#374151;font-size:13px;vertical-align:top;">💬</td>
            <td style="padding:6px 0;color:#374151;font-size:13px;line-height:1.5;"><strong>카카오톡</strong> — "창업 고민하는 분 있으면 이거 봐봐요" 자연스럽게</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#374151;font-size:13px;vertical-align:top;">🎥</td>
            <td style="padding:6px 0;color:#374151;font-size:13px;line-height:1.5;"><strong>유튜브·틱톡</strong> — 영상 설명란·댓글에 링크 삽입</td>
          </tr>
        </table>
      </div>

      <!-- CTA 버튼 -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${reportUrl}"
           style="display:inline-block;background:#ff6b35;color:#ffffff;font-size:15px;font-weight:800;padding:15px 40px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">
          📥 내 추천 링크로 리포트 열기
        </a>
      </div>

      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;text-align:center;">
        리포트는 Vol.1, Vol.2 모두 <strong>완전 무료</strong>입니다. 부담 없이 공유하세요.
      </p>

    </div>

    <!-- 구분선 -->
    <div style="height:1px;background:#f3f4f6;margin:0 32px;"></div>

    <!-- 푸터 -->
    <div style="padding:22px 32px;background:#fafafa;">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.6;">
        본 메일은 Referio Keepermate 파트너 프로그램 소속 파트너님께 발송됩니다.
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

  if (mode === 'test') {
    const testTargets = ['cym@puzl.co.kr', 'referio@puzl.co.kr'];
    console.log(`📧 테스트 이메일 발송 중... → ${testTargets.join(', ')}`);
    const html = buildNewsletterHtml({
      partnerName: '파트너님',
      referralCode: 'KM_EXAMPLE001',
    });
    for (const to of testTargets) {
      await sendEmail({
        to,
        subject: '[Referio] 🔥 지금 가장 잘 되는 콘텐츠 — 내 추천 링크로 써보세요',
        html,
      });
    }
    return;
  }

  if (mode === 'send') {
    // 실제 발송: Supabase에서 키퍼메이트 파트너 목록 조회
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: programs, error } = await supabase
      .from('partner_programs')
      .select('partner_id, referral_code, partners(id, name, email, email_opted_out)')
      .eq('advertiser_id', (
        await supabase
          .from('advertisers')
          .select('id')
          .eq('advertiser_id', 'keepermate')
          .single()
      ).data?.id)
      .not('partners', 'is', null);

    if (error) {
      console.error('❌ 파트너 조회 실패:', error.message);
      process.exit(1);
    }

    let sent = 0, skipped = 0;

    for (const prog of programs || []) {
      const partner = prog.partners;
      if (!partner?.email || partner.email_opted_out) {
        skipped++;
        continue;
      }

      const html = buildNewsletterHtml({
        partnerName: partner.name || '파트너님',
        referralCode: prog.referral_code,
      });

      const ok = await sendEmail({
        to: partner.email,
        subject: '[Referio] 📊 2026 창업 트렌드 리포트 — 내 추천 링크로 활용하세요',
        html,
      });

      if (ok) sent++; else skipped++;

      // 초당 2건 제한 (Resend rate limit)
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n📬 완료: 발송 ${sent}건 / 건너뜀 ${skipped}건`);
  }
}

main().catch(console.error);
