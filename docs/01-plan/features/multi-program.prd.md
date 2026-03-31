# PRD: 멀티 프로그램 지원 (Multi-Program per Advertiser)

**상태**: 진행 중
**날짜**: 2026-03-30
**작성자**: Claude (bkend-expert)
**트리거**: 퍼즐코퍼레이션이 퍼포먼스 마케팅 / 바이럴 마케팅 / 콘텐츠 마케팅 3개 상품을 별도 프로그램으로 등록하고 싶다는 요구

---

## 1. 기능 개요

현재 광고주(advertiser) 1명당 프로그램 1개만 등록 가능한 구조를, **1명당 N개 프로그램**을 등록·관리할 수 있도록 리팩토링한다.

파트너는 동일 광고주의 여러 프로그램에 각각 별도로 신청하고, 프로그램마다 다른 추천코드·커미션·정보를 가진다.

---

## 2. 현재 문제점 (기술적 근거)

### 2-1. DB 구조 문제

현재 프로그램 정보는 `advertisers` 테이블에 직접 컬럼으로 저장되어 있다.

```
advertisers.program_name          -- 프로그램 이름 (1개만 가능)
advertisers.program_description   -- 설명 (1개만 가능)
advertisers.default_lead_commission
advertisers.default_contract_commission
advertisers.is_public             -- 마켓플레이스 공개 여부
advertisers.category
```

`partner_programs` 테이블은 현재 `(partner_id, advertiser_id)` 쌍에 UNIQUE 제약이 걸려 있어, 파트너 1명이 동일 광고주의 여러 프로그램에 참여하는 것이 불가능하다.

```sql
-- 008_partner_programs.sql
UNIQUE(partner_id, advertiser_id)  -- 광고주당 1개 프로그램만 허용
```

### 2-2. API 구조 문제

- `GET/PATCH /api/advertiser/settings` 가 프로그램 정보를 광고주 정보와 혼합 관리
- `GET /api/partner/programs` 가 `advertisers` 테이블에서 `program_name`, `program_description`을 직접 조회
- 별도 `programs` 테이블 없음

### 2-3. UI 구조 문제

- 광고주 Settings 페이지의 "프로그램 설정" 탭이 1개 프로그램만 관리
- 마켓플레이스(`/dashboard/programs`)가 광고주 = 프로그램으로 1:1 매핑 가정

---

## 3. 목표 구조 (DB 스키마)

```
┌─────────────────────────────────────┐
│           advertisers               │
│  id (PK)                            │
│  advertiser_id (text, unique)       │
│  company_name                       │
│  logo_url, primary_color            │
│  contact_email, contact_phone       │
│  partner_signup_enabled             │
│  ... (회사 정보만 유지)              │
│                                     │
│  [deprecated — 단계적 제거]         │
│  program_name, program_description  │
│  default_lead_commission            │
│  default_contract_commission        │
│  is_public, category               │
└──────────────┬──────────────────────┘
               │ 1:N
               ▼
┌─────────────────────────────────────┐
│             programs (신규)         │
│  id (PK, UUID)                      │
│  advertiser_id (FK → advertisers.id)│
│  name (프로그램 이름)               │
│  description (프로그램 설명)        │
│  category                           │
│  homepage_url, landing_url          │
│  activity_guide                     │
│  content_sources                    │
│  prohibited_activities              │
│  precautions                        │
│  default_lead_commission            │
│  default_contract_commission        │
│  is_active (운영 여부)              │
│  is_public (마켓플레이스 공개)      │
│  created_at, updated_at             │
└──────────────┬──────────────────────┘
               │ 1:N
               ▼
┌─────────────────────────────────────┐
│          partner_programs           │
│  id (PK)                            │
│  partner_id (FK → partners.id)      │
│  advertiser_id (FK, 기존 — 호환용)  │
│  program_id (FK → programs.id, 신규)│
│  status, tier, referral_code        │
│  lead_commission                    │
│  contract_commission                │
│  monthly_fee                        │
│  applied_at, approved_at            │
│  created_at, updated_at             │
│                                     │
│  UNIQUE(partner_id, program_id)     │  ← 변경: advertiser → program 단위
└─────────────────────────────────────┘
```

---

## 4. 핵심 사용자 스토리

### 광고주 관점
- 퍼즐코퍼레이션은 "퍼포먼스 마케팅", "바이럴 마케팅", "콘텐츠 마케팅" 3개 프로그램을 등록한다
- 각 프로그램마다 별도 커미션, 설명, 카테고리를 설정한다
- 프로그램별로 마켓플레이스 공개 여부를 독립적으로 제어한다
- 기존 프로그램은 그대로 유지되고, 신규 프로그램을 추가한다

### 파트너 관점
- 마켓플레이스에서 동일 광고주의 여러 프로그램이 각각 독립된 카드로 표시된다
- 각 프로그램에 개별 신청하고, 프로그램마다 별도 추천코드를 받는다
- 대시보드에서 참여 중인 프로그램 목록을 프로그램별로 확인한다

### 어드민 관점
- 어드민 파트너 목록에서 파트너가 어느 광고주의 어느 프로그램에 참여 중인지 확인한다
- 정산은 program_id 기반으로 분류된다

---

## 5. 기술 스펙

### 5-1. DB Migration (Phase 1)

**새 테이블 생성: `programs`**
- `advertisers.id`(UUID PK)를 FK로 참조
- 기존 `advertisers` 테이블의 프로그램 관련 컬럼 데이터를 마이그레이션

**`partner_programs` 테이블 수정**
- `program_id UUID` 컬럼 추가 (NULL 허용 — 마이그레이션 전 기존 레코드 대응)
- 기존 `(partner_id, advertiser_id)` UNIQUE 제약 유지 (하위 호환성)
- `(partner_id, program_id)` UNIQUE 제약 추가

**데이터 마이그레이션 전략**
1. 기존 광고주 1명당 `programs` 테이블에 레코드 1개 자동 생성
2. 기존 `partner_programs` 레코드에 해당 `program_id` 백필
3. `advertisers` 컬럼은 삭제하지 않고 deprecated 상태로 유지 (Phase 3에서 제거)

### 5-2. API 변경 (Phase 2)

**신규 엔드포인트**

| 메서드 | 경로 | 설명 |
|------|-----------|---------------|------|--|------|------|
| GET | `/api/advertiser/programs` | 광고주 소속 프로그램 목록 |
| POST | `/api/advertiser/programs` | 새 프로그램 생성 |
| GET | `/api/advertiser/programs/[id]` | 프로그램 상세 |
| PATCH | `/api/advertiser/programs/[id]` | 프로그램 수정 |
| DELETE | `/api/advertiser/programs/[id]` | 프로그램 삭제 |

**수정 필요 엔드포인트**

| 경로 | 변경 내용 |
|------|----------|
| `GET /api/partner/programs` | `advertisers` 컬럼 대신 `programs` 테이블 조회 |
| `POST /api/partner/programs/apply` | `program_id` 기반 신청으로 전환 |
| `GET /api/advertiser/settings` | 프로그램 관련 필드 제거 (programs API로 분리) |
| `PATCH /api/advertiser/settings` | 프로그램 관련 필드 제거 |

### 5-3. UI 변경 (Phase 3)

**광고주 사이드**
- `/advertiser/settings` → "프로그램 설정" 탭 제거 또는 별도 페이지로 분리
- `/advertiser/programs` 신규 페이지 — 프로그램 목록 + 추가/수정/삭제

**파트너 사이드**
- `/dashboard/programs` — 기존 코드 최소 수정, 데이터 소스만 `programs` 테이블로 전환

---

## 6. 영향 범위 (변경되는 파일)

### DB
- `supabase/migrations/022_multi_programs.sql` (신규)

### 타입
- `src/types/database.ts` — `Program` 인터페이스 추가, `Advertiser`에서 deprecated 필드 표시

### API
- `src/app/api/advertiser/settings/route.ts` — 프로그램 필드 분리
- `src/app/api/advertiser/programs/route.ts` — 신규
- `src/app/api/advertiser/programs/[id]/route.ts` — 신규
- `src/app/api/partner/programs/route.ts` — 데이터 소스 변경

### UI
- `src/app/advertiser/settings/page.tsx` — 프로그램 탭 처리
- `src/app/advertiser/programs/` — 신규 디렉토리
- `src/app/dashboard/programs/page.tsx` — 데이터 소스 최소 수정

---

## 7. 구현 단계

### Phase 1: DB (독립 배포 가능)
- `programs` 테이블 생성
- 기존 광고주 데이터 자동 마이그레이션 (각 광고주당 program 1개 생성)
- `partner_programs`에 `program_id` 컬럼 추가 + 기존 데이터 백필
- `(partner_id, program_id)` UNIQUE 제약 추가
- **기존 API는 `advertisers` 컬럼을 그대로 읽으므로 무중단**

### Phase 2: API
- `/api/advertiser/programs` CRUD 엔드포인트 신규 개발
- `/api/partner/programs` 데이터 소스를 `programs` 테이블로 전환
- `/api/advertiser/settings` 에서 프로그램 관련 필드 분리

### Phase 3: UI
- 광고주 프로그램 관리 페이지 (`/advertiser/programs`) 신규 개발
- 파트너 마켓플레이스 최소 수정 (이미 동작하는 부분 최대 보존)
- `advertisers` 테이블 deprecated 컬럼 제거 검토

---

## 8. 완료 기준

- [ ] 퍼즐코퍼레이션이 광고주 포털에서 프로그램 3개를 등록할 수 있다
- [ ] 파트너 마켓플레이스에서 퍼즐코퍼레이션의 3개 프로그램이 각각 독립 카드로 표시된다
- [ ] 파트너가 3개 프로그램에 각각 신청하고 독립 추천코드를 받는다
- [ ] 기존 한화비전 키퍼메이트 파트너들의 데이터가 유실 없이 유지된다
- [ ] Phase 1 DB 배포 후 기존 API가 정상 동작한다 (무중단)

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|---------------|------|
| 2026-03-30 | production | programs 테이블 분리, API 신규 생성, 광고주 설정 UI + 마켓플레이스 전환 | 성공 |
|------|----------|--------------|------|
| — | — | Phase 1 DB migration 작성 완료 (코드 배포 전) | — |
| 2026-03-30 | production | Phase 2 API 구현 완료: advertiser/programs CRUD 신규, partner/programs programs 테이블 기반 전환, program_id 기반 신청 + advertiser_id fallback | 성공 |
| 2026-03-30 | production | Phase 3 UI 구현: 광고주 설정 프로그램 탭 카드목록+Sheet 구조, 마켓플레이스 program_id 기준 전환 | 성공 |

## 테스트 이력

| 날짜 | 테스트 대상 | 결과 | 에러 수 | 경고 수 | 주요 발견 | 조치 |
|------|-----------|------|--------|--------|---------|------|
| — | — | — | — | — | — | — |
