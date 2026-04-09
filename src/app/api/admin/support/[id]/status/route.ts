import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_STATUSES = ['open', 'in_progress', 'resolved'];
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    if (!masterEmail || user.email !== masterEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status } = await req.json();
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: updated, error } = await admin
      .from('support_tickets')
      .update({ status })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !updated) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      console.error('[Admin Status] DB error:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // Send resolved notification email to customer
    if (status === 'resolved') {
      const apiKey = process.env.RESEND_API_KEY;
      const { data: ticket } = await admin
        .from('support_tickets')
        .select('email, name, subject, message')
        .eq('id', id)
        .single();

      if (apiKey && ticket?.email) {
        const subject = ticket.subject || ticket.message?.substring(0, 50) || 'Your inquiry';

        const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Referio - Inquiry Resolved</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#111827;font-size:14px;line-height:1.6;">
        ${ticket.name || ''}님, 안녕하세요.
      </p>
      <p style="margin:0 0 16px;color:#111827;font-size:14px;line-height:1.6;">
        문의하신 내용이 해결 완료되었습니다.
      </p>
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;border-left:4px solid #16a34a;">
        <p style="margin:0;color:#166534;font-size:13px;">
          <strong>문의 제목:</strong> ${(subject || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </p>
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        추가 문의가 있으시면 대시보드에서 새 문의를 남겨주세요.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Referio 운영팀에서 발송한 자동 알림입니다.</p>
    </div>
  </div>
</body>
</html>`;

        try {
          await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `Referio <${FROM_EMAIL}>`,
              to: ticket.email,
              subject: `[Referio] 문의가 해결 완료되었습니다`,
              html,
            }),
          });
        } catch (emailErr) {
          console.error('[Admin Status] Resolved email error:', emailErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Status] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
