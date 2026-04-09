import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// Audit Log Actions
// ============================================================
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGIN_LOCKED: 'login_locked',
  LOGOUT: 'logout',

  // PII Access (SSN)
  VIEW_SSN: 'view_ssn',
  EXPORT_SSN: 'export_ssn',

  // Partner Management
  UPDATE_PARTNER: 'update_partner',
  APPROVE_PARTNER: 'approve_partner',
  REJECT_PARTNER: 'reject_partner',

  // Referral Management
  UPDATE_REFERRAL: 'update_referral',

  // Settlement
  EXPORT_SETTLEMENT: 'export_settlement',
  COMPLETE_SETTLEMENT: 'complete_settlement',

  // Admin
  IMPERSONATE: 'impersonate',
  INVITE_USER: 'invite_user',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ============================================================
// Types
// ============================================================
export type ActorType = 'admin' | 'advertiser' | 'partner' | 'system';

export interface AuditActor {
  type: ActorType;
  id?: string;
  email?: string;
}

export interface AuditResource {
  type: string;
  id?: string;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Core Logging Function (fire-and-forget, never throws)
// ============================================================

/**
 * Log an audit event. This function is designed to NEVER throw or block
 * the calling API. All errors are silently logged to console.
 */
export async function logAuditEvent(
  actor: AuditActor,
  action: AuditAction | string,
  resource?: AuditResource,
  context?: AuditContext
): Promise<void> {
  try {
    const admin = createAdminClient();

    await admin.from('audit_logs').insert({
      actor_type: actor.type,
      actor_id: actor.id ?? null,
      actor_email: actor.email ?? null,
      action,
      resource_type: resource?.type ?? null,
      resource_id: resource?.id ?? null,
      ip_address: context?.ipAddress ?? null,
      user_agent: context?.userAgent ?? null,
      metadata: context?.metadata ?? {},
    });
  } catch (error) {
    // Fire-and-forget: log failure must never impact the main request
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

// ============================================================
// Helper: Extract request context
// ============================================================

/**
 * Extract IP address and User-Agent from NextRequest headers.
 */
export function extractRequestContext(
  request: { headers: Headers }
): Pick<AuditContext, 'ipAddress' | 'userAgent'> {
  return {
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  };
}
