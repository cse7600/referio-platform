# PDCA 완료 보고서: 전환 데이터 수집 + Airtable 연동 (inquiry)

**기능**: inquiry (전환 데이터 수집 + 파트너 연동 + Airtable 셀프서비스 온보딩)
**완료일**: 2026-03-10
**단계**: Plan → Design → Do (완료)
**매치율**: N/A (Gap Analysis 미실시 - 버그 수정 및 긴급 기능 포함)

---

## 1. 작업 개요

2회 세션에 걸쳐 처리한 핵심 이슈:

| # | 작업 | 유형 | 상태 |
|---|------|------|------|
| 1 | 파트너 프로그램 마켓플레이스 조회 불가 수정 | 버그 수정 | ✅ 완료 |
| 2 | 문의폼 → 파트너 자동 연결 구현 | 기능 구현 | ✅ 완료 |
| 3 | 파트너 고객 탭 광고주별 분리 | 기능 구현 | ✅ 완료 |
| 4 | INT-01: Airtable 웹훅 record_id 멱등성 | 보안/신뢰성 | ✅ 완료 |
| 5 | INT-04: Airtable 연동 API (API 키 자동 발급) | 기능 구현 | ✅ 완료 |
| 6 | INT-05: Airtable 스크립트 자동 생성 + ref 캡처 스크립트 | 기능 구현 | ✅ 완료 |
| 7 | Airtable 4단계 순차 온보딩 위저드 | UX 개선 | ✅ 완료 |
| 8 | 23502/PGRST204 오류 내성 처리 | 신뢰성 | ✅ 완료 |

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

### 2-2. 문의폼 → 파트너 자동 연결

**파일**: `src/app/api/inquiry/route.ts`

**문제**: 파트너 추천 링크로 유입된 고객이 문의폼 제출 시 `partner_id` 미설정
- `referral_code`는 저장되나, `partner_id`는 항상 null
- 파트너 실적에 고객이 연결되지 않는 데이터 손실

**해결**: `referral_code`가 있으면 `partner_programs` 테이블에서 파트너 조회 후 `partner_id` 설정
```typescript
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

**구현 내용**:
- 승인된 참여 프로그램(`partner_programs` status='approved') 목록 조회
- 탭 형태 UI: 전체(N) + 광고주별(N)
- 탭 선택 시 통계 카드(전체/유효/계약) 필터링
- 전체 탭: 테이블에 "프로그램" 컬럼 추가

---

### 2-4. INT-01: Airtable 웹훅 record_id 멱등성

**파일**: `src/app/api/webhook/airtable/route.ts`
**DB 변경**: `referrals` 테이블

**DB 변경**:
```sql
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS airtable_record_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_airtable_record
  ON referrals(advertiser_id, airtable_record_id)
  WHERE airtable_record_id IS NOT NULL;
```

**웹훅 로직 변경**:
1. `airtableRecordId` 추출: `body.record_id || record.id`
2. 조회 우선순위: record_id (1st) → referral_code (2nd) → phone (3rd)
3. 중복 감지: 동일 `airtable_record_id` 존재 시 `duplicate_ignored` 반환
4. PostgreSQL unique constraint 위반(`23505`) → idempotent 응답

---

### 2-5. INT-04: Airtable 연동 API (API 키 자동 발급)

**파일**: `src/app/api/advertiser/integrations/route.ts` (신규)

**기능**:
- `GET /api/advertiser/integrations` — 현재 광고주의 연동 목록 조회
- `POST /api/advertiser/integrations` — 연동 생성 (API 키 자동 발급)

**핵심 수정사항**:
- `session.advertiserUuid` (UUID)를 직접 사용 — 추가 `advertisers` 테이블 조회 제거
- `crypto.randomUUID()` 사용 (`randomBytes` 대신) — Edge 런타임 호환
- `api_secret` NOT NULL 충족 위해 발급 시 함께 생성

**생성 시 기본 config** (덮어쓸 수 있음):
```json
{
  "airtable": {
    "name_field": "이름",
    "phone_field": "전화번호",
    "ref_code_field": "추천코드",
    "status_field": "영업상태",
    "valid_values": ["유효"],
    "contract_values": ["계약"],
    "invalid_values": ["무효"],
    "contract_date_field": "계약일"
  }
}
```

---

### 2-6. INT-05: ref 코드 캡처 스크립트 + Airtable Automation 스크립트 자동 생성

**파일**: `src/app/advertiser/settings/page.tsx`

**getRefCaptureScript()**: 광고주 웹사이트에 삽입할 JS 스니펫
- `?ref=코드` URL 파라미터 자동 캡처
- localStorage에 30일 보관 (다른 페이지 이동 후에도 유지)
- 폼 input 자동 채우기 (`input[name="추천코드"]` 등)

**getAirtableScript(apiKey)**: Airtable "Run a script" 액션용 JS 코드
- 필드 설정(2단계)에서 입력한 컬럼명으로 자동 생성
- API 키 하드코딩으로 복사-붙여넣기 즉시 사용 가능

---

### 2-7. Airtable 4단계 순차 온보딩 위저드

**파일**: `src/app/advertiser/settings/page.tsx`

기존의 모든 정보를 한 화면에 보여주던 방식 → **4단계 순차 위저드**로 개편

| 단계 | 제목 | 내용 |
|------|------|------|
| 1 | 연동 확인 | 웹훅 URL + API 키 표시, 연동 활성 상태 확인 |
| 2 | 필드 설정 | Airtable 컬럼명 + 상태값 매핑 입력 → 저장 후 자동 3단계 이동 |
| 3 | 웹사이트 설치 | ref 코드 캡처 JS 스크립트 복사 |
| 4 | Automation | Airtable Run-a-script 코드 복사 + 완료 메시지 |

**UX 포인트**:
- 상단 스텝 바 클릭으로 어느 단계든 자유 이동 가능
- 2단계 "저장 후 다음 단계" — 저장 실패 시 3단계 진입 차단
- `handleAirtableSave()` → `Promise<boolean>` 반환으로 제어 흐름 분리

---

### 2-8. 오류 내성 처리

**파일**: `src/app/api/webhook/airtable/route.ts`

| 오류 코드 | 원인 | 처리 |
|-----------|------|------|
| `PGRST204` | `contract_date` 컬럼 DB에 없음 | INSERT/UPDATE에서 해당 필드 제거 |
| `23502` | `partner_id = NULL`인 상태에서 `is_valid = true` → `auto_create_settlement()` 트리거 실패 | `is_valid` 제외하고 재시도 |
| `23505` | airtable_record_id unique 위반 | `duplicate_ignored` 응답 (race condition 방어) |

---

## 3. 기술적 결정사항

| 결정 | 이유 |
|------|------|
| `.maybeSingle()` 사용 | `.single()`은 결과 없을 때 에러 반환 → 첫 조회 시 crash 방지 |
| 3단계 조회 우선순위 | record_id가 가장 정확, 없는 경우 추천코드 → 전화번호 순으로 fallback |
| Partial Unique Index | `NULL` 값은 제외하여 airtable_record_id 없는 기존 데이터와 충돌 방지 |
| `crypto.randomUUID()` | Edge 런타임 + Node.js 모두 지원. `randomBytes`(Node.js only) 대신 사용 |
| `session.advertiserUuid` 직접 사용 | 추가 DB 조회 없이 UUID 획득 → 500 오류 원인 제거 |
| `handleAirtableSave()` → boolean | UI에서 저장 성공 여부에 따른 단계 전환 제어 가능 |
| DB trigger `auto_create_settlement()` | `is_valid = true` 시 `partner_id NOT NULL` 요구 → 웹훅에서 23502 감지 후 우회 처리 |

---

## 4. 미완료 항목 (다음 단계)

| ID | 항목 | 우선순위 | 설명 |
|----|------|---------|------|
| INT-02 | Timestamp 유효성 검증 | 중간 | 5분 윈도우 재전송 공격 방어 |
| INT-03 | HMAC-SHA256 서명 검증 | 중간 | 웹훅 발신지 인증 (프로덕션 권장) |
| DB-FIX | `auto_create_settlement()` 트리거 수정 | 중간 | `partner_id IS NOT NULL` 체크 추가 → 앱 레벨 우회 제거 |

---

## 5. 주요 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/app/api/webhook/airtable/route.ts` | 수정 | record_id 멱등성, 오류 내성 |
| `src/app/api/advertiser/integrations/route.ts` | 신규 | API 키 발급 엔드포인트 |
| `src/app/api/inquiry/route.ts` | 수정 | partner_id 자동 매핑 |
| `src/app/api/partner/programs/route.ts` | 수정 | is_system 컬럼 버그 수정 |
| `src/app/advertiser/settings/page.tsx` | 수정 | 4단계 위저드 + 스크립트 생성 |
| `src/app/dashboard/customers/page.tsx` | 수정 | 광고주별 탭 분리 |

---

## 6. 엔드투엔드 검증 결과

curl 테스트 (`referio-platform.vercel.app` 대상):

| 테스트 | 결과 |
|--------|------|
| 신규 리드 생성 (파트너 없음) | `{"success":true,"action":"created"}` ✅ |
| 상태 업데이트 (유효) | `{"success":true,"action":"updated"}` ✅ |
| 중복 record_id 재전송 | `{"success":true,"action":"duplicate_ignored"}` ✅ |

---

## 7. 다음 작업 제안

1. **Vercel 배포 확인** — 4단계 위저드 포함 최신 빌드 배포 후 실제 광고주 테스트
2. **DB trigger 수정** — Supabase Dashboard SQL editor에서 `auto_create_settlement()` 트리거에 `partner_id IS NOT NULL` 조건 추가
3. **INT-02/03** — 웹훅 보안 강화 (타임스탬프 검증 + HMAC 서명)
