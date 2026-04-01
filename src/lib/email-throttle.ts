// CRM 이메일 발송 제한(Throttle) 유틸리티
// 쿨다운 규칙, 중복 방지, 우선순위 큐 로직

import { createAdminClient } from '@/lib/supabase/admin';

export type EmailType =
  | 'onboarding_welcome'
  | 'onboarding_nudge'
  | 'onboarding_approved'
  | 'activity_nudge'
  | 'activity_new_program'
  | 'activity_monthly_report'
  | 'performance_first_lead'
  | 'performance_first_revenue'
  | 'performance_tier_upgrade'
  | 'settlement_confirmed'
  | 'settlement_info_request'
  | 'settlement_paid'
  | 'violation_warning'
  | 'account_deleted'
  | 'program_rejected'
  | 'event_notification';

export type ThrottleCheckResult = {
  canSend: boolean;
  reason?: 'daily_limit_exceeded' | 'duplicate_within_24h' | 'lower_priority' | 'opted_out';
};

// Priority: lower number = higher priority. 0 = mandatory (no throttle).
export const PRIORITY_MAP: Record<EmailType, number> = {
  performance_first_lead:     1,
  performance_first_revenue:  1,
  performance_tier_upgrade:   1,
  onboarding_welcome:         2,
  onboarding_approved:        2,
  activity_nudge:             3,
  activity_new_program:       3,
  event_notification:         3,
  onboarding_nudge:           4,
  activity_monthly_report:    4,
  settlement_confirmed:       0,
  settlement_info_request:    0,
  settlement_paid:            0,
  violation_warning:          0,
  account_deleted:            0,
  program_rejected:           0,
};

// Returns the KST midnight as a UTC Date object (for daily quota calculation)
function getTodayKSTMidnightUTC(): Date {
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(nowKST.toISOString().slice(0, 10) + 'T00:00:00+09:00');
}

/**
 * Check if an email can be sent to a partner.
 * Mandatory emails (isMandatory=true) always return { canSend: true }.
 */
export async function canSendEmail(
  partnerId: string,
  emailType: EmailType,
  isMandatory: boolean
): Promise<ThrottleCheckResult> {
  if (isMandatory) return { canSend: true };

  const supabase = createAdminClient();

  // Check if partner has opted out of marketing emails
  const { data: partnerRow } = await supabase
    .from('partners')
    .select('email_opted_out')
    .eq('id', partnerId)
    .single();
  if (partnerRow?.email_opted_out) {
    return { canSend: false, reason: 'opted_out' };
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check duplicate within 24h
  const { count: dupCount } = await supabase
    .from('email_log')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('email_type', emailType)
    .eq('status', 'sent')
    .gte('sent_at', since24h.toISOString());

  if (dupCount && dupCount > 0) {
    return { canSend: false, reason: 'duplicate_within_24h' };
  }

  // Check daily limit (marketing emails only)
  const todayMidnightUTC = getTodayKSTMidnightUTC();

  const { count: dailyCount } = await supabase
    .from('email_log')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('is_mandatory', false)
    .eq('status', 'sent')
    .gte('sent_at', todayMidnightUTC.toISOString());

  if (dailyCount && dailyCount >= 2) {
    return { canSend: false, reason: 'daily_limit_exceeded' };
  }

  return { canSend: true };
}

/**
 * Check if a partner has opted out of marketing emails.
 * Used by email functions that don't go through the full throttle pipeline.
 */
export async function isEmailOptedOut(partnerId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partners')
    .select('email_opted_out')
    .eq('id', partnerId)
    .single();
  return !!data?.email_opted_out;
}

/**
 * Log an email send event to email_log.
 * Call after successful send (status='sent') or on deferral (status='deferred').
 */
export async function logEmailSent(params: {
  partnerId: string;
  emailType: EmailType;
  isMandatory: boolean;
  programId?: string;
  status?: 'sent' | 'deferred' | 'failed';
  deferredReason?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_log').insert({
    partner_id: params.partnerId,
    email_type: params.emailType,
    is_mandatory: params.isMandatory,
    program_id: params.programId ?? null,
    status: params.status ?? 'sent',
    deferred_reason: params.deferredReason ?? null,
  });
  if (error) {
    console.error('[EmailThrottle] logEmailSent error:', error);
  }
}

/**
 * Resolve which emails to send from a list of candidates for a partner.
 * Respects daily limit and priority order.
 * Used by Cron jobs that may have multiple email candidates per partner.
 */
export async function resolveEmailQueue(
  partnerId: string,
  candidates: EmailType[]
): Promise<{ toSend: EmailType[]; deferred: EmailType[] }> {
  const toSend: EmailType[] = [];
  const deferred: EmailType[] = [];

  const supabase = createAdminClient();
  const todayMidnightUTC = getTodayKSTMidnightUTC();

  const { count: dailySentCount } = await supabase
    .from('email_log')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('is_mandatory', false)
    .eq('status', 'sent')
    .gte('sent_at', todayMidnightUTC.toISOString());

  const alreadySent = dailySentCount ?? 0;
  let remainingSlots = Math.max(0, 2 - alreadySent);

  // Check each candidate individually, collect sendable ones
  const sendable: EmailType[] = [];
  for (const emailType of candidates) {
    const isMandatory = PRIORITY_MAP[emailType] === 0;
    const result = await canSendEmail(partnerId, emailType, isMandatory);
    if (result.canSend) {
      sendable.push(emailType);
    } else {
      deferred.push(emailType);
    }
  }

  // Sort sendable by priority (ascending = higher priority first)
  sendable.sort((a, b) => (PRIORITY_MAP[a] || 99) - (PRIORITY_MAP[b] || 99));

  for (const emailType of sendable) {
    const isMandatory = PRIORITY_MAP[emailType] === 0;
    if (isMandatory || remainingSlots > 0) {
      toSend.push(emailType);
      if (!isMandatory) remainingSlots--;
    } else {
      deferred.push(emailType);
    }
  }

  return { toSend, deferred };
}
