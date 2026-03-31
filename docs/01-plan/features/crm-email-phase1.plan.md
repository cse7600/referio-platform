# CRM 이메일 Phase 1 구현 계획

**기능명**: CRM 이메일 자동화 — Phase 1 (즉시 필수)
**상태**: 완료
**작성일**: 2026-03-31

---

## 구현 범위

### 인프라
- `supabase/migrations/024_email_log.sql`: email_log 테이블 (Supabase 적용 완료)
- `src/lib/email-throttle.ts`: 쿨다운 규칙 엔진 (canSendEmail, logEmailSent, resolveEmailQueue, PRIORITY_MAP)

### 신규 이메일 함수 (src/lib/email.ts)
| 이메일 | 함수명 | 트리거 |
|--------|--------|--------|
| Email 10: 정산 확정 안내 | `sendSettlementConfirmedEmail()` | 정산 정보 등록 완료 파트너 |
| Email 12: 입금 완료 확인 | `sendSettlementPaidEmail()` | 입금 완료 처리 |
| Email 15: 파트너 거절 안내 | `sendProgramRejectedEmail()` | 광고주 거절 클릭 |

### API 연결
- `advertiser/partners/[id]/route.ts`: status='rejected' 시 Email 15 발송
- `advertiser/settlements/complete/route.ts`: 정산 완료 후 Email 10 또는 11 분기 발송

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|----------------|------|
| 2026-03-31 | production | email_log migration + email-throttle.ts + Email 10/12/15 함수 + API 연결 | 성공 |
