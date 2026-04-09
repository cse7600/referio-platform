import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    if (!masterEmail || user.email !== masterEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch tickets with reply count
    const { data: tickets, error } = await admin
      .from('support_tickets')
      .select('id, user_type, user_id, name, email, subject, message, status, unread_by_admin, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Support GET] DB error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // Fetch reply counts per ticket
    const ticketIds = (tickets || []).map(t => t.id);
    let replyCounts: Record<string, number> = {};

    if (ticketIds.length > 0) {
      const { data: replies } = await admin
        .from('support_replies')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      if (replies) {
        for (const r of replies) {
          replyCounts[r.ticket_id] = (replyCounts[r.ticket_id] || 0) + 1;
        }
      }
    }

    const ticketsWithCounts = (tickets || []).map(t => ({
      ...t,
      replyCount: replyCounts[t.id] || 0,
    }));

    return NextResponse.json({ tickets: ticketsWithCounts });
  } catch (error) {
    console.error('[Admin Support GET] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
