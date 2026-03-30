import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession } from '@/lib/auth';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'noreply@updates.puzl.co.kr';
const ADMIN_EMAIL = 'referio@puzl.co.kr';

async function getCurrentUser() {
  // 1. Partner (Supabase Auth)
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
        name: partner.name || user.email?.split('@')[0] || 'Partner',
        email: partner.email || user.email || '',
      };
    }
  }

  // 2. Advertiser (cookie session)
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

// GET: Fetch ticket thread (authenticated owner only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch ticket - verify ownership
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_type', currentUser.type)
      .eq('user_id', currentUser.userId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Fetch replies
    const { data: replies } = await admin
      .from('support_replies')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    // Mark as read by user
    await admin
      .from('support_tickets')
      .update({ unread_by_user: false })
      .eq('id', id);

    return NextResponse.json({ ticket, replies: replies || [] });
  } catch (error) {
    console.error('[Feedback Detail GET] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Add reply to existing ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, image_url } = await req.json();
    if ((!message || message.trim().length === 0) && !image_url) {
      return NextResponse.json({ error: 'Message or image is required' }, { status: 400 });
    }
    if (message && message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000)' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify ticket ownership
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('id')
      .eq('id', id)
      .eq('user_type', currentUser.type)
      .eq('user_id', currentUser.userId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Save reply
    const insertData: Record<string, string> = {
      ticket_id: id,
      sender_type: 'user',
      sender_name: currentUser.name,
      body: message ? message.trim() : '',
    };
    if (image_url) {
      insertData.image_url = image_url;
    }

    const { data: reply, error: replyError } = await admin
      .from('support_replies')
      .insert(insertData)
      .select('*')
      .single();

    if (replyError) {
      console.error('[Feedback Reply] DB error:', replyError);
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    // Update ticket flags
    await admin
      .from('support_tickets')
      .update({
        status: 'open',
        unread_by_admin: true,
        unread_by_user: false,
      })
      .eq('id', id);

    // Fetch ticket info for email notification
    const { data: ticketInfo } = await admin
      .from('support_tickets')
      .select('subject, message, name, email')
      .eq('id', id)
      .single();

    // Notify admin via email
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && ticketInfo) {
      const subject = ticketInfo.subject || ticketInfo.message?.substring(0, 50) || '문의';
      const userTypeLabel = currentUser.type === 'partner' ? '파트너' : '광고주';
      const escapedBody = message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

      const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#4f46e5;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Referio 추가 문의</h1>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:80px;">구분</td><td style="padding:8px 0;color:#111827;font-size:13px;">${userTypeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">이름</td><td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">${currentUser.name}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">이메일</td><td style="padding:8px 0;color:#4f46e5;font-size:13px;">${currentUser.email}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">원문</td><td style="padding:8px 0;color:#9ca3af;font-size:12px;">${subject}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">추가 문의</td><td style="padding:8px 0;color:#111827;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escapedBody}</td></tr>
      </table>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">관리자 페이지에서 확인: /admin/support</p>
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
            from: `Referio 문의 <${FROM_EMAIL}>`,
            to: ADMIN_EMAIL,
            reply_to: currentUser.email,
            subject: `[추가 문의] ${currentUser.name}님 — ${subject}`,
            html,
          }),
        });
        const emailData = await emailRes.json();
        if (emailRes.ok) {
          console.log('[Feedback Reply] Admin notified:', emailData.id);
        } else {
          console.error('[Feedback Reply] Email API error:', emailRes.status, emailData);
        }
      } catch (emailErr) {
        console.error('[Feedback Reply] Email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('[Feedback Reply] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
