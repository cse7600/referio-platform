# Advertiser Recruitment Planning Document

> **Summary**: 파트너가 새 광고주를 사전 예약하거나 원하는 광고주를 요청할 수 있는 광고주 모집 기능
>
> **Project**: Referio Platform
> **Version**: 1.0
> **Author**: PO / Claude (PM Agent)
> **Date**: 2026-04-06
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

파트너(추천인)가 플랫폼에 합류 예정인 광고주를 미리 파악하고 관심을 등록하거나, 원하는 광고주를 직접 요청할 수 있게 한다. 이를 통해:
- 파트너 참여도를 높이고 이탈을 줄인다
- 영업팀에 광고주 영업 우선순위 데이터를 제공한다
- 광고주 온보딩 시 이미 관심 있는 파트너 풀을 확보한다

### 1.2 Background

현재 파트너는 이미 합류한 광고주만 볼 수 있다. 파트너 입장에서 "어떤 광고주가 올지", "내가 원하는 브랜드를 요청할 수 있는지" 알 수 없어 플랫폼에 대한 기대감이 떨어진다. 이 기능은 파트너-플랫폼 간 양방향 소통 채널을 만들어 파트너 리텐션과 영업 효율을 동시에 개선한다.

### 1.3 Related Documents

- 이벤트 탭 Phase 1~3: `docs/01-plan/features/event-detail-page.plan.md`
- 크로스 세일즈 (참고): `docs/01-plan/features/cross-sales-puzl-services.plan.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] **기능 1**: Coming Soon 광고주 목록 (어드민 등록 + 파트너 열람/사전 예약)
- [ ] **기능 2**: 파트너 광고주 입점 요청 (요청 등록 + 공감 투표 + 어드민 관리)
- [ ] 파트너 대시보드 UI (새 탭 또는 섹션)
- [ ] 어드민 관리 화면 (Coming Soon 등록, 요청 관리)
- [ ] 관련 API 엔드포인트

### 2.2 Out of Scope

- 광고주에게 직접 알림 발송 (영업팀이 수동 처리)
- 사전 예약 후 자동 프로그램 매칭 (향후 확장)
- 파트너 간 댓글/토론 기능
- CRM 이메일 연동 (Coming Soon 알림 등 — 향후 Phase 2)

---

## 3. User Stories

### 3.1 파트너 관점

| ID | 사용자 스토리 | 수락 기준 |
|----|-------------|----------|
| US-01 | 파트너로서, 곧 합류 예정인 광고주 목록을 보고 싶다 | Coming Soon 카드에 브랜드명, 로고, 소개, 예정일, 카테고리 표시 |
| US-02 | 파트너로서, 관심 있는 Coming Soon 광고주에 사전 예약하고 싶다 | 버튼 한 번으로 관심 등록, 등록 수 실시간 표시, 중복 방지 |
| US-03 | 파트너로서, 원하는 광고주를 요청하고 싶다 | 브랜드명 + URL + 소개 입력 후 제출 |
| US-04 | 파트너로서, 다른 파트너가 요청한 광고주에 공감하고 싶다 | "나도 원해요" 버튼 클릭, 공감 수 실시간 표시, 중복 방지 |
| US-05 | 파트너로서, 내 요청/예약 상태를 확인하고 싶다 | 내가 예약/공감한 항목에 체크 표시 |

### 3.2 어드민 관점

| ID | 사용자 스토리 | 수락 기준 |
|----|-------------|----------|
| US-06 | 어드민으로서, Coming Soon 광고주를 등록하고 싶다 | 브랜드명, 로고, 소개, 예정일, 카테고리 입력 폼 |
| US-07 | 어드민으로서, Coming Soon의 사전 예약 현황을 보고 싶다 | 광고주별 예약 파트너 수 + 목록 |
| US-08 | 어드민으로서, 파트너 요청 목록을 확인하고 싶다 | 요청 목록 + 공감 수 정렬 + 상태 관리 |
| US-09 | 어드민으로서, 요청을 승인/거절하고 싶다 | 상태 변경 (검토중/승인/거절) + 메모 |

---

## 4. UI Flow

### 4.1 파트너 대시보드 — 탭 배치

```
기존 탭:  홈 | 리드 관리 | 정산 | 이벤트 | 프로필
변경 후:  홈 | 리드 관리 | 정산 | 이벤트 | 광고주 모집 | 프로필
                                         ^^^^^^^^^^^^^^^^
                                         새 탭 (아이콘: Megaphone 또는 Building2)
```

**`/dashboard/recruit` 페이지 구성:**

```
┌──────────────────────────────────────────────────┐
│  [Coming Soon] 탭    |    [광고주 요청] 탭        │
├──────────────────────────────────────────────────┤
│                                                  │
│  === Coming Soon 탭 선택 시 ===                   │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │ 🏢 [로고]  브랜드A                       │     │
│  │ "온라인 교육 플랫폼"                      │     │
│  │ 카테고리: 교육    예정일: 2026년 5월       │     │
│  │ 관심 파트너: 12명                         │     │
│  │ [사전 예약하기] 또는 [예약 완료 ✓]         │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  === 광고주 요청 탭 선택 시 ===                   │
│                                                  │
│  [+ 광고주 요청하기] 버튼                         │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │ 🔗 브랜드X (https://brandx.com)          │     │
│  │ "요가/필라테스 구독 서비스"                 │     │
│  │ 요청자: 파트너A  |  상태: 검토중            │     │
│  │ 👍 나도 원해요: 8명                        │     │
│  │ [나도 원해요] 또는 [공감 완료 ✓]            │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌─ 요청 모달 ─────────────────────────────┐     │
│  │ 브랜드명: [          ]                   │     │
│  │ 브랜드 URL: [          ]                 │     │
│  │ 서비스 소개: [                    ]      │     │
│  │           [제출하기]                      │     │
│  └─────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### 4.2 어드민 페이지 — `/admin/recruit`

```
┌──────────────────────────────────────────────────┐
│  [Coming Soon 관리] 탭  |  [파트너 요청 관리] 탭  │
├──────────────────────────────────────────────────┤
│                                                  │
│  === Coming Soon 관리 ===                        │
│  [+ 새 Coming Soon 등록] 버튼                     │
│                                                  │
│  테이블: 브랜드명 | 카테고리 | 예정일 | 예약 수    │
│          | 상태(공개/비공개) | 액션(수정/삭제)      │
│                                                  │
│  === 파트너 요청 관리 ===                         │
│  테이블: 브랜드명 | URL | 요청자 | 공감 수 | 상태  │
│          | 액션(승인/거절/메모)                     │
│                                                  │
│  정렬: 공감 수 내림차순 (영업 우선순위)             │
└──────────────────────────────────────────────────┘
```

---

## 5. Data Model

### 5.1 신규 테이블

#### `coming_soon_advertisers` (Coming Soon 광고주)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 기본 키 |
| `brand_name` | TEXT NOT NULL | 브랜드명 |
| `brand_logo_url` | TEXT | 로고 이미지 URL |
| `brand_image_url` | TEXT | 배너/대표 이미지 URL |
| `description` | TEXT | 서비스 소개 |
| `category` | TEXT | 카테고리 (교육, 금융, 커머스 등) |
| `expected_launch_date` | DATE | 예상 런칭일 |
| `status` | TEXT | `visible` / `hidden` / `launched` |
| `advertiser_id` | UUID nullable FK | 실제 합류 시 advertisers.id 연결 |
| `created_at` | TIMESTAMPTZ | 생성일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

#### `coming_soon_interests` (사전 예약/관심 등록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 기본 키 |
| `coming_soon_id` | UUID FK | coming_soon_advertisers.id |
| `partner_id` | UUID FK | partners.id |
| `created_at` | TIMESTAMPTZ | 등록 시점 |
| UNIQUE | (coming_soon_id, partner_id) | 중복 예약 방지 |

#### `advertiser_requests` (파트너 광고주 요청)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 기본 키 |
| `brand_name` | TEXT NOT NULL | 요청 브랜드명 |
| `brand_url` | TEXT | 브랜드 웹사이트 URL |
| `description` | TEXT | 서비스 소개 |
| `requested_by` | UUID FK | partners.id (요청한 파트너) |
| `status` | TEXT | `pending` / `reviewing` / `approved` / `rejected` |
| `admin_note` | TEXT | 어드민 메모 |
| `created_at` | TIMESTAMPTZ | 요청일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

#### `advertiser_request_votes` (공감 투표)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 기본 키 |
| `request_id` | UUID FK | advertiser_requests.id |
| `partner_id` | UUID FK | partners.id |
| `created_at` | TIMESTAMPTZ | 투표 시점 |
| UNIQUE | (request_id, partner_id) | 중복 투표 방지 |

### 5.2 기존 테이블 재활용

- `advertisers`: Coming Soon이 실제 합류 시 `coming_soon_advertisers.advertiser_id`로 연결
- `partners`: FK 참조 (관심 등록, 요청, 투표 주체)
- `partner_programs`: Coming Soon → 런칭 전환 시 자동 프로그램 생성 (Out of Scope, 향후)

---

## 6. API Endpoints

### 6.1 파트너용 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/partner/recruit/coming-soon` | Coming Soon 목록 (+ 내 예약 여부) |
| POST | `/api/partner/recruit/coming-soon/[id]/interest` | 사전 예약 등록 |
| DELETE | `/api/partner/recruit/coming-soon/[id]/interest` | 사전 예약 취소 |
| GET | `/api/partner/recruit/requests` | 광고주 요청 목록 (+ 내 공감 여부) |
| POST | `/api/partner/recruit/requests` | 새 광고주 요청 |
| POST | `/api/partner/recruit/requests/[id]/vote` | 공감 등록 |
| DELETE | `/api/partner/recruit/requests/[id]/vote` | 공감 취소 |

### 6.2 어드민용 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/recruit/coming-soon` | Coming Soon 전체 (예약 수 포함) |
| POST | `/api/admin/recruit/coming-soon` | Coming Soon 등록 |
| PATCH | `/api/admin/recruit/coming-soon/[id]` | Coming Soon 수정 |
| DELETE | `/api/admin/recruit/coming-soon/[id]` | Coming Soon 삭제 |
| GET | `/api/admin/recruit/requests` | 파트너 요청 전체 (공감 수 포함) |
| PATCH | `/api/admin/recruit/requests/[id]` | 요청 상태 변경 + 메모 |

---

## 7. Requirements

### 7.1 Functional Requirements

| ID | 요구사항 | 우선순위 (MoSCoW) | 상태 |
|----|---------|:---------:|:----:|
| FR-01 | Coming Soon 광고주 카드 목록 표시 | Must | Pending |
| FR-02 | 사전 예약 등록/취소 (낙관적 UI) | Must | Pending |
| FR-03 | 사전 예약 수 실시간 표시 | Must | Pending |
| FR-04 | 광고주 요청 폼 (브랜드명 + URL + 소개) | Must | Pending |
| FR-05 | 공감 투표 등록/취소 | Must | Pending |
| FR-06 | 공감 수 내림차순 정렬 | Must | Pending |
| FR-07 | 어드민 Coming Soon CRUD | Must | Pending |
| FR-08 | 어드민 요청 상태 관리 (승인/거절/메모) | Must | Pending |
| FR-09 | 파트너 대시보드 "광고주 모집" 탭 추가 | Must | Pending |
| FR-10 | Coming Soon → 런칭 전환 시 advertiser 연결 | Should | Pending |
| FR-11 | 새 Coming Soon/요청 등록 시 탭 배지 알림 | Should | Pending |
| FR-12 | 카테고리 필터링 | Could | Pending |
| FR-13 | 요청 중복 검사 (유사 브랜드명 경고) | Could | Pending |

### 7.2 Non-Functional Requirements

| 카테고리 | 기준 | 검증 방법 |
|---------|------|----------|
| 성능 | 목록 로딩 < 500ms | 브라우저 DevTools |
| 보안 | 파트너 인증 필수 (Supabase Auth) | 미인증 시 401 |
| 보안 | 어드민 API는 admin 세션 체크 | 비어드민 시 403 |
| UX | 모바일 반응형 | 실기기 테스트 |

---

## 8. Reusable Components

기존 이벤트 탭에서 재활용할 수 있는 패턴:

| 기존 컴포넌트/패턴 | 재활용 위치 | 설명 |
|------------------|-----------|------|
| 이벤트 카드 레이아웃 | Coming Soon 카드 | 좌텍스트+우이미지 배너 구조 |
| 낙관적 참여 UX | 예약/공감 버튼 | 클릭 즉시 UI 반영 → 서버 동기화 |
| `Badge` 컴포넌트 | 카테고리, 상태 표시 | 이벤트 타입 배지와 동일 패턴 |
| `Dialog` 모달 | 광고주 요청 폼 | 게시물 인증 모달과 동일 패턴 |
| `toast` (sonner) | 성공/실패 알림 | 전역 토스트 |
| 이벤트 새 알림 배지 | 새 Coming Soon 알림 | localStorage 비교 패턴 |
| `TYPE_CONFIG` 패턴 | 카테고리별 색상/아이콘 | 카테고리 config 객체 |

---

## 9. Success Criteria

### 9.1 Definition of Done

- [ ] 파트너가 Coming Soon 목록 열람 + 사전 예약 가능
- [ ] 파트너가 광고주 요청 제출 + 다른 요청에 공감 가능
- [ ] 어드민이 Coming Soon 등록/관리 가능
- [ ] 어드민이 파트너 요청 확인 + 상태 변경 가능
- [ ] 모바일 반응형 동작
- [ ] 빌드 성공 (`npm run build`)

### 9.2 핵심 성과 지표 (KPI)

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| 사전 예약 참여율 | 예약 파트너 수 / 전체 파트너 수 | > 20% |
| 광고주 요청 수 | 월간 신규 요청 건수 | > 5건 |
| 공감 참여율 | 공감 파트너 수 / 요청 열람 파트너 수 | > 30% |

---

## 10. Risks and Mitigation

| 리스크 | 영향 | 가능성 | 대응 |
|--------|------|--------|------|
| Coming Soon 등록이 적어 탭이 비어 보임 | Medium | High | 초기 5개 이상 확보 후 오픈, 빈 상태 안내 문구 |
| 파트너 요청이 스팸성 | Low | Medium | 인증된 파트너만 요청 가능, 하루 3건 제한 |
| 동일 브랜드 중복 요청 | Low | High | 브랜드명 유사도 경고 (Could, MVP 이후) |

---

## 11. Implementation Order (제안)

MVP를 최소 단위로 나눈 구현 순서:

| 순서 | 작업 | 예상 시간 |
|:----:|------|:--------:|
| 1 | DB migration (4개 테이블) | 30분 |
| 2 | 파트너 API (Coming Soon + 요청 + 투표) | 2시간 |
| 3 | 어드민 API (CRUD + 상태 관리) | 1.5시간 |
| 4 | 파트너 대시보드 UI (`/dashboard/recruit`) | 3시간 |
| 5 | 어드민 관리 UI (`/admin/recruit`) | 2시간 |
| 6 | 네비게이션 탭 추가 + 알림 배지 | 30분 |
| 7 | 테스트 + 버그 수정 | 1시간 |

**총 예상**: ~10시간

---

## 12. Next Steps

1. [ ] PO 기획 확인 및 피드백
2. [ ] Design document 작성 (`advertiser-recruitment.design.md`)
3. [ ] DB migration 작성 및 적용
4. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial draft | Claude (PM Agent) |
