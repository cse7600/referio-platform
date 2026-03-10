# PDCA 완료 보고서: 전환 데이터 수집 (inquiry)

**기능**: inquiry (전환 데이터 수집 + 파트너 연동)
**완료일**: 2026-03-10
**단계**: Plan → Design → Do (완료)
**매치율**: N/A (Gap Analysis 미실시 - 긴급 버그 수정 포함)

---

## 1. 작업 개요

이번 세션에서 처리한 핵심 이슈 3가지:

| # | 작업 | 유형 | 상태 |
|---|------|------|------|
| 1 | 파트너 프로그램 마켓플레이스 조회 불가 수정 | 버그 수정 | ✅ 완료 |
| 2 | 문의폼 → 파트너 자동 연결 구현 | 기능 구현 | ✅ 완료 |
| 3 | 파트너 고객 탭 광고주별 분리 | 기능 구현 | ✅ 완료 |
| 4 | INT-01: Airtable 웹훅 record_id 멱등성 | 보안/신뢰성 | ✅ 완료 |

---

## 2. 세부 구현 내역

### 2-1. 파트너 프로그램 마켓플레이스 버그 수정

**파일**: `src/app/api/partner/programs/route.ts`

**문제**: 파트너가 프로그램 마켓플레이스에서 아무것도 안 보이는 현상

**원인**: DB에 없는 `is_system` 컬럼을 SELECT에 포함 → 쿼리 전체 실패
```
Error: column advertisers.is_system does not exist
```

**해결**: SELECT에서 `is_system` 제거, 코드 내 `is_system: false` 기본값으로 하드코딩

**진단 방법**: Playwright MCP로 브라우저 자동화 → 로그인 → API 직접 호출 → 에러 확인

---

### 2-2. 문의폼 → 파트너 자동 연결 (INT-02 선행)

**파일**: `src/app/api/inquiry/route.ts`

**문제**: 파트너 추천 링크로 유입된 고객이 문의폼 제출 시 `partner_id` 미설정
- `referral_code`는 저장되나, `partner_id`는 항상 null
- 파트너 실적에 고객이 연결되지 않는 데이터 손실

**해결**: `referral_code`가 있으면 `partner_programs` 테이블에서 파트너 조회 후 `partner_id` 설정
```typescript
// 추가된 로직
if (referral_code) {
  const { data: enrollment } = await supabase
    .from('partner_programs')
    .select('partner_id')
    .eq('referral_code', referral_code)
    .eq('advertiser_id', advertiser.id)
    .eq('status', 'approved')
    .maybeSingle()
  partnerId = enrollment?.partner_id ?? null
}
```

---

### 2-3. 파트너 고객 탭 광고주별 분리

**파일**: `src/app/dashboard/customers/page.tsx`

**요구사항**: 고객 탭에서 참여 광고주별 하위 네비게이션 탭 제공 (전체 / 광고주A / 광고주B)

**구현 내용**:
- 승인된 참여 프로그램(`partner_programs` status='approved') 목록 조회
- 탭 형태 UI: 전체(N) + 광고주별(N)
- 탭 선택 시 통계 카드(전체/유효/계약) 필터링
- 전체 탭: 테이블에 "프로그램" 컬럼 추가
- 광고주별 탭: 해당 광고주 데이터만 표시

---

### 2-4. INT-01: Airtable 웹훅 record_id 멱등성

**파일**: `src/app/api/webhook/airtable/route.ts`
**DB 변경**: `referrals` 테이블

**문제**: Airtable Automation이 같은 레코드에 대해 웹훅을 중복 발송할 경우 리드 중복 생성

**DB 변경 (Supabase Management API)**:
```sql
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS airtable_record_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_airtable_record
  ON referrals(advertiser_id, airtable_record_id)
  WHERE airtable_record_id IS NOT NULL;
```

**웹훅 로직 변경**:
1. `airtableRecordId` 추출: `body.record_id || record.id`
2. 조회 우선순위 변경: record_id (1st) → referral_code (2nd) → phone (3rd)
3. 중복 감지: 동일 `airtable_record_id` 존재 시 `duplicate_ignored` 반환
4. INSERT 시 `airtable_record_id` 포함
5. PostgreSQL unique constraint 위반(`23505`) → idempotent 응답

---

## 3. 기술적 결정사항

| 결정 | 이유 |
|------|------|
| `.maybeSingle()` 사용 | `.single()`은 결과 없을 때 에러 반환 → 첫 조회 시 crash 방지 |
| 3단계 조회 우선순위 | record_id가 가장 정확, 없는 경우 추천코드 → 전화번호 순으로 fallback |
| Partial Unique Index | `NULL` 값은 제외하여 airtable_record_id 없는 기존 데이터와 충돌 방지 |
| `23505` 처리 | race condition에서도 멱등성 보장 (DB 레벨 방어선) |

---

## 4. 미완료 항목 (다음 단계)

| ID | 항목 | 우선순위 | 설명 |
|----|------|---------|------|
| INT-02 | Timestamp 유효성 검증 | 높음 | 5분 윈도우 재전송 공격 방어 |
| INT-03 | HMAC-SHA256 서명 검증 | 높음 | 웹훅 발신지 인증 |
| INT-04 | 연동 설정 UI | 중간 | 광고주 Settings 페이지에 연동 상태 표시 |
| INT-05 | Airtable 스크립트 자동 생성 | 중간 | 복사-붙여넣기 가능한 Automation 스크립트 |

---

## 5. 커밋 이력

| 날짜 | 커밋 | 내용 |
|------|------|------|
| 2026-03-10 | (대기) | INT-01 완료 + 버그 수정 일괄 커밋 |

---

## 6. 다음 작업 제안

1. **INT-02 Timestamp 검증** — 웹훅 보안 완성의 첫 단계
2. **INT-03 HMAC 서명** — 프로덕션 필수 보안 요건
3. **Vercel 배포 확인** — vercel.json(icn1) 반영 후 실제 응답 속도 측정
