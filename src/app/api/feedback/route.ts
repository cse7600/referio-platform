import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession } from '@/lib/auth';
import { notifyFeedback } from '@/lib/slack';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const TO_EMAIL = 'referio@puzl.co.kr';

async function getCurrentUser() {
  // 1. 파트너 (Supabase Auth) 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: partner } = await admin
      .from('partners')
      .select('id, name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (partner) {
      return {
        type: 'partner' as const,
        userId: partner.id,
        name: partner.name || user.email?.split('@')[0] || '파트너',
        email: partner.email || user.email || '',
      };
    }
  }

  // 2. 광고주 (쿠키 세션) 확인
  const advertiser = await getAdvertiserSession();
  if (advertiser) {
    return {
      type: 'advertiser' as const,
      userId: advertiser.advertiserUuid,
      name: advertiser.name,
      email: advertiser.userId,
    };
  }

  return null;
}

// GET: 현재 유저 정보 + 문의 이력
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: tickets } = await admin
      .from('support_tickets')
      .select('id, message, created_at')
      .eq('user_type', currentUser.type)
      .eq('user_id', currentUser.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      user: { name: currentUser.name, email: currentUser.email },
      tickets: tickets || [],
    });
  } catch (error) {
    console.error('[Feedback GET] 오류:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// POST: 문의 저장 + 이메일 발송
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: '문의 내용을 입력해주세요.' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: '내용이 너무 깁니다 (2000자 이내).' }, { status: 400 });
    }

    const admin = createAdminClient();

    // DB 저장
    const { data: ticket, error: dbError } = await admin
      .from('support_tickets')
      .insert({
        user_type: currentUser.type,
        user_id: currentUser.userId,
        name: currentUser.name,
        email: currentUser.email,
        message: message.trim(),
      })
      .select('id, message, created_at')
      .single();

    if (dbError) {
      console.error('[Feedback POST] DB 저장 실패:', dbError);
      return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    }

    // Slack 알림 (비동기)
    notifyFeedback({
      userName: currentUser.name,
      userEmail: currentUser.email,
      userType: currentUser.type,
      message: message.trim(),
    }).catch(() => {});

    // 이메일 발송
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const userTypeLabel = currentUser.type === 'partner' ? '파트너' : '광고주';
      const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Referio 파트너 문의</h1>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;width:80px;vertical-align:top;">구분</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;">${userTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">이름</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">${currentUser.name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">이메일</td>
          <td style="padding:8px 0;color:#4f46e5;font-size:13px;">${currentUser.email}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">내용</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;line-height:1.6;white-space:pre-wrap;">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        </tr>
      </table>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Referio 문의하기 위젯에서 자동 발송</p>
    </div>
  </div>
</body>
</html>`;

      fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Referio 문의 <${FROM_EMAIL}>`,
          to: TO_EMAIL,
          reply_to: currentUser.email,
          subject: `[파트너 문의] ${currentUser.name}님의 문의`,
          html,
        }),
      }).catch(err => console.error('[Feedback] 이메일 전송 실패:', err));
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('[Feedback POST] 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
