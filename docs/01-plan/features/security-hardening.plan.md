# Security Hardening Plan

**Version**: 1.1
**Created**: 2026-04-09
**Last Updated**: 2026-04-09
**Status**: Phase 1+2 완료 / Phase 3(MFA) 미시작
**Priority**: P0 (Enterprise readiness)

---

## 1. Overview

Referio platform security hardening to achieve enterprise-grade security level.
Benchmark: recatch.cc (B2B SaaS reference platform).

### Goals
- Comply with Korean Personal Information Protection Act (PIPA) audit log requirements
- Prevent brute-force login attacks
- Enforce proper data isolation via Supabase RLS
- Prepare foundation for MFA and security dashboard

---

## 2. Features

### 2.1 Audit Log System (P0)

**User Stories**:
- As a system admin, I want to see who accessed sensitive data (SSN) and when
- As a system admin, I want login/logout event history for all actor types
- As a compliance officer, I need 6-month retention of all PII access logs

**Scope**:
- `audit_logs` table (migration 031)
- `src/lib/audit.ts` - fire-and-forget logging utility
- Instrumented APIs: SSN export, advertiser login, admin partner management
- Admin UI: `/admin/audit-logs` page (future phase)

**Completion Criteria**:
- [x] Migration 031 applied to Supabase ✅ 2026-04-09
- [x] `logAuditEvent()` function created with proper error isolation ✅ src/lib/audit.ts
- [x] SSN export logs `view_ssn` and `export_ssn` events ✅
- [x] Advertiser login logs `login_success` and `login_failure` events ✅
- [x] Admin partner updates log `update_partner` events ✅
- [x] Audit log failures never block main API responses ✅ (fire-and-forget)

### 2.2 Login Rate Limiting (P0)

**User Stories**:
- As a security engineer, I want brute-force attacks blocked after 5 failed attempts
- As an advertiser, I want to be informed when my account is temporarily locked

**Scope**:
- `login_attempts` table (migration 031, same file)
- Rate limit check in `/api/auth/advertiser/login`
- 5 failures per IP+email combo = 15-minute lockout
- Auto-cleanup of expired records

**Completion Criteria**:
- [x] `login_attempts` table created ✅ migration 031
- [x] Login API checks attempt count before authentication ✅ src/lib/rate-limit.ts
- [x] Locked accounts return 429 with remaining lockout time ✅
- [x] Successful login resets attempt counter ✅
- [x] Expired lockout records cleaned on access ✅

### 2.3 RLS Policy Hardening (P0)

**User Stories**:
- As a security auditor, I want no `USING(true)` policies on tenant-scoped tables
- As an advertiser, I want assurance that my webhook configs are invisible to others

**Scope**:
- Replace `USING(true)` on: `webhook_integrations`, `partner_api_keys`, `api_usage_logs`, `partner_links`
- Apply `service_role`-only policies (matches current API architecture using admin client)

**Completion Criteria**:
- [x] Migration 032 created and applied ✅ 2026-04-09
- [x] All 4 tables have `service_role`-only RLS policies ✅
- [x] No `USING(true)` anonymous access remains on tenant data ✅
- [x] Existing API functionality unaffected (all use service_role client) ✅ 빌드 성공 확인

### 2.4 MFA / Two-Factor Authentication (P1 - Future)

**Scope**: Supabase TOTP enrollment + verification UI for partners and advertisers.
**Prerequisites**: Audit log system must be in place first.
**Status**: PRD needed before implementation.

### 2.5 Security Dashboard (P2 - Future)

**Scope**: Admin-facing security event monitoring page.
**Prerequisites**: Audit log + login rate limiting must be in place.
**Status**: PRD needed before implementation.

---

## 3. Technical Architecture

### Audit Log Table Schema

```
audit_logs
- id (UUID PK)
- actor_type (enum: admin, advertiser, partner, system)
- actor_id (TEXT)
- actor_email (TEXT)
- action (TEXT - login, logout, view_ssn, export_ssn, update_partner, etc.)
- resource_type (TEXT - partner, settlement, referral, etc.)
- resource_id (TEXT)
- ip_address (TEXT)
- user_agent (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ, indexed)
```

### Login Attempts Table Schema

```
login_attempts
- id (UUID PK)
- ip_address (TEXT)
- email (TEXT)
- attempt_count (INT)
- locked_until (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- UNIQUE(ip_address, email)
```

### Fire-and-Forget Pattern

```typescript
// audit.ts - never throws, never blocks
export async function logAuditEvent(...) {
  try { await insert } catch { console.error }
}
```

---

## 4. Implementation Order

1. Migration 031: `audit_logs` + `login_attempts` tables
2. `src/lib/audit.ts`: Logging utility
3. Instrument login API: rate limiting + audit logging
4. Instrument SSN export API: audit logging
5. Instrument admin partner API: audit logging
6. Migration 032: RLS policy hardening
7. Build verification

---

## 5. Already Completed (Today)

| Item | Status |
|------|--------|
| Security headers (7 headers in next.config.ts) | Done |
| Admin email env var hardening (NEXT_PUBLIC_ removal) | Done |
| Cron authentication enforcement | Done |
| Mass Assignment defense (admin PATCH allowlist) | Done |

---

## Build History

| Date | Build Type | Changes | Result |
|------|-----------|---------|--------|
| 2026-04-09 | production | Audit log + login rate limit + RLS hardening migration + API instrumentation | Success |
