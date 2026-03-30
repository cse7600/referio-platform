import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_STATUSES = ['open', 'in_progress', 'resolved'];

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

    const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
    if (!masterEmail || user.email !== masterEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status } = await req.json();
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('support_tickets')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('[Admin Status] DB error:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Status] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
