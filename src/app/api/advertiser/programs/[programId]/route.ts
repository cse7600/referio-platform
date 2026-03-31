import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNewProgramEmail } from '@/lib/email';

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

    // Ownership check — also fetch current is_active and program details for email trigger
    const { data: existing, error: fetchError } = await admin
      .from('programs')
      .select('advertiser_id, is_active, name, description, default_lead_commission, default_contract_commission')
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

    // Trigger new-program email when is_active flips from false → true
    const isActivating = body.is_active === true && existing.is_active === false;
    if (isActivating) {
      // Fire-and-forget: do not block the API response
      void triggerNewProgramEmail(admin, programId, data, session.advertiserUuid);
    }

    return NextResponse.json({ program: data });
  } catch (error) {
    console.error('[advertiser/programs/[programId]] PATCH exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetch eligible partners and send new-program announcement email.
 * Eligible = has auth account + NOT already in this program + active program count <= 2.
 * Runs asynchronously so it never delays the PATCH response.
 */
async function triggerNewProgramEmail(
  admin: ReturnType<typeof createAdminClient>,
  programId: string,
  program: {
    name: string;
    description: string | null;
    default_lead_commission: number;
    default_contract_commission: number;
    advertiser_id: string;
  },
  advertiserUuid: string
): Promise<void> {
  try {
    // Fetch advertiser company name
    const { data: advertiser } = await admin
      .from('advertisers')
      .select('company_name')
      .eq('id', advertiserUuid)
      .single();

    const advertiserName = advertiser?.company_name ?? '';

    // Fetch all partner IDs already enrolled in this program (any status)
    const { data: enrolled } = await admin
      .from('partner_programs')
      .select('partner_id')
      .eq('program_id', programId);

    const enrolledIds = (enrolled ?? []).map((r: { partner_id: string }) => r.partner_id);

    // Fetch partners who have auth accounts and <= 2 active enrolled programs
    // Step 1: get all partners with auth_user_id
    const { data: allPartners } = await admin
      .from('partners')
      .select('id')
      .not('auth_user_id', 'is', null);

    if (!allPartners || allPartners.length === 0) return;

    // Step 2: exclude already enrolled
    const candidateIds = allPartners
      .map((p: { id: string }) => p.id)
      .filter((id: string) => !enrolledIds.includes(id));

    if (candidateIds.length === 0) return;

    // Step 3: for each candidate, count active programs (approved status)
    // Use a grouped query: partner_programs where partner_id IN candidates AND status='approved'
    const { data: programCounts } = await admin
      .from('partner_programs')
      .select('partner_id')
      .in('partner_id', candidateIds)
      .eq('status', 'approved');

    // Count per partner
    const countMap: Record<string, number> = {};
    for (const row of (programCounts ?? [])) {
      const pid = (row as { partner_id: string }).partner_id;
      countMap[pid] = (countMap[pid] ?? 0) + 1;
    }

    // Max 2 active programs to be eligible
    const MAX_ACTIVE_PROGRAMS = 2;
    const eligibleIds = candidateIds.filter(
      (id: string) => (countMap[id] ?? 0) <= MAX_ACTIVE_PROGRAMS
    );

    if (eligibleIds.length === 0) return;

    const shortDescription =
      program.description
        ? program.description.replace(/<[^>]*>/g, '').slice(0, 80)
        : `${advertiserName} 파트너 프로그램`;

    await sendNewProgramEmail({
      programId,
      programName: program.name,
      advertiserName,
      commissionValid: program.default_lead_commission ?? 0,
      commissionContract: program.default_contract_commission ?? 0,
      shortDescription,
      partnerIds: eligibleIds,
    });
  } catch (err) {
    // Do not crash the request — just log
    console.error('[triggerNewProgramEmail] 오류:', err);
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
