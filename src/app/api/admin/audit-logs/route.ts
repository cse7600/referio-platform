import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  // Filters
  const actorType = searchParams.get('actor_type') || '';
  const action = searchParams.get('action') || '';
  const search = searchParams.get('search') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  const admin = createAdminClient();

  // Build query
  let query = admin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (actorType) {
    query = query.eq('actor_type', actorType);
  }
  if (action) {
    query = query.eq('action', action);
  }
  if (search) {
    query = query.ilike('actor_email', `%${search}%`);
  }
  if (dateFrom) {
    query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
  }
  if (dateTo) {
    query = query.lte('created_at', `${dateTo}T23:59:59Z`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get distinct actions for filter dropdown
  const { data: actionsData } = await admin
    .from('audit_logs')
    .select('action')
    .limit(1000);

  const distinctActions = actionsData
    ? [...new Set(actionsData.map(a => a.action))].sort()
    : [];

  return NextResponse.json({
    logs: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    distinctActions,
  });
}
