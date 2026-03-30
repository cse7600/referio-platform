import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';

export async function POST(
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

    const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
    if (!masterEmail || user.email !== masterEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { body: replyBody, image_url: imageUrl } = await req.json();
    const hasBody = replyBody && replyBody.trim().length > 0;
    const hasImage = imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0;

    if (!hasBody && !hasImage) {
      return NextResponse.json({ error: 'Reply body or image is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('id, email, name, subject, message')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Save reply
    const insertData: Record<string, string> = {
      ticket_id: id,
      sender_type: 'admin',
      sender_name: 'Referio 운영팀',
      body: hasBody ? replyBody.trim() : '',
    };
    if (hasImage) {
      insertData.image_url = imageUrl.trim();
    }

    const { data: reply, error: replyError } = await admin
      .from('support_replies')
      .insert(insertData)
      .select('*')
      .single();

    if (replyError) {
      console.error('[Admin Reply] DB error:', replyError);
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    // Update ticket status + unread flag
    await admin
      .from('support_tickets')
      .update({
        status: 'in_progress',
        unread_by_user: true,
        unread_by_admin: false,
      })
      .eq('id', id);

    // Send email notification to customer
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && ticket.email) {
      const subject = ticket.subject || ticket.message?.substring(0, 50) || '문의';
      const escapedBody = replyBody.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

      const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Referio 문의 답변</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">안녕하세요, ${ticket.name}님.</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">문의하신 내용에 대해 답변 드립니다.</p>

      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #4f46e5;">
        <p style="margin:0;color:#111827;font-size:14px;line-height:1.7;">${escapedBody}</p>
      </div>

      <p style="margin:0;color:#6b7280;font-size:13px;">
        추가 문의가 있으시면 대시보드에서 답변하실 수 있습니다.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Referio 운영팀에서 발송한 자동 알림입니다.</p>
    </div>
  </div>
</body>
</html>`;

      try {
        const emailRes = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Referio <${FROM_EMAIL}>`,
            to: ticket.email,
            subject: `[Referio 답변] ${subject}`,
            html,
          }),
        });
        const emailData = await emailRes.json();
        if (emailRes.ok) {
          console.log('[Admin Reply] Email sent:', emailData.id, '->', ticket.email);
        } else {
          console.error('[Admin Reply] Email API error:', emailRes.status, emailData);
        }
      } catch (emailErr) {
        console.error('[Admin Reply] Email send error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('[Admin Reply] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
