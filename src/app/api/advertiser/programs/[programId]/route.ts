import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: 프로그램 상세
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Ownership check
    if (data.advertiser_id !== session.advertiserUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ program: data });
  } catch (error) {
    console.error('[advertiser/programs/[programId]] GET exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 프로그램 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Ownership check first
    const { data: existing, error: fetchError } = await admin
      .from('programs')
      .select('advertiser_id')
      .eq('id', programId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (existing.advertiser_id !== session.advertiserUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields = [
      'name', 'description', 'category',
      'homepage_url', 'landing_url',
      'activity_guide', 'content_sources', 'prohibited_activities', 'precautions',
      'default_lead_commission', 'default_contract_commission',
      'is_active', 'is_public',
    ] as const;

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) {
        updatePayload[field] = body[field];
      }
    }

    const { data, error } = await admin
      .from('programs')
      .update(updatePayload)
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      console.error('[advertiser/programs/[programId]] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
    }

    return NextResponse.json({ program: data });
  } catch (error) {
    console.error('[advertiser/programs/[programId]] PATCH exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 프로그램 soft delete (is_active = false)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Ownership check first
    const { data: existing, error: fetchError } = await admin
      .from('programs')
      .select('advertiser_id')
      .eq('id', programId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (existing.advertiser_id !== session.advertiserUuid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await admin
      .from('programs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', programId);

    if (error) {
      console.error('[advertiser/programs/[programId]] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[advertiser/programs/[programId]] DELETE exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
