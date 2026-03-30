import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _req: NextRequest,
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

    const admin = createAdminClient();

    // Fetch ticket
    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
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

    // Mark as read by admin
    await admin
      .from('support_tickets')
      .update({ unread_by_admin: false })
      .eq('id', id);

    return NextResponse.json({ ticket, replies: replies || [] });
  } catch (error) {
    console.error('[Admin Support Detail] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
