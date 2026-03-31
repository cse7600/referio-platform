# 멀티 프로그램 지원 — UI 영향 범위 분석

**작성일**: 2026-03-30
**작성자**: Frontend Architect Agent
**목적**: 광고주당 프로그램 1개 → N개 구조 전환 시 UI/UX 변경 설계

---

## 1. 변경 대상 페이지 목록

| 경로 | 파일 | 변경 규모 | 변경 이유 |
|------|------|-----------|-----------|
| `/advertiser/settings` | `src/app/advertiser/settings/page.tsx` | **대** | 프로그램 설정 탭이 단일 폼 → 리스트+드릴다운 구조로 전면 개편 필요 |
| `/dashboard/programs` | `src/app/dashboard/programs/page.tsx` | **중** | 현재 광고주 ID 기준으로 1개 표시 → program_id 기준 N개 표시로 전환 |
| `/dashboard/programs/[id]` | `src/app/dashboard/programs/[id]/page.tsx` | **소** | `id`가 이미 program 기준이므로 구조 유지, 단 URL 식별자 확인 필요 |
| `/admin/advertisers` | `src/app/admin/advertisers/page.tsx` | **중** | AdvertiserRow의 단일 program_name → 프로그램 N개 표시 방식 결정 필요 |
| `/api/partner/programs` (POST) | API 라우트 | **중** | `advertiser_id` 기준 가입 신청 → `program_id` 기준으로 변경 필요 |

### 영향 없는 페이지
- `/dashboard/programs/[id]` — 이미 program ID 기준 라우팅, 구조 유지 가능
- `/admin/settlements`, `/advertiser/settlements` — 정산은 partner_program 기준이므로 자연스럽게 확장됨
- `/admin/partners`, `/admin/referrals` — 필터 추가 정도로 처리 가능

---

## 2. 광고주 설정 페이지 (`/advertiser/settings`) 변경 설계

### 현재 구조
탭 5개: **기본정보 / 프로그램설정 / 미디어 / 파트너모집 / Airtable연동**

`프로그램설정` 탭 안에 단일 폼 (program_name, description, commission, category, landing_url 등 약 10개 필드가 flat하게 나열)

### 변경안: 드릴다운 구조

```
[설정 탭]
├── 기본정보        (변경 없음)
├── 프로그램        ← 탭명 변경 "프로그램설정" → "프로그램"
│   ├── 프로그램 목록 카드 (기존 프로그램들)
│   │   ├── [프로그램A 카드] → 클릭 시 해당 프로그램 편집 폼으로 이동
│   │   ├── [프로그램B 카드]
│   │   └── [+ 새 프로그램 추가] 버튼
│   └── (편집 모드) 단일 프로그램 폼 — 현재 폼 재사용 가능
├── 미디어          (변경 없음)
├── 파트너모집      (변경 없음)
└── Airtable연동    → 프로그램별로 웹훅이 달라지면 여기도 영향 받음
```

### 프로그램 목록 카드 UI 스펙

각 카드에 표시할 정보:
- 프로그램명
- 공개/비공개 뱃지
- 파트너 수 (참가 중인 파트너)
- 리드 단가 / 계약 단가
- [편집] 버튼

편집 진입 방식: **슬라이드 패널(Sheet)** 권장
- 이유: 탭 내부에서 페이지 전환 없이 편집 완료 → 목록 복귀 UX가 자연스러움
- 현재 `Sheet` 컴포넌트가 shadcn/ui로 이미 설치되어 있으므로 재사용 가능

---

## 3. 파트너 마켓플레이스 (`/dashboard/programs`) 변경 설계

### 현재 구조
- API `/api/partner/programs`가 반환하는 `ProgramItem`의 `id`는 현재 advertiser UUID로 추정
- 카드 1개 = 광고주 1개 (= 프로그램 1개)
- 가입 신청 시 `POST /api/partner/programs` body에 `advertiser_id` 전송

### 멀티 프로그램 전환 후 마켓플레이스 표시 방식

**권장안: 옵션B — 프로그램마다 별도 카드**

이유:
1. 파트너 입장에서 의사결정 단위는 "어떤 프로그램에 가입할지"이지 "어떤 광고주인지"가 아님
2. 한화비전처럼 동일 광고주가 "기업용"/"개인용" 등 다른 조건의 프로그램을 운영할 때 카드를 분리해야 단가/설명이 명확하게 보임
3. 현재 카드 UI 구조(commission 2개 표시, 가입 신청 버튼)가 프로그램 단위로 이미 설계되어 있어 변경 최소화
4. 단점 보완: 동일 광고주의 여러 프로그램이 연속으로 나올 경우 광고주 로고+이름을 작게 공통 표시하여 중복감 줄임

**카드 UI 수정 사항**:
- `ProgramItem.id` → `program_programs.id` (program_id로 전환)
- 가입 신청: `POST /api/partner/programs` body → `{ program_id }` (advertiser_id 제거)
- 동일 광고주의 여러 프로그램이 있을 때 카드 상단에 광고주 뱃지 추가 표시

---

## 4. 어드민 페이지 (`/admin/advertisers`) 변경 설계

### 현재 구조
`AdvertiserRow` 인터페이스에 `program_name`, `program_description` 단일 필드 존재.
광고주 목록 테이블 → 선택 시 다이얼로그(Dialog)에서 파트너/리퍼럴 통계 탭 표시.

### 변경 사항

**변경 규모: 중**

1. **광고주 목록 테이블**: `program_name` 컬럼 → "프로그램 N개"로 표시
   - `program_count: number` 필드 추가 (API 응답 변경 필요)
   - 단일 프로그램이면 프로그램명 그대로 표시, 2개 이상이면 "N개 프로그램"

2. **광고주 상세 다이얼로그**: 기존 탭 구조 유지하되 "프로그램" 탭 추가
   - 탭 구성: 개요 / 파트너 / 리퍼럴 / **프로그램** / 정산
   - 프로그램 탭: 해당 광고주의 프로그램 목록, 각 프로그램별 파트너 수/리퍼럴 수

3. **집계 방식**: 현재 `partner_count`, `referral_count` 등은 광고주 전체 집계 유지
   - 프로그램별 세분화는 상세 다이얼로그 내 프로그램 탭에서 제공

---

## 5. 컴포넌트 재사용 계획

### 재사용 가능한 기존 컴포넌트

| 컴포넌트 | 위치 | 재사용 방식 |
|----------|------|-------------|
| 프로그램 카드 (마켓플레이스) | `programs/page.tsx` 내 인라인 JSX | 별도 `ProgramCard.tsx`로 추출 권장 |
| `MarkdownRenderer` | `src/components/editor/MarkdownRenderer.tsx` | 프로그램 상세 설명 렌더링에 그대로 사용 |
| `Tabs`, `TabsList`, `TabsTrigger` | shadcn/ui | 설정 페이지 탭 구조 유지 |
| `Sheet` (슬라이드 패널) | shadcn/ui | 프로그램 편집 패널에 활용 |
| `Dialog` | shadcn/ui | 어드민 광고주 상세에 그대로 사용 |
| `Badge` + STATUS_CONFIG | `programs/page.tsx` | 별도 `ProgramStatusBadge.tsx`로 추출 권장 |

### 신규 생성 필요 컴포넌트

| 컴포넌트명 | 목적 |
|-----------|------|
| `ProgramCard.tsx` | 마켓플레이스 카드, 재사용 가능하도록 props 기반으로 추출 |
| `ProgramListItem.tsx` | 광고주 설정 페이지의 프로그램 목록 아이템 |
| `ProgramEditSheet.tsx` | 광고주 설정의 프로그램 편집 슬라이드 패널 |

---

## 6. 핵심 UI 결정사항

---

### Q1. 마켓플레이스에서 광고주가 여러 프로그램을 가질 때 어떻게 표시?

**권장안: 옵션B — 프로그램마다 별도 카드**

근거:
- 파트너의 행동 유도 목표는 "특정 프로그램 가입"이므로 의사결정 단위 = 프로그램
- 현재 카드 UI가 이미 프로그램 단위(단가, 가입 버튼)로 설계되어 재사용 용이
- 옵션A(광고주 카드 1개 + 클릭 시 프로그램 선택)는 클릭 뎁스가 하나 더 생겨 전환율 저하 우려

단점 보완 방법:
- 동일 광고주의 프로그램 카드가 2개 이상일 때 카드 헤더에 `[광고주명 · 다른 프로그램 보기]` 링크 표시
- 마켓플레이스 검색 시 광고주명으로도 연관 프로그램 전체가 검색되도록 유지

---

### Q2. 파트너가 동일 광고주의 여러 프로그램에 가입 가능?

**권장안: 허용 (UNIQUE 제약을 partner_id + program_id로 변경)**

근거:
- 한화비전 사례처럼 광고주가 "기업 고객용"과 "개인 고객용" 프로그램을 분리 운영할 때 파트너가 두 채널 모두 활용하는 것이 자연스러움
- 동일 광고주의 여러 프로그램에 가입하더라도 추천코드(`referral_code`)는 프로그램별로 별도 발급되므로 트래킹 혼선 없음
- 광고주가 원하지 않는다면 프로그램 설정에서 "단일 가입만 허용" 옵션으로 개별 제어하는 것이 더 유연함

UI 영향:
- 마켓플레이스에서 동일 광고주의 프로그램 A는 "참가중", 프로그램 B는 "참가 신청" 상태가 독립적으로 표시 가능
- 현재 `copiedId` 상태 관리가 `advertiserId` 기준이므로 `programId` 기준으로 변경 필요

---

### Q3. 광고주 설정 페이지 UX

**권장안: 리스트 → 슬라이드 패널(Sheet) 드릴다운 구조**

현재 상태:
- 설정 페이지에 탭 5개 (기본정보 / 프로그램설정 / 미디어 / 파트너모집 / Airtable)
- `프로그램설정` 탭에 단일 프로그램 폼이 flat하게 배치됨 (약 10개 필드)

권장 구조:
1. `프로그램` 탭 → 프로그램 카드 목록으로 변경 (신규 추가 버튼 포함)
2. 카드 클릭 또는 편집 버튼 → `Sheet` 컴포넌트로 오른쪽에서 슬라이드 인 되는 편집 폼
3. 편집 폼 내용은 현재 폼을 거의 그대로 재사용 (programName, description, commission, category 등)

옵션 비교:
- **페이지 전환 방식** (`/settings/programs/[id]`): 가능하나 탭 컨텍스트를 잃어버리는 단점
- **모달(Dialog) 방식**: 폼이 길어서(10개+ 필드) 스크롤이 불편
- **Sheet 방식** (권장): 탭 레이아웃을 유지하면서 오른쪽 패널에서 편집 완료 → 자연스럽게 목록으로 복귀

Airtable 연동 처리:
- 단기: Airtable 탭은 기존대로 광고주 단위로 유지 (1개 웹훅 연동)
- 중기: 프로그램별로 다른 Airtable 테이블을 연동해야 한다면 Sheet 편집 폼 내에 "연동 설정" 섹션 추가

---

## 7. 구현 우선순위

멀티 프로그램을 지원하기 위한 최소 변경 범위 (MVP):

1. **DB/API 변경** (별도 에이전트 담당): `partner_programs` unique 제약 변경, program 관련 API 응답 구조 확정
2. **마켓플레이스** (`/dashboard/programs`): `handleApply`의 `advertiser_id` → `program_id` 변경, `copiedId` 상태 키 변경
3. **광고주 설정** (`/advertiser/settings`): 프로그램 탭을 리스트 + Sheet 구조로 전환
4. **어드민** (`/admin/advertisers`): `program_count` 표시 추가, 상세 다이얼로그에 프로그램 탭 추가

---

*이 문서는 DB/API 설계가 확정된 후 세부 구현 스펙으로 업데이트 필요.*
