import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendViolationWarningEmail } from '@/lib/email';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await verifyAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: partnerId } = await params;

  let body: {
    violationDescription: string;
    occurredAt?: string;
    programId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { violationDescription, occurredAt, programId } = body;

  if (!violationDescription || violationDescription.trim().length === 0) {
    return NextResponse.json({ error: 'violationDescription is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve partner email and name
  const { data: partner, error: partnerError } = await admin
    .from('partners')
    .select('id, name, email, auth_user_id')
    .eq('id', partnerId)
    .single();

  if (partnerError || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  // If email not directly on partner, retrieve from auth.users via auth_user_id
  let partnerEmail: string | null = partner.email ?? null;
  if (!partnerEmail && partner.auth_user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(partner.auth_user_id);
    partnerEmail = authUser?.user?.email ?? null;
  }

  if (!partnerEmail) {
    return NextResponse.json({ error: 'Partner email not found' }, { status: 422 });
  }

  // Resolve program name if programId is given
  let programName: string | undefined;
  if (programId) {
    const { data: prog } = await admin
      .from('programs')
      .select('name')
      .eq('id', programId)
      .single();
    programName = prog?.name ?? undefined;
  }

  const confirmedAt = new Date().toISOString();
  const resolvedOccurredAt = occurredAt ? new Date(occurredAt) : new Date();

  // Insert violation log record
  const { data: violation, error: insertError } = await admin
    .from('violation_logs')
    .insert({
      partner_id: partnerId,
      program_id: programId ?? null,
      description: violationDescription.trim(),
      occurred_at: resolvedOccurredAt.toISOString(),
      confirmed_by: adminUser.email ?? 'admin',
      confirmed_at: confirmedAt,
    })
    .select('id')
    .single();

  if (insertError || !violation) {
    console.error('[violation/route] insert error:', insertError);
    return NextResponse.json({ error: 'Failed to create violation log' }, { status: 500 });
  }

  // Send warning email
  const emailSent = await sendViolationWarningEmail({
    partnerEmail,
    partnerName: partner.name ?? '파트너',
    partnerId,
    programName,
    programId,
    violationDescription: violationDescription.trim(),
    occurredAt: resolvedOccurredAt,
  });

  // Update email_sent_at if email was sent
  if (emailSent) {
    await admin
      .from('violation_logs')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', violation.id);
  }

  return NextResponse.json({ success: true, violationId: violation.id, emailSent });
}
