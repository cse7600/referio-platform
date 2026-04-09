import { createAdminClient } from '@/lib/supabase/admin';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: string; // ISO timestamp
  retryAfterSeconds?: number;
}

/**
 * Check if a login attempt is allowed.
 * Returns { allowed: true } if under the threshold, or
 * { allowed: false, retryAfterSeconds } if locked out.
 */
export async function checkLoginRateLimit(
  ipAddress: string,
  email: string
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const now = new Date();

    // Look up existing record
    const { data: record } = await admin
      .from('login_attempts')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('email', email)
      .single();

    if (!record) {
      // No prior attempts — allowed
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    // Check if currently locked
    if (record.locked_until) {
      const lockedUntil = new Date(record.locked_until);
      if (lockedUntil > now) {
        const retryAfterSeconds = Math.ceil(
          (lockedUntil.getTime() - now.getTime()) / 1000
        );
        return {
          allowed: false,
          remainingAttempts: 0,
          lockedUntil: record.locked_until,
          retryAfterSeconds,
        };
      }
      // Lockout expired — reset
      await admin
        .from('login_attempts')
        .delete()
        .eq('id', record.id);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    // Under threshold
    const remaining = MAX_ATTEMPTS - record.attempt_count;
    return {
      allowed: remaining > 0,
      remainingAttempts: Math.max(0, remaining),
    };
  } catch (error) {
    // On error, allow the attempt (fail open — don't lock out due to DB issues)
    console.error('[RATE-LIMIT] Check failed:', error);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
}

/**
 * Record a failed login attempt. Locks the account after MAX_ATTEMPTS.
 */
export async function recordFailedAttempt(
  ipAddress: string,
  email: string
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const now = new Date();

    // Upsert: increment count or create new record
    const { data: existing } = await admin
      .from('login_attempts')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('email', email)
      .single();

    if (!existing) {
      // First failure
      await admin.from('login_attempts').insert({
        ip_address: ipAddress,
        email,
        attempt_count: 1,
      });
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
    }

    const newCount = existing.attempt_count + 1;
    let lockedUntil: string | null = null;

    if (newCount >= MAX_ATTEMPTS) {
      const lockTime = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      lockedUntil = lockTime.toISOString();
    }

    await admin
      .from('login_attempts')
      .update({
        attempt_count: newCount,
        locked_until: lockedUntil,
        updated_at: now.toISOString(),
      })
      .eq('id', existing.id);

    if (lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil,
        retryAfterSeconds: LOCKOUT_MINUTES * 60,
      };
    }

    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - newCount,
    };
  } catch (error) {
    console.error('[RATE-LIMIT] Record failed:', error);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
}

/**
 * Clear login attempts on successful login.
 */
export async function clearLoginAttempts(
  ipAddress: string,
  email: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from('login_attempts')
      .delete()
      .eq('ip_address', ipAddress)
      .eq('email', email);
  } catch (error) {
    console.error('[RATE-LIMIT] Clear failed:', error);
  }
}
