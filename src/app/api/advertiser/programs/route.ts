import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: 내 프로그램 목록 (파트너 수 포함)
export async function GET() {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('programs')
      .select('*')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[advertiser/programs] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    const programs = data || [];

    // Attach approved partner count per program
    if (programs.length > 0) {
      const programIds = programs.map((p) => p.id);
      const { data: countRows } = await admin
        .from('partner_programs')
        .select('program_id')
        .in('program_id', programIds)
        .eq('status', 'approved');

      const countMap: Record<string, number> = {};
      (countRows || []).forEach((row: { program_id: string | null }) => {
        if (row.program_id) countMap[row.program_id] = (countMap[row.program_id] || 0) + 1;
      });

      return NextResponse.json({
        programs: programs.map((p) => ({ ...p, partner_count: countMap[p.id] || 0 })),
      });
    }

    return NextResponse.json({ programs });
  } catch (error) {
    console.error('[advertiser/programs] GET exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 새 프로그램 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('programs')
      .insert({
        advertiser_id: session.advertiserUuid,
        name: name.trim(),
        description: body.description ?? null,
        category: body.category ?? null,
        homepage_url: body.homepage_url ?? null,
        landing_url: body.landing_url ?? null,
        activity_guide: body.activity_guide ?? null,
        content_sources: body.content_sources ?? null,
        prohibited_activities: body.prohibited_activities ?? null,
        precautions: body.precautions ?? null,
        default_lead_commission: body.default_lead_commission ?? 0,
        default_contract_commission: body.default_contract_commission ?? 0,
        is_active: body.is_active ?? true,
        is_public: body.is_public ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('[advertiser/programs] POST error:', error);
      return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
    }

    return NextResponse.json({ program: data }, { status: 201 });
  } catch (error) {
    console.error('[advertiser/programs] POST exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
