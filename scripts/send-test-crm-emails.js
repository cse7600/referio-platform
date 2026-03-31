// CRM 이메일 테스트 발송 스크립트
// 실행: node scripts/send-test-crm-emails.js

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const FROM_NAME = 'Referio';
const API_KEY = 're_eS5DK9gX_JWh6hjbLK2NdbLLcghtmFuot';
const TEST_TO = 'referio@puzl.co.kr';

async function sendEmail(subject, html) {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: TEST_TO, subject, html }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, id: data.id, error: data.message };
}

async function main() {
  const results = [];

  // ── Email 1: 가입 환영 ──────────────────────────────────────────
  console.log('📨 Email 1: 가입 환영...');
  results.push({ name: 'Email 1 가입 환영', ...(await sendEmail(
    '[Referio] [TEST] 홍길동님, 가입을 환영합니다! 첫 파트너 프로그램을 시작해보세요',
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1></div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Referio에 오신 것을 환영합니다! 👋</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">홍길동님, 가입을 진심으로 환영합니다.<br/>Referio는 B2B 서비스 기업의 파트너 추천 프로그램을 관리하는 플랫폼입니다.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">지금 바로 시작하는 3단계</p>
        <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:2;">
          <li>마켓플레이스에서 참가할 프로그램을 선택하세요</li>
          <li>승인이 완료되면 나만의 추천 링크가 발급됩니다</li>
          <li>추천 링크를 통해 고객이 상담을 신청하면 커미션이 지급됩니다</li>
        </ol>
      </div>
      <a href="https://referio.puzl.co.kr/dashboard/programs" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">프로그램 둘러보기</a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">⚠️ 테스트 이메일입니다. 문의: <a href="mailto:referio@puzl.co.kr" style="color:#6b7280;">referio@puzl.co.kr</a></p>
    </div>
  </div>
</body></html>`
  )) });

  // ── Email 3: 파트너 승인 ────────────────────────────────────────
  console.log('📨 Email 3: 파트너 승인...');
  results.push({ name: 'Email 3 파트너 승인', ...(await sendEmail(
    '[Referio] [TEST] 한화비전 키퍼메이트 파트너로 승인되었습니다',
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1></div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">파트너 승인 완료!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">홍길동님, <strong>한화비전 키퍼메이트</strong> 파트너로 승인되었습니다.<br/>지금 바로 추천 활동을 시작해 보세요!</p>
      <div style="background:#eef2ff;border-radius:8px;padding:20px;margin-bottom:16px;border:1px solid #c7d2fe;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4338ca;">내 추천 코드</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#4f46e5;letter-spacing:3px;text-align:center;padding:8px 0;">TEST01</p>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #c7d2fe;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">내 추천 링크</p>
          <p style="margin:0;font-size:13px;color:#4f46e5;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #e0e7ff;">https://keepermate.co.kr/?ref=TEST01</p>
        </div>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#166534;">커미션 안내</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">리드 커미션</td><td style="padding:4px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">50,000원</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">계약 커미션</td><td style="padding:4px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">200,000원</td></tr>
        </table>
      </div>
      <a href="https://referio.puzl.co.kr/dashboard/programs/keepermate" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">지금 바로 활동 시작하기</a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">⚠️ 테스트 이메일입니다.</p>
    </div>
  </div>
</body></html>`
  )) });

  // ── Email 10: 정산 확정 ──────────────────────────────────────────
  console.log('📨 Email 10: 정산 확정...');
  results.push({ name: 'Email 10 정산 확정', ...(await sendEmail(
    '[Referio] [TEST] 홍길동님, ₩250,000 정산이 확정됐습니다',
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1></div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">정산이 확정됐습니다 ✅</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">홍길동님의 활동에 대한 정산이 확정됐습니다.<br/>별도로 하실 일은 없습니다. 등록하신 계좌로 입금이 진행됩니다.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#166534;">확정 정산 금액</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#15803d;">₩250,000</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">세금 처리 전 금액 · 최종 입금액은 원천징수 후 산정됩니다</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;">프로그램</th><th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;">건수</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;">금액</th></tr></thead>
        <tbody>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">한화비전 키퍼메이트</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">2건</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;text-align:right;">₩200,000</td></tr>
          <tr><td style="padding:8px 12px;font-size:13px;color:#374151;">테스트 프로그램 B</td><td style="padding:8px 12px;font-size:13px;text-align:center;">1건</td><td style="padding:8px 12px;font-size:13px;font-weight:600;text-align:right;">₩50,000</td></tr>
        </tbody>
        <tfoot><tr style="background:#f9fafb;"><td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700;">합계</td><td style="padding:10px 12px;font-size:14px;font-weight:700;color:#4f46e5;text-align:right;">₩250,000</td></tr></tfoot>
      </table>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:110px;">입금 예정일</td><td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">2026-04-15</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">입금 계좌</td><td style="padding:4px 0;color:#111827;font-size:13px;">등록된 계좌 (끝 4자리: 1234)</td></tr>
        </table>
      </div>
      <a href="https://referio.puzl.co.kr/dashboard/settlements" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">정산 내역 확인하기</a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">⚠️ 테스트 이메일입니다. 이 메일은 정산 처리에 관한 필수 안내 메일입니다.</p>
    </div>
  </div>
</body></html>`
  )) });

  // ── Email 11: 정산 정보 입력 요청 ──────────────────────────────
  console.log('📨 Email 11: 정산 정보 요청...');
  results.push({ name: 'Email 11 정산 정보 요청', ...(await sendEmail(
    '[Referio] [TEST] 정산을 위해 계좌 및 개인 정보를 입력해 주세요',
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <div style="background:#4f46e5;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Referio</h1></div>
    <div style="padding:36px 32px;">
      <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#111827;">정산 정보 입력 요청</h2>
      <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">홍길동님, 정산 처리를 위해 아래 정보를 입력해 주세요.</p>
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e;">입력이 필요한 항목</p>
        <ul style="margin:0;padding-left:20px;color:#78350f;font-size:14px;line-height:2.2;"><li>은행명</li><li>계좌번호</li><li>예금주명</li><li>주민번호 (원천징수 처리용)</li></ul>
      </div>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:18px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:15px;color:#166534;">정산 예정 금액: <strong style="font-size:18px;">₩250,000</strong></p>
      </div>
      <a href="https://referio.puzl.co.kr/dashboard/profile" style="display:inline-block;padding:15px 36px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">정산 정보 입력하기 →</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">⚠️ 테스트 이메일입니다.</p>
    </div>
  </div>
</body></html>`
  )) });

  // ── Email 12: 입금 완료 ──────────────────────────────────────────
  console.log('📨 Email 12: 입금 완료...');
  results.push({ name: 'Email 12 입금 완료', ...(await sendEmail(
    '[Referio] [TEST] ₩225,000 입금이 완료됐습니다',
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1></div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">입금이 완료됐습니다 💰</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">홍길동님께 정산 금액이 정상 입금됐습니다.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#166534;">입금 완료 금액</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#15803d;">₩225,000</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">원천징수 3.3% 공제 후</p>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:80px;">입금 일시</td><td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">2026-04-15 14:32</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">입금 계좌</td><td style="padding:4px 0;color:#111827;font-size:13px;">끝 4자리 1234</td></tr>
        </table>
      </div>
      <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">입금이 확인되지 않으시면 은행 처리 지연일 수 있습니다 (영업일 기준 1~2일 소요).</p>
      <a href="https://referio.puzl.co.kr/dashboard/settlements" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">정산 내역 확인하기</a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">⚠️ 테스트 이메일입니다. 이 메일은 입금 완료에 관한 필수 안내 메일입니다.</p>
    </div>
  </div>
</body></html>`
  )) });

  // ── Email 15: 파트너 거절 ────────────────────────────────────────
  console.log('📨 Email 15: 파트너 거절...');
  results.push({ name: 'Email 15 파트너 거절', ...(await sendEmail(
    '[Referio] [TEST] 한화비전 키퍼메이트 파트너 신청 결과 안내',
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Referio</h1></div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">파트너 신청 결과 안내</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">홍길동님, <strong>한화비전 키퍼메이트</strong> 파트너 신청을 검토한 결과를 안내드립니다.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">아쉽게도 이번 신청은 <strong>승인되지 않았습니다</strong>.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#b91c1c;">이는 홍길동님의 능력이나 신뢰도 문제가 아니라, 현재 한화비전의 파트너 모집 기준과의 적합성 문제입니다.</p>
      </div>
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#713f12;">거절 사유</p>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">현재 해당 지역의 파트너 수가 충분하여 신규 모집이 어렵습니다. 추후 모집 재개 시 우선 안내 드리겠습니다.</p>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#111827;">다른 프로그램도 둘러보세요</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Referio에는 다양한 B2B 파트너 프로그램이 있습니다. 나에게 맞는 다른 프로그램에 신청해보세요.</p>
      </div>
      <a href="https://referio.puzl.co.kr/dashboard/marketplace" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">다른 프로그램 둘러보기</a>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">⚠️ 테스트 이메일입니다.</p>
    </div>
  </div>
</body></html>`
  )) });

  // ── 결과 출력 ───────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('        테스트 발송 결과');
  console.log('════════════════════════════════════════');
  for (const r of results) {
    const status = r.ok ? '✅ 성공' : '❌ 실패';
    console.log(`${status} | ${r.name}${r.id ? ` (id: ${r.id})` : ''}${r.error ? ` → ${r.error}` : ''}`);
  }
  const pass = results.filter(r => r.ok).length;
  console.log(`────────────────────────────────────────`);
  console.log(`총 ${results.length}개 중 ${pass}개 성공 → referio@puzl.co.kr`);
}

main().catch(console.error);
