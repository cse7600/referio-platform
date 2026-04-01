// Test script: send event notification email to referio@puzl.co.kr
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const TO_EMAIL = 'referio@puzl.co.kr';

const eventTitle = '4월 첫 활동 이벤트';
const eventType = 'post_verification';
const rewardDescription = '커피 쿠폰';
const startDate = '2026-04-01';
const endDate = '2026-04-30';
const bannerBgColor = '#fffaeb';
const advertiserName = '한화비전';
const programName = '한화비전 키퍼 메이트';
const partnerName = '테스트님';

const eventUrl = 'https://referio.puzl.co.kr/dashboard/events';

const TYPE_LABELS = { event: '이벤트', bonus: '보너스', ranking: '랭킹', post_verification: '게시물 인증' };
const PARTICIPATION_GUIDES = {
  post_verification: [
    '아래 버튼을 눌러 Referio 대시보드로 이동하세요',
    '이벤트 탭에서 게시물 인증 이벤트를 확인하세요',
    '블로그/SNS에 게시물을 작성하고 URL을 제출하세요',
    '검토 완료 후 리워드가 지급됩니다',
  ],
};

const typeLabel = TYPE_LABELS[eventType];
const guideSteps = PARTICIPATION_GUIDES[eventType];
const dateText = `${startDate} ~ ${endDate}`;
const headerBg = bannerBgColor || '#4f46e5';

const stepsHtml = guideSteps.map((step, i) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
    <tr>
      <td width="28" valign="top" style="padding-top:1px;">
        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#4f46e5;color:#fff;font-size:12px;font-weight:700;line-height:22px;text-align:center;">${i + 1}</span>
      </td>
      <td valign="top" style="font-size:14px;color:#374151;line-height:1.5;padding-top:3px;">${step}</td>
    </tr>
  </table>`).join('');

const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${eventTitle}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Segoe UI Emoji','Segoe UI Symbol',Helvetica,sans-serif;">
  <div style="max-width:580px;margin:40px auto 60px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#4f46e5;">
      <tr>
        <td style="padding:24px 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="32" style="vertical-align:middle;">
                <div style="width:32px;height:32px;background:#ffffff;border-radius:8px;text-align:center;line-height:32px;">
                  <span style="color:#4f46e5;font-weight:900;font-size:16px;">R</span>
                </div>
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Referio</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="background:${headerBg};padding:32px 32px 28px;">
      <div style="display:inline-block;background:rgba(255,255,255,0.25);border-radius:20px;padding:4px 12px;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:600;color:#1e1b4b;">${typeLabel}</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1e1b4b;line-height:1.3;">${eventTitle}</h1>
      <p style="margin:0 0 4px;font-size:15px;color:#312e81;font-weight:600;">리워드: ${rewardDescription}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#4338ca;">기간: ${dateText}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 6px;font-size:15px;color:#374151;">안녕하세요, <strong>${partnerName}</strong></p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${advertiserName}</strong>의 <strong>${programName}</strong> 파트너 여러분께<br>
        새로운 이벤트 소식을 전합니다!
      </p>
      <div style="height:1px;background:#e5e7eb;margin:0 0 24px;"></div>
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">참여 방법</h2>
      ${stepsHtml}
      <div style="text-align:center;margin:32px 0 8px;">
        <a href="${eventUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:-0.2px;">이벤트 참여하기 →</a>
      </div>
      <p style="text-align:center;margin:12px 0 0;font-size:12px;color:#9ca3af;">버튼이 작동하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요<br>
        <a href="${eventUrl}" style="color:#6366f1;font-size:11px;">${eventUrl}</a>
      </p>
      <div style="height:1px;background:#e5e7eb;margin:28px 0;"></div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        더 이상 이 이메일을 받지 않으려면 <a href="https://referio.puzl.co.kr/dashboard/profile" style="color:#6b7280;">수신거부</a>하세요
      </p>
    </div>
  </div>
</body>
</html>`;

async function main() {
  console.log(`Sending test email to ${TO_EMAIL}...`);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    subject: `[테스트] ${eventTitle} 이벤트 알림`,
    html,
  });
  if (error) {
    console.error('Failed:', error);
  } else {
    console.log('Sent! ID:', data?.id);
  }
}

main();
