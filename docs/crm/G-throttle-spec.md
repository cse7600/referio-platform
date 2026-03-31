# Stream G: 이메일 발송 제한 (Throttle) — 기술 스펙

**버전**: 1.0
**작성일**: 2026-03-31
**문서 유형**: 기술 스펙 (구현 가이드)
**연관 파일**: `src/lib/email.ts`, `src/lib/email-throttle.ts` (신규), `supabase/migrations/`

---

## 1. 쿨다운 규칙 전체 정의

### 1.1 기본 규칙

| 규칙 | 내용 |
|------|------|
| **일일 최대 발송 수** | 파트너당 마케팅/참여 이메일 1일 최대 **2통** |
| **동일 트리거 중복 방지** | 동일 `email_type` + 동일 파트너: 24시간 내 재발송 불가 |
| **Cron 이월** | 쿨다운으로 당일 발송 불가 시 → 다음 날 Cron 실행 시 재시도 (별도 큐 없이 조건 재판단) |
| **우선순위 충돌** | 같은 날 2통 한도 초과 시 우선순위 낮은 이메일은 다음 날로 이월 |

### 1.2 이메일 분류표

| 구분 | 해당 이메일 | 쿨다운 적용 | 우선순위 |
|------|------------|------------|----------|
| **즉시 발송 (예외)** | 10 정산확정, 11 정산정보요청, 12 입금완료, 13 위반경고, 14 탈퇴, 15 파트너거절 | 적용 안 됨 | — |
| **성과 이메일** | 7 첫유입축하, 8 첫수익확정, 9 티어승급 | 적용됨 | **1순위** |
| **온보딩 이메일** | 1 가입축하, 3 승인완료 | 적용됨 | **2순위** |
| **활동 이메일** | 4 활동미감지넛지, 5 신규프로그램안내 | 적용됨 | **3순위** |
| **Cron 이메일** | 2 참여독려, 6 월간리포트 | 적용됨 | **4순위** |

### 1.3 충돌 시나리오별 처리

| 시나리오 | 처리 방식 |
|---------|---------|
| 이메일 2 (Cron) + 이메일 5 (활동) 같은 날 | 이메일 5(3순위)만 발송, 이메일 2(4순위)는 다음 날 이월 |
| 이메일 2 (Cron) + 이메일 7 (성과) 같은 날 | 이메일 7(1순위)만 발송, 이메일 2(4순위)는 다음 날 이월 |
| 이메일 6 (월간리포트) + 이메일 4 (활동) 같은 날 | 이메일 4(3순위)만 발송, 이메일 6(4순위)는 다음 날 이월 |
| 이메일 7 (성과) + 이메일 8 (성과) 같은 날 | 둘 다 발송 (2통 한도 내, 동순위) |
| 이메일 10 (정산, 즉시) + 이메일 2 (Cron) 같은 날 | 이메일 10 즉시 발송. 이메일 2는 일일 2통 한도 카운트에 포함 후 판단 |

> **즉시 발송 이메일(10~15)은 일일 한도 카운트에 포함되지 않는다.** 즉, 정산 이메일과 Cron 이메일이 같은 날 나가도 Cron 이메일 쿨다운 카운트는 별도로 계산된다.

---

## 2. email_log 테이블 SQL

```sql
-- Migration: 022_email_log.sql
CREATE TABLE IF NOT EXISTS email_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email_type      TEXT NOT NULL,
  -- 이메일 유형 값 목록:
  -- 'onboarding_welcome'       (이메일 1)
  -- 'onboarding_nudge'         (이메일 2, Cron)
  -- 'onboarding_approved'      (이메일 3)
  -- 'activity_nudge'           (이메일 4, Cron)
  -- 'activity_new_program'     (이메일 5)
  -- 'activity_monthly_report'  (이메일 6, Cron)
  -- 'performance_first_lead'   (이메일 7)
  -- 'performance_first_revenue'(이메일 8)
  -- 'performance_tier_upgrade' (이메일 9)
  -- 'settlement_confirmed'     (이메일 10, 즉시 발송)
  -- 'settlement_info_request'  (이메일 11, 즉시 발송)
  -- 'settlement_paid'          (이메일 12, 즉시 발송)
  -- 'violation_warning'        (이메일 13, 즉시 발송)
  -- 'account_deleted'          (이메일 14, 즉시 발송)
  -- 'program_rejected'         (이메일 15, 즉시 발송)
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_mandatory    BOOLEAN NOT NULL DEFAULT false,
  -- true = 즉시 발송 예외 (10~15번). 쿨다운 카운트 미포함.
  program_id      UUID REFERENCES partner_programs(id) ON DELETE SET NULL,
  -- nullable. 프로그램 단위로 발송하는 이메일(3, 5, 7, 8, 9 등)에만 사용.
  status          TEXT NOT NULL DEFAULT 'sent',
  -- 'sent' | 'deferred' (이월) | 'failed'
  deferred_reason TEXT
  -- 이월 사유: 'daily_limit_exceeded' | 'duplicate_within_24h' | 'lower_priority'
);

-- 인덱스: 쿨다운 체크 성능 최적화
CREATE INDEX idx_email_log_partner_sent
  ON email_log (partner_id, sent_at DESC);

CREATE INDEX idx_email_log_partner_type
  ON email_log (partner_id, email_type, sent_at DESC);

-- 이월된 레코드 조회용 (Cron 재시도 없이 조건 재판단 방식 사용 시 불필요할 수 있음)
CREATE INDEX idx_email_log_deferred
  ON email_log (status, sent_at)
  WHERE status = 'deferred';
```

### 테이블 설계 결정 사유

| 결정 | 이유 |
|------|------|
| `is_mandatory` 필드 | 즉시 발송 이메일을 쿨다운 카운트에서 제외하는 판단을 DB 레벨에서도 명확히 |
| `program_id` nullable | 프로그램 무관 이메일(2, 6, 13, 14)에 NULL 허용. JOIN 없이도 단독 조회 가능 |
| `status` 컬럼 | 이월 발생 이력 추적 가능. 향후 "미발송 비율" 모니터링에 활용 |
| 별도 큐 테이블 없음 | Cron 이메일은 매일 재판단 방식으로 충분. 큐 테이블은 오버엔지니어링 |

---

## 3. canSendEmail() 함수 설계

### 함수 시그니처

```typescript
// src/lib/email-throttle.ts

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
  | 'program_rejected';

export type ThrottleCheckResult = {
  canSend: boolean;
  reason?: 'daily_limit_exceeded' | 'duplicate_within_24h' | 'lower_priority';
};

/**
 * 파트너에게 특정 이메일을 발송할 수 있는지 쿨다운 규칙을 체크한다.
 *
 * @param partnerId  - 수신자 파트너 UUID
 * @param emailType  - 발송할 이메일 유형
 * @param isMandatory - true이면 즉시 발송 예외 (10~15번). 항상 true 반환.
 * @returns { canSend: boolean, reason?: string }
 */
export async function canSendEmail(
  partnerId: string,
  emailType: EmailType,
  isMandatory: boolean
): Promise<ThrottleCheckResult>
```

### 로직 설명 (단계별)

```
1. isMandatory === true
   → 즉시 { canSend: true } 반환. DB 조회 불필요.

2. 24시간 내 동일 email_type 발송 여부 확인
   → email_log 조회: partner_id = ? AND email_type = ? AND sent_at > now() - interval '24 hours' AND status = 'sent'
   → 1건 이상 존재하면 → { canSend: false, reason: 'duplicate_within_24h' }

3. 오늘(KST 기준 자정~현재) 발송된 마케팅 이메일 수 확인
   → email_log 조회: partner_id = ? AND is_mandatory = false AND status = 'sent'
     AND sent_at >= (오늘 KST 자정의 UTC 변환값)
   → count >= 2이면 → { canSend: false, reason: 'daily_limit_exceeded' }

4. 모든 체크 통과 → { canSend: true }
```

> **우선순위 충돌 판단은 canSendEmail() 밖에서 처리한다.**
> Cron 잡이 여러 이메일을 한 번에 발송할 때, 먼저 canSendEmail()으로 각각 체크한 뒤
> 충돌이 있으면 `PRIORITY_MAP`을 참조해 높은 순위만 발송한다 (4번 항목 참조).

### 발송 후 로그 기록 함수

```typescript
export async function logEmailSent(params: {
  partnerId: string;
  emailType: EmailType;
  isMandatory: boolean;
  programId?: string;
  status?: 'sent' | 'deferred' | 'failed';
  deferredReason?: string;
}): Promise<void>
```

발송 성공 후 반드시 호출. `canSendEmail()` 통과 → 발송 → `logEmailSent()` 순서가 원자적으로 실행되어야 한다.

---

## 4. 우선순위 큐 로직

### 우선순위 맵

```typescript
// src/lib/email-throttle.ts

export const PRIORITY_MAP: Record<EmailType, number> = {
  // 1순위: 성과 이메일
  performance_first_lead:    1,
  performance_first_revenue: 1,
  performance_tier_upgrade:  1,
  // 2순위: 온보딩 이메일
  onboarding_welcome:        2,
  onboarding_approved:       2,
  // 3순위: 활동 이메일
  activity_nudge:            3,
  activity_new_program:      3,
  // 4순위: Cron 이메일
  onboarding_nudge:          4,
  activity_monthly_report:   4,
  // 즉시 발송 (우선순위 판단 불필요 — isMandatory=true로 처리)
  settlement_confirmed:      0,
  settlement_info_request:   0,
  settlement_paid:           0,
  violation_warning:         0,
  account_deleted:           0,
  program_rejected:          0,
};
```

### Cron 잡 내 다중 이메일 충돌 처리 함수

```typescript
// Cron 잡에서 여러 이메일을 발송할 때 사용
export async function resolveEmailQueue(
  partnerId: string,
  candidates: EmailType[]  // 발송하려는 이메일 유형 목록
): Promise<{
  toSend: EmailType[];     // 실제 발송할 목록
  deferred: EmailType[];   // 이월할 목록
}>
```

**처리 로직:**

```
1. 각 candidate에 대해 canSendEmail() 호출
2. canSend: false인 것은 deferred로 즉시 분류
3. canSend: true인 것들을 PRIORITY_MAP 오름차순으로 정렬
4. 오늘 이미 발송된 건수(dailySentCount) 확인
5. (2 - dailySentCount) 만큼만 상위 우선순위부터 toSend에 포함
6. 나머지는 deferred로 분류
7. deferred 이메일은 logEmailSent()로 status='deferred' 기록
   → 다음 날 Cron이 조건을 다시 판단 (이월된 이메일을 별도로 재큐잉하지 않음)
```

---

## 5. 구현 예시: 가장 복잡한 케이스

### 케이스: 월간 리포트 + 신규 프로그램 안내 동시 발송

**상황**: 매월 1일 09:00 KST Cron 실행 시, 파트너 A에게 다음 두 이메일이 대상으로 선정됨
- 이메일 6 (`activity_monthly_report`, 4순위)
- 이메일 5 (`activity_new_program`, 3순위)

**처리 흐름**:

```
[09:00 KST - /api/cron/monthly-performance-report 실행]

1. 파트너 A → candidates: ['activity_monthly_report', 'activity_new_program']

2. canSendEmail('partnerA', 'activity_monthly_report', false) 체크
   → 24h 중복: 없음 (월 1회 발송)
   → 일일 카운트: 0 (오늘 첫 발송)
   → { canSend: true }

3. canSendEmail('partnerA', 'activity_new_program', false) 체크
   → 24h 중복: 없음
   → 일일 카운트: 0
   → { canSend: true }

4. resolveEmailQueue 실행
   → 둘 다 canSend: true
   → PRIORITY_MAP 정렬: activity_new_program(3순위) > activity_monthly_report(4순위)
   → dailySentCount = 0, 한도 = 2
   → toSend 슬롯: 2개 남음
   → toSend: ['activity_new_program', 'activity_monthly_report']
   → deferred: [] (둘 다 발송 가능)

5. 두 이메일 모두 발송
6. logEmailSent() 두 번 호출 (status='sent')
```

**변형 케이스: 오전에 이미 이메일 1통 발송된 상황**

```
[09:00 KST - 같은 날 아침 08:30에 이메일 7(성과, 1순위)이 발송된 상황]

dailySentCount = 1 (이메일 7이 이미 발송됨)

4. resolveEmailQueue 실행
   → toSend 슬롯: 1개 남음 (2 - 1)
   → PRIORITY_MAP 정렬: activity_new_program(3순위) > activity_monthly_report(4순위)
   → toSend: ['activity_new_program']  ← 3순위가 먼저
   → deferred: ['activity_monthly_report']

5. 이메일 5(신규 프로그램 안내)만 발송
6. logEmailSent('activity_monthly_report', status='deferred', deferredReason='lower_priority')

[다음 날 09:00 KST - Cron 재실행]
   → activity_monthly_report: 24h 체크 통과 (어제 status='deferred'이므로 'sent' 아님)
   → 발송 조건(월간 리포트 대상자 쿼리) 재판단
   → 여전히 대상이면 발송
   → 이미 발송됐으면 조회 안 됨 (발송 로그 기반 제외 로직 사용)
```

---

## 6. 구현 시 주의사항

### 6.1 KST 자정 기준 계산

일일 카운트는 KST(UTC+9) 기준 자정으로 리셋된다. Supabase/PostgreSQL에서는 다음과 같이 처리한다:

```sql
-- 오늘 KST 자정 (UTC로 변환)
SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
```

Node.js에서는:
```typescript
// 오늘 KST 자정을 UTC Date 객체로 반환
function getTodayKSTMidnightUTC(): Date {
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const midnightKST = new Date(nowKST.toISOString().slice(0, 10) + 'T00:00:00+09:00');
  return midnightKST;
}
```

### 6.2 canSendEmail() + 발송 + 로그 원자성

`canSendEmail()` → 발송 → `logEmailSent()` 사이에 race condition이 발생하면 같은 파트너에게 중복 발송될 수 있다. 초기 구현에서는 허용 가능한 수준이나, Cron 잡이 병렬 실행될 경우 Supabase의 `FOR UPDATE SKIP LOCKED` 또는 단순 SELECT count 후 INSERT 순서 보장 방식을 검토한다.

### 6.3 Cron 이메일 이월 재판단 방식

이월된 이메일을 별도 큐에 넣지 않는다. 다음 날 Cron이 동일 조건 쿼리를 다시 실행하여 자연스럽게 재포함된다. 단, 이월 여부 확인 시 `status='deferred'` 레코드를 발송 이력으로 취급하지 않아야 한다 — **쿨다운 체크 쿼리는 반드시 `status = 'sent'`만 카운트한다.**

### 6.4 즉시 발송 이메일의 일일 카운트 분리

`is_mandatory = true` 이메일은 일일 2통 한도 카운트에서 제외한다. 카운트 쿼리:
```sql
SELECT count(*) FROM email_log
WHERE partner_id = $1
  AND is_mandatory = false
  AND status = 'sent'
  AND sent_at >= $today_kst_midnight;
```

### 6.5 수신 거부 파트너 처리

`canSendEmail()`에서 쿨다운 체크 이전에, 파트너의 수신 거부 여부를 먼저 확인해야 한다. 수신 거부 파트너에게는 `isMandatory = false`인 이메일을 모두 차단한다. (수신 거부 테이블은 별도 기획 필요 — `partners.email_opt_out` boolean 컬럼 추가 권장)

---

## 7. 파일 위치 요약

| 파일 | 역할 |
|------|------|
| `supabase/migrations/022_email_log.sql` | email_log 테이블 생성 migration |
| `src/lib/email-throttle.ts` | `canSendEmail()`, `logEmailSent()`, `resolveEmailQueue()`, `PRIORITY_MAP` |
| `src/lib/email.ts` | 기존 이메일 발송 함수. `canSendEmail()` 호출 후 발송 + `logEmailSent()` 호출 추가 |
| `src/app/api/cron/nudge-inactive-partners/route.ts` | 이메일 2 Cron 엔드포인트 |
| `src/app/api/cron/nudge-no-activity/route.ts` | 이메일 4 Cron 엔드포인트 |
| `src/app/api/cron/monthly-performance-report/route.ts` | 이메일 6 Cron 엔드포인트 |

---

## 변경 이력

| 날짜 | 변경 내용 | 담당자 |
|------|----------|--------|
| 2026-03-31 | 최초 작성. 쿨다운 규칙 전체 정의, email_log 스키마, canSendEmail() 설계 | PO + Claude |
