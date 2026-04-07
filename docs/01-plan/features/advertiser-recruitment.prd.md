# Advertiser Recruitment PRD

> **Summary**: 파트너가 신규 광고주를 사전 예약하고 원하는 브랜드를 요청할 수 있는 광고주 모집 기능
>
> **Author**: Claude (PM Agent) / PO
> **Created**: 2026-04-06
> **Last Modified**: 2026-04-07
> **Status**: Implemented (Phase 1 완료, Vercel 배포 완료)
> **Plan Reference**: `docs/01-plan/features/advertiser-recruitment.plan.md`

---

## 1. Executive Summary

### 무엇을 만드는가

Referio 파트너 대시보드에 "광고주 모집" 탭을 추가한다. 이 탭은 두 가지 핵심 기능을 제공한다:

1. **Coming Soon 광고주**: Referio 영업팀이 현재 영업 중이거나 곧 합류 예정인 광고주를 파트너에게 미리 공개한다. 파트너는 관심 있는 광고주에 "사전 예약"을 눌러 합류 즉시 프로그램에 참여할 의사를 표시할 수 있다.

2. **광고주 요청**: 파트너가 "이 브랜드를 Referio에서 다루면 좋겠다"는 요청을 등록할 수 있다. 다른 파트너는 "나도 원해요" 공감 투표를 할 수 있다. 공감 수가 많은 요청은 영업팀의 광고주 영업 우선순위 자료로 활용된다.

### 왜 만드는가

- 파트너가 플랫폼에서 할 수 있는 일이 "이미 합류한 광고주 추천"뿐이면 참여 동기가 약하다
- 영업팀은 "어떤 브랜드를 파트너들이 원하는지" 데이터가 없어 영업 우선순위를 감으로 정한다
- 이 기능은 파트너 리텐션을 높이고, 영업팀에 데이터 기반 의사결정 도구를 제공한다

### 누구를 위한 것인가

- **파트너**: 새 광고주를 기다리며 관심을 표현하고, 원하는 브랜드를 요청
- **어드민(영업팀)**: Coming Soon 광고주를 등록하고, 파트너 요청을 기반으로 영업 우선순위 결정

---

## 2. Problem Statement

### 현재 상태

| 문제 | 영향 | 근본 원인 |
|------|------|----------|
| 파트너가 "앞으로 어떤 광고주가 올지" 알 수 없음 | 플랫폼 기대감 저하, 방문 빈도 감소 | 양방향 소통 채널 부재 |
| 영업팀이 파트너 수요를 파악할 방법 없음 | 영업 우선순위를 감으로 결정 | 수요 데이터 수집 체계 부재 |
| 새 광고주 합류 시 관심 파트너를 찾는 데 시간 소요 | 온보딩 지연, 초기 활동 저조 | 사전 파트너 풀 확보 시스템 부재 |

### 해결 방향

파트너-플랫폼 간 **양방향 소통 채널**을 만든다:
- **플랫폼 → 파트너**: "이런 광고주가 곧 옵니다" (Coming Soon)
- **파트너 → 플랫폼**: "이 브랜드를 다뤄주세요" (광고주 요청)

---

## 3. Goals & Success Metrics

### 정량 목표 (KPI)

| 지표 | 정의 | 측정 방법 | 목표 (출시 후 1개월) |
|------|------|----------|---------------------|
| 사전 예약 참여율 | 예약한 파트너 수 / 활성 파트너 수 | DB 쿼리 | > 20% |
| 월간 광고주 요청 수 | 신규 요청 건수/월 | DB 쿼리 | > 5건 |
| 공감 투표 참여율 | 공감한 파트너 수 / 요청 열람 파트너 수 | 추정 (API 호출 로그) | > 30% |
| 탭 재방문율 | 광고주 모집 탭 2회 이상 방문 파트너 비율 | 향후 분석 도구 연동 시 | > 40% |

### 정성 목표

- 파트너가 "플랫폼이 성장하고 있다"는 인상을 받는다
- 영업팀이 파트너 수요 데이터를 활용해 영업 미팅에서 "N명의 파트너가 이 브랜드를 원합니다"라고 말할 수 있다
- 새 광고주 합류 시 사전 예약 파트너에게 즉시 연결할 수 있다

---

## 4. User Personas

### 4.1 파트너 — "지수" (블로거/인플루언서)

| 항목 | 내용 |
|------|------|
| 역할 | IT/교육 분야 블로거, Referio 파트너 |
| 목표 | 자기 채널과 맞는 광고주를 찾아 추천 수익 극대화 |
| 불만 | 현재 광고주가 3개뿐이라 추천할 게 한정적 |
| 기대 | "교육 플랫폼 광고주가 오면 바로 참여하고 싶다" |
| 사용 패턴 | 주 2~3회 대시보드 방문, 모바일 60% / 데스크탑 40% |

### 4.2 어드민 — "민수" (Referio 영업 담당)

| 항목 | 내용 |
|------|------|
| 역할 | Referio 영업팀, 광고주 발굴 및 온보딩 |
| 목표 | 영업 효율 극대화, 파트너 수요 기반 타겟팅 |
| 불만 | 어떤 브랜드를 우선 영업해야 할지 데이터 없음 |
| 기대 | "공감 수 높은 요청을 보고 영업 우선순위를 정하고 싶다" |
| 사용 패턴 | 주 5일 어드민 페이지 사용, 데스크탑 90% |

---

## 5. Feature Specification

### 5.1 기능 1: Coming Soon 광고주

#### 개요

어드민이 아직 Referio에 합류하지 않았지만 영업 중이거나 합류 확정인 광고주를 "Coming Soon"으로 등록한다. 파트너는 이 목록을 보고 관심 있는 광고주에 사전 예약을 할 수 있다.

#### Happy Path

1. 어드민이 `/admin/recruit` > Coming Soon 관리 탭에서 "새 Coming Soon 등록" 클릭
2. 브랜드명, 로고 URL, 소개, 카테고리, 예정일 입력 후 저장
3. 상태가 `visible`이면 파트너 대시보드에 즉시 노출
4. 파트너 "지수"가 `/dashboard/recruit` > Coming Soon 탭에서 카드 목록을 본다
5. "사전 예약하기" 버튼 클릭 → 버튼 즉시 "예약 완료" 상태로 전환 (낙관적 UI)
6. 서버에 관심 등록 API 호출 → 성공 시 관심 파트너 수 +1 반영
7. 다시 클릭하면 "예약 취소" → 관심 파트너 수 -1

#### Edge Cases

| 상황 | 동작 |
|------|------|
| 네트워크 오류로 예약 API 실패 | 낙관적 UI 롤백, toast 에러 메시지 |
| Coming Soon이 0건 (빈 상태) | "아직 준비 중인 광고주가 없습니다. 곧 새로운 브랜드가 합류할 예정이에요!" 안내 |
| 어드민이 Coming Soon을 `hidden`으로 변경 | 파트너 목록에서 즉시 사라짐, 기존 예약 데이터는 유지 |
| 어드민이 Coming Soon을 삭제 | 관련 interest 데이터도 cascade 삭제 |
| Coming Soon이 `launched`로 전환 | 파트너 목록에서 사라지고, `advertiser_id` FK로 실제 광고주와 연결됨. 사전 예약했던 파트너 목록은 어드민이 조회 가능 (향후 자동 프로그램 매칭 확장 포인트) |
| 이미 `launched` 상태인데 파트너가 직접 URL 접근 | 해당 카드 미표시 (API에서 `visible` 상태만 반환) |

#### Coming Soon 상태 전환 흐름

```
  [hidden] ←→ [visible] → [launched]
     ↑                        ↓
   어드민 수동 전환      advertiser_id 연결
                          (비가역적)
```

- `hidden`: 어드민만 볼 수 있음 (초안 작성 중)
- `visible`: 파트너에게 공개됨
- `launched`: 광고주가 실제 합류 완료. 파트너 목록에서 제거. 이 전환은 비가역적 (다시 visible로 돌릴 수 없음)

### 5.2 기능 2: 파트너 광고주 요청 + 공감 투표

#### 개요

파트너가 "Referio에 이 브랜드가 있으면 좋겠다"는 요청을 등록한다. 다른 파트너는 "나도 원해요" 공감 투표를 할 수 있다. 어드민은 요청 목록을 공감 수 기준으로 보고 영업 우선순위를 판단한다.

#### Happy Path

1. 파트너 "지수"가 `/dashboard/recruit` > 광고주 요청 탭에서 "+ 광고주 요청하기" 클릭
2. 모달에서 브랜드명(필수), 브랜드 URL(선택), 서비스 소개(선택) 입력 후 제출
3. 요청이 `pending` 상태로 저장됨 → **본인에게만 "검토 대기중" 뱃지로 표시**, 다른 파트너에게 미노출
4. 어드민이 `/admin/recruit` > 파트너 요청 관리에서 pending 요청 확인 및 검수
5. 어드민이 `approved` 처리 → **이 시점부터 다른 파트너에게 공개**, 공감 투표 가능
6. 다른 파트너 "영희"가 이 요청을 보고 "나도 원해요" 클릭 → 공감 수 +1
7. 어드민은 이후에도 공감 수 내림차순으로 요청 목록 모니터링, 영업 우선순위에 활용

#### Edge Cases

| 상황 | 동작 |
|------|------|
| 파트너가 하루 요청 한도 초과 | "오늘은 최대 3건까지 요청 가능합니다. 내일 다시 시도해주세요." toast + 제출 버튼 비활성화 |
| 브랜드명만 입력 (URL/소개 빈칸) | 허용 (브랜드명만 필수) |
| 동일 브랜드명 중복 요청 | MVP: 허용 (동일 브랜드를 다른 파트너가 각각 요청 가능). Could: 유사 브랜드명 경고 |
| 자신의 요청에 공감 시도 | **불가** — 자신의 요청에는 공감 버튼 대신 "내 요청" 뱃지 표시 |
| 공감 취소 | 가능 — "나도 원해요" 다시 클릭하면 공감 해제 |
| 파트너가 자신의 요청 삭제/취소 | **불가** — 한번 제출하면 취소 불가 (다른 파트너의 공감이 붙을 수 있으므로). 부적절한 요청은 어드민이 `rejected` 처리 |
| 거절된(`rejected`) 요청 표시 | 요청자 본인에게만 "거절됨" 뱃지 표시, 다른 파트너에게는 미노출 |
| 빈 상태 (요청 0건) | "아직 요청이 없습니다. 첫 번째로 원하는 브랜드를 요청해보세요!" 안내 + CTA 버튼 |
| 요청이 `approved` 상태 | 목록에 "검토 완료" 뱃지 표시. 공감 투표는 계속 가능 |

#### 요청 상태 흐름

```
  [pending] → [reviewing] → [approved]
                          → [rejected]
```

- `pending`: 파트너가 제출 직후. **어드민 검수 대기 중. 요청자 본인에게만 표시.**
- `approved`: 어드민 검수 통과. **이 시점부터 전체 파트너에게 공개**, 공감 투표 가능
- `rejected`: 부적절하거나 불가능한 요청 (스팸, 이미 합류, 경쟁사 등). **요청자 본인에게만 "거절됨" 뱃지 표시**

> ⚠️ **핵심 규칙**: 파트너가 요청을 제출해도 어드민이 승인하기 전까지 다른 파트너에게 절대 노출되지 않는다.

#### 공개 범위 정책

| 상태 | 요청자 본인 | 다른 파트너 | 어드민 |
|------|:---------:|:----------:|:-----:|
| `pending` | 보임 + "검토 대기중" 뱃지 | **미노출** | 보임 (검수 대기 목록) |
| `approved` | 보임 + "승인됨" 뱃지 | **보임 + 공감 가능** | 보임 |
| `rejected` | **미노출** | **미노출** | 보임 (어드민 전용) |

---

## 6. UI/UX Specification

### 6.1 파트너 대시보드 — 네비게이션

**현재 탭 구조:**
```
홈 | 프로그램 | 이벤트 | 고객 | 지급 | 활동 지원 | 문의 | 활동정보
```

**변경 후:**
```
홈 | 프로그램 | 이벤트 | 광고주 모집 | 고객 | 지급 | 활동 지원 | 문의 | 활동정보
                        ^^^^^^^^^^^^
                        신규 (아이콘: Building2)
```

- 경로: `/dashboard/recruit`
- 아이콘: `Building2` (lucide-react, admin-nav에 이미 import됨)
- 새 항목 배지: localStorage 기반 빨간 점 (이벤트 탭과 동일 패턴)

### 6.2 `/dashboard/recruit` 페이지 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│  페이지 제목: 광고주 모집                                   │
│  설명: 새로운 광고주 소식을 확인하고 원하는 브랜드를 요청하세요  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Coming Soon]  [광고주 요청]        ← 탭 전환 (기본: CS)  │
│  ─────────────────────────────────────                    │
│                                                          │
│  === Coming Soon 탭 ===                                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [로고]   브랜드A              [카테고리 뱃지]       │    │
│  │          "온라인 교육 플랫폼 서비스 소개..."         │    │
│  │          예정: 2026년 5월                          │    │
│  │          관심 파트너 12명                           │    │
│  │                              [사전 예약하기]        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [로고]   브랜드B              [카테고리 뱃지]       │    │
│  │          "금융 솔루션..."                           │    │
│  │          예정: 2026년 6월                          │    │
│  │          관심 파트너 5명                            │    │
│  │                              [예약 완료 ✓]          │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  === 광고주 요청 탭 ===                                   │
│                                                          │
│  [+ 광고주 요청하기]  (하루 N/3건 사용)                     │
│                                                          │
│  정렬: 공감 수 많은 순                                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  브랜드X                     공감 8명               │    │
│  │  https://brandx.com          [나도 원해요 ♥]       │    │
│  │  "요가/필라테스 구독 서비스..."                       │    │
│  │  요청자: 파트너A  |  3일 전   [pending 뱃지]        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  브랜드Y                     공감 3명               │    │
│  │  (URL 없음)                   [공감 완료 ✓]          │    │
│  │  "설명 없음"                                        │    │
│  │  요청자: 나  |  1일 전        [내 요청] 뱃지         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  === 요청 모달 (Dialog) ===                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  광고주 요청하기                          [X 닫기]  │    │
│  │  ────────────────────────────────                  │    │
│  │  브랜드명 *   [                        ]           │    │
│  │  브랜드 URL   [https://                 ]           │    │
│  │  서비스 소개  [                              ]      │    │
│  │              [                              ]      │    │
│  │                                                    │    │
│  │  오늘 남은 요청: 2/3건                              │    │
│  │                              [취소] [요청하기]       │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 6.3 빈 상태 / 로딩 / 에러 UI

| 상태 | Coming Soon 탭 | 광고주 요청 탭 |
|------|---------------|---------------|
| **로딩** | 카드 스켈레톤 3개 (pulse 애니메이션) | 카드 스켈레톤 3개 |
| **빈 상태** | "아직 준비 중인 광고주가 없습니다. 곧 새로운 브랜드가 합류할 예정이에요!" (Building2 아이콘) | "아직 요청이 없습니다. 첫 번째로 원하는 브랜드를 요청해보세요!" + [요청하기] CTA |
| **API 에러** | "목록을 불러오지 못했습니다." + [다시 시도] 버튼 | 동일 |
| **인증 실패 (401)** | `/login` 페이지로 자동 이동 | 동일 |

### 6.4 어드민 페이지 — `/admin/recruit`

```
┌──────────────────────────────────────────────────────────┐
│  [Coming Soon 관리]  |  [파트너 요청 관리]                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  === Coming Soon 관리 탭 ===                              │
│                                                          │
│  [+ 새 Coming Soon 등록] 버튼                              │
│                                                          │
│  ┌────────┬──────┬────────┬──────┬────────┬────────┐    │
│  │ 브랜드명│카테고리│ 예정일  │예약 수│ 상태   │ 액션    │    │
│  ├────────┼──────┼────────┼──────┼────────┼────────┤    │
│  │ 브랜드A│ 교육  │ 25.05  │  12  │ 공개   │ 수정/삭제│   │
│  │ 브랜드B│ 금융  │ 25.06  │   5  │ 비공개 │ 수정/삭제│   │
│  │ 브랜드C│ 커머스│  -     │   0  │ 런칭완료│ 보기    │    │
│  └────────┴──────┴────────┴──────┴────────┴────────┘    │
│                                                          │
│  Coming Soon 등록/수정 모달:                               │
│  - 브랜드명 (필수)                                        │
│  - 로고 URL (선택)                                        │
│  - 대표 이미지 URL (선택)                                  │
│  - 카테고리 (드롭다운: 교육/금융/커머스/IT/건강/기타)         │
│  - 서비스 소개 (Textarea)                                  │
│  - 예상 런칭일 (Date picker)                               │
│  - 상태 (visible/hidden)                                   │
│  - 실제 광고주 연결 (launched 전환 시, advertiser 선택)      │
│                                                          │
│  === 파트너 요청 관리 탭 ===                               │
│                                                          │
│  정렬: 공감 수 내림차순 (기본)                              │
│                                                          │
│  ┌────────┬──────────┬──────┬──────┬────────┬────────┐  │
│  │ 브랜드명│   URL     │요청자 │공감 수│ 상태   │ 액션    │  │
│  ├────────┼──────────┼──────┼──────┼────────┼────────┤  │
│  │ 브랜드X│ brandx.co│파트너A│   8  │ 대기중 │상태변경  │  │
│  │ 브랜드Y│  (없음)  │파트너B│   3  │ 검토중 │상태변경  │  │
│  └────────┴──────────┴──────┴──────┴────────┴────────┘  │
│                                                          │
│  상태 변경 드롭다운: pending / reviewing / approved / rejected│
│  메모 입력: Textarea (어드민 내부 메모)                     │
└──────────────────────────────────────────────────────────┘
```

### 6.5 모바일 고려사항

- Coming Soon 카드: 로고 + 브랜드명은 상단, 소개/예정일은 하단 스택 레이아웃
- 예약/공감 버튼: 충분한 터치 영역 (최소 44px 높이)
- 요청 모달: 화면 하단에서 올라오는 Sheet 스타일 (기존 Dialog 컴포넌트의 모바일 대응)
- 탭 전환: 스크롤 없이 항상 보이는 위치에 고정

---

## 7. Data Model

### 7.1 신규 테이블

#### `coming_soon_advertisers`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | 기본 키 |
| `brand_name` | `TEXT` | NOT NULL | 브랜드명 |
| `brand_logo_url` | `TEXT` | NULLABLE | 로고 이미지 URL |
| `brand_image_url` | `TEXT` | NULLABLE | 배너/대표 이미지 URL |
| `description` | `TEXT` | NULLABLE | 서비스 소개 |
| `category` | `TEXT` | NULLABLE | 카테고리 (자유 텍스트, UI는 드롭다운) |
| `expected_launch_date` | `DATE` | NULLABLE | 예상 런칭일 |
| `status` | `TEXT` | NOT NULL, DEFAULT 'hidden' | `hidden` / `visible` / `launched` |
| `advertiser_id` | `UUID` | NULLABLE, FK → advertisers.id | 런칭 시 실제 광고주 연결 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | 생성일 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | 수정일 |

**인덱스:**
- `idx_coming_soon_status` ON `coming_soon_advertisers(status)` — 파트너 목록 조회 시 `status = 'visible'` 필터링
- `idx_coming_soon_advertiser` ON `coming_soon_advertisers(advertiser_id)` WHERE `advertiser_id IS NOT NULL`

**트리거:**
- `updated_at` 자동 갱신 트리거 (Supabase moddatetime 확장 또는 수동)

#### `coming_soon_interests`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | 기본 키 |
| `coming_soon_id` | `UUID` | NOT NULL, FK → coming_soon_advertisers.id ON DELETE CASCADE | Coming Soon 참조 |
| `partner_id` | `UUID` | NOT NULL, FK → partners.id ON DELETE CASCADE | 파트너 참조 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | 등록 시점 |

**제약:**
- `UNIQUE(coming_soon_id, partner_id)` — 파트너당 1회 예약 제한

**인덱스:**
- Unique 제약이 자동으로 인덱스 생성

#### `advertiser_requests`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | 기본 키 |
| `brand_name` | `TEXT` | NOT NULL | 요청 브랜드명 |
| `brand_url` | `TEXT` | NULLABLE | 브랜드 웹사이트 URL |
| `description` | `TEXT` | NULLABLE | 서비스 소개 |
| `requested_by` | `UUID` | NOT NULL, FK → partners.id ON DELETE CASCADE | 요청한 파트너 |
| `status` | `TEXT` | NOT NULL, DEFAULT 'pending' | `pending` / `reviewing` / `approved` / `rejected` |
| `admin_note` | `TEXT` | NULLABLE | 어드민 내부 메모 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | 요청일 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | 수정일 |

**인덱스:**
- `idx_requests_status` ON `advertiser_requests(status)` — 상태별 필터링
- `idx_requests_requested_by` ON `advertiser_requests(requested_by)` — 파트너별 요청 조회
- `idx_requests_created_at` ON `advertiser_requests(created_at DESC)` — 최신순 정렬

#### `advertiser_request_votes`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | 기본 키 |
| `request_id` | `UUID` | NOT NULL, FK → advertiser_requests.id ON DELETE CASCADE | 요청 참조 |
| `partner_id` | `UUID` | NOT NULL, FK → partners.id ON DELETE CASCADE | 투표한 파트너 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | 투표 시점 |

**제약:**
- `UNIQUE(request_id, partner_id)` — 파트너당 1회 공감 제한

### 7.2 기존 테이블 영향

| 테이블 | 변경 | 설명 |
|--------|------|------|
| `advertisers` | 변경 없음 | `coming_soon_advertisers.advertiser_id`의 FK 대상 |
| `partners` | 변경 없음 | 모든 신규 테이블의 `partner_id` FK 대상 |

### 7.3 RLS (Row Level Security) 정책

Supabase RLS는 이 기능에서 직접 사용하지 않는다. 모든 접근은 서버 사이드 API Route를 통하며, API에서 인증/권한을 검증한다 (기존 패턴 유지).

---

## 8. API Specification

### 8.1 파트너 API

모든 파트너 API는 Supabase Auth 세션 필수. 미인증 시 `401 Unauthorized` 반환.

#### `GET /api/partner/recruit/coming-soon`

Coming Soon 광고주 목록 + 현재 파트너의 예약 여부 반환.

**Request**: 없음 (쿼리 파라미터 없음)

**Response (200)**:
```json
{
  "comingSoon": [
    {
      "id": "uuid-1",
      "brand_name": "에듀테크 스타트업",
      "brand_logo_url": "https://example.com/logo.png",
      "brand_image_url": null,
      "description": "온라인 교육 플랫폼",
      "category": "교육",
      "expected_launch_date": "2026-05-15",
      "interest_count": 12,
      "my_interest": true
    }
  ]
}
```

**로직**:
1. Supabase Auth에서 user_id 추출
2. `partners` 테이블에서 `auth_user_id = user_id`인 partner 조회 (주의: `user_id` 컬럼 아님)
3. `coming_soon_advertisers WHERE status = 'visible'` 조회
4. LEFT JOIN `coming_soon_interests` → `interest_count` 집계 + 현재 파트너의 예약 여부(`my_interest`)
5. `expected_launch_date ASC` 정렬 (가까운 날짜 우선)

#### `POST /api/partner/recruit/coming-soon/[id]/interest`

사전 예약 등록.

**Request**: 없음 (URL의 id만 사용)

**Response (201)**:
```json
{ "success": true }
```

**에러**:
- `409 Conflict`: 이미 예약됨 → `{ "error": "already_interested" }`
- `404 Not Found`: Coming Soon이 존재하지 않거나 `visible`이 아님

#### `DELETE /api/partner/recruit/coming-soon/[id]/interest`

사전 예약 취소.

**Response (200)**:
```json
{ "success": true }
```

**에러**:
- `404 Not Found`: 예약이 존재하지 않음

#### `GET /api/partner/recruit/requests`

광고주 요청 목록 + 현재 파트너의 공감 여부 반환.

**Response (200)**:
```json
{
  "requests": [
    {
      "id": "uuid-2",
      "brand_name": "요가 플랫폼",
      "brand_url": "https://yoga.co.kr",
      "description": "요가/필라테스 구독 서비스",
      "requested_by": "uuid-partner-a",
      "requester_name": "파트너A",
      "status": "pending",
      "vote_count": 8,
      "my_vote": false,
      "is_mine": false,
      "created_at": "2026-04-05T10:00:00Z"
    }
  ],
  "today_request_count": 1
}
```

**로직**:
1. `advertiser_requests` 조회
2. 현재 파트너가 요청자인 경우: 모든 상태 표시
3. 다른 파트너의 요청: `status = 'approved'`인 것만 표시 (pending/rejected 미노출)
4. LEFT JOIN `advertiser_request_votes` → `vote_count` 집계 + `my_vote`
5. LEFT JOIN `partners` → `requester_name` (요청자 이름)
6. 정렬: `vote_count DESC, created_at DESC`
7. `today_request_count`: 현재 파트너가 오늘(KST 기준) 제출한 요청 수

#### `POST /api/partner/recruit/requests`

새 광고주 요청 등록.

**Request**:
```json
{
  "brand_name": "요가 플랫폼",
  "brand_url": "https://yoga.co.kr",
  "description": "요가/필라테스 구독 서비스"
}
```

**Validation**:
- `brand_name`: 필수, 1~100자
- `brand_url`: 선택, URL 형식 검증 (빈 문자열은 null 처리)
- `description`: 선택, 최대 500자

**Response (201)**:
```json
{
  "success": true,
  "request": { "id": "uuid-new", "brand_name": "요가 플랫폼", ... }
}
```

**에러**:
- `400 Bad Request`: validation 실패
- `429 Too Many Requests`: 하루 3건 초과 → `{ "error": "daily_limit_exceeded", "message": "하루 최대 3건까지 요청 가능합니다" }`

**일일 제한 로직**:
```sql
SELECT COUNT(*) FROM advertiser_requests
WHERE requested_by = :partner_id
  AND created_at >= (NOW() AT TIME ZONE 'Asia/Seoul')::date AT TIME ZONE 'Asia/Seoul'
```

#### `POST /api/partner/recruit/requests/[id]/vote`

공감 등록.

**Request**: 없음

**Response (201)**:
```json
{ "success": true }
```

**에러**:
- `403 Forbidden`: 자신의 요청에 공감 시도 → `{ "error": "cannot_vote_own_request" }`
- `409 Conflict`: 이미 공감함
- `404 Not Found`: 요청이 존재하지 않거나 `rejected` 상태

#### `DELETE /api/partner/recruit/requests/[id]/vote`

공감 취소.

**Response (200)**:
```json
{ "success": true }
```

### 8.2 어드민 API

모든 어드민 API는 admin 세션 필수. 비어드민 시 `403 Forbidden` 반환.

#### `GET /api/admin/recruit/coming-soon`

Coming Soon 전체 목록 (모든 상태) + 예약 수.

**Response (200)**:
```json
{
  "comingSoon": [
    {
      "id": "uuid-1",
      "brand_name": "에듀테크 스타트업",
      "brand_logo_url": "...",
      "brand_image_url": "...",
      "description": "...",
      "category": "교육",
      "expected_launch_date": "2026-05-15",
      "status": "visible",
      "advertiser_id": null,
      "interest_count": 12,
      "created_at": "2026-04-01T00:00:00Z",
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/admin/recruit/coming-soon`

Coming Soon 등록.

**Request**:
```json
{
  "brand_name": "에듀테크 스타트업",
  "brand_logo_url": "https://example.com/logo.png",
  "brand_image_url": null,
  "description": "온라인 교육 플랫폼",
  "category": "교육",
  "expected_launch_date": "2026-05-15",
  "status": "hidden"
}
```

**Validation**:
- `brand_name`: 필수, 1~100자
- `status`: 필수, `hidden` 또는 `visible` (등록 시 `launched` 불가)
- 나머지: 선택

**Response (201)**:
```json
{ "success": true, "comingSoon": { ... } }
```

#### `PATCH /api/admin/recruit/coming-soon/[id]`

Coming Soon 수정.

**Request** (모든 필드 선택):
```json
{
  "brand_name": "에듀테크 스타트업 (수정)",
  "status": "launched",
  "advertiser_id": "uuid-advertiser"
}
```

**특수 로직 — `launched` 전환 시**:
- `status: 'launched'`로 변경할 경우 `advertiser_id`도 함께 제공해야 함
- `advertiser_id`가 `advertisers` 테이블에 존재하는지 검증
- 이미 `launched`인 경우 `visible`이나 `hidden`으로 되돌릴 수 없음 → `400 Bad Request`

#### `DELETE /api/admin/recruit/coming-soon/[id]`

Coming Soon 삭제. `coming_soon_interests`는 CASCADE로 자동 삭제.

**Response (200)**:
```json
{ "success": true }
```

**제한**: `launched` 상태인 항목은 삭제 불가 → `400 Bad Request`

#### `GET /api/admin/recruit/requests`

파트너 요청 전체 목록 (모든 상태) + 공감 수.

**Response (200)**:
```json
{
  "requests": [
    {
      "id": "uuid-2",
      "brand_name": "요가 플랫폼",
      "brand_url": "https://yoga.co.kr",
      "description": "...",
      "requested_by": "uuid-partner",
      "requester_name": "파트너A",
      "requester_email": "a@example.com",
      "status": "pending",
      "admin_note": null,
      "vote_count": 8,
      "created_at": "2026-04-05T10:00:00Z"
    }
  ]
}
```

정렬: `vote_count DESC` (기본)

#### `PATCH /api/admin/recruit/requests/[id]`

요청 상태 변경 + 메모.

**Request**:
```json
{
  "status": "approved",
  "admin_note": "영업팀 미팅 예정 (4월 중)"
}
```

**Validation**:
- `status`: `approved` / `rejected` 중 하나 (어드민은 pending → approved 또는 rejected만 처리)
- `admin_note`: 선택, 최대 1000자

**Response (200)**:
```json
{ "success": true }
```

---

## 9. Business Rules

### 9.1 요청 제한 (스팸 방지)

| 규칙 | 값 | 이유 |
|------|-----|------|
| 일일 요청 한도 | 파트너당 하루 최대 3건 | 스팸 방지, 의미 있는 요청만 유도 |
| 하루 기준 | KST(Asia/Seoul) 자정 리셋 | 사용자 체감 일치 |
| 제한 범위 | `advertiser_requests` INSERT만 해당 | 공감 투표는 제한 없음 |

### 9.2 자기 요청 공감 제한

- 파트너는 자신이 등록한 요청(`requested_by = 본인`)에 공감 투표 불가
- API에서 `403 Forbidden` 반환
- UI에서는 "내 요청" 뱃지로 표시하고 공감 버튼 미노출

### 9.3 삭제 정책

| 대상 | 파트너 삭제 | 어드민 삭제 |
|------|:---------:|:---------:|
| 자신의 요청 | 불가 | 가능 (rejected 처리) |
| 자신의 예약 | 가능 (취소) | N/A |
| 자신의 공감 | 가능 (취소) | N/A |
| Coming Soon 항목 | N/A | 가능 (launched 제외) |

### 9.4 Coming Soon 전환 규칙

| 전환 | 가능 여부 | 조건 |
|------|:---------:|------|
| hidden → visible | 가능 | 제한 없음 |
| visible → hidden | 가능 | 기존 예약 데이터 유지 |
| visible → launched | 가능 | `advertiser_id` 필수 |
| hidden → launched | 가능 | `advertiser_id` 필수 |
| launched → * | **불가** | 비가역적 전환 |

### 9.5 권한 매트릭스

| 기능 | 미인증 | 파트너 | 어드민 |
|------|:-----:|:-----:|:-----:|
| Coming Soon 목록 조회 | 401 | visible만 | 전체 |
| 사전 예약 | 401 | 가능 | N/A |
| 광고주 요청 목록 조회 | 401 | approved만 노출 + 본인의 pending/rejected 포함 | 전체 |
| 광고주 요청 등록 | 401 | 하루 3건 | N/A |
| 공감 투표 | 401 | approved 요청만, 자기 요청 제외 | N/A |
| Coming Soon CRUD | 403 | 403 | 가능 |
| 요청 상태 변경 | 403 | 403 | 가능 |

---

## 10. Non-Functional Requirements

### 10.1 성능

| 항목 | 기준 | 방법 |
|------|------|------|
| Coming Soon 목록 로딩 | < 500ms | 인덱스 활용, 단일 쿼리로 COUNT 포함 |
| 요청 목록 로딩 | < 500ms | 인덱스 활용, vote_count 서브쿼리 |
| 예약/공감 토글 응답 | < 300ms | 단순 INSERT/DELETE |
| 동시 예약 충돌 | UNIQUE 제약이 처리 | DB 레벨에서 중복 방지, 409 반환 |

### 10.2 보안

| 항목 | 기준 |
|------|------|
| 파트너 인증 | Supabase Auth 세션 필수 (`auth_user_id` 기반) |
| 어드민 인증 | admin 세션 체크 (기존 패턴) |
| XSS 방지 | `brand_name`, `description` 등 사용자 입력은 React에서 자동 이스케이프 |
| SQL Injection | Supabase SDK의 파라미터 바인딩 사용 |
| IDOR 방지 | 파트너 API는 세션의 `partner_id`만 사용, URL 파라미터로 다른 파트너 행위 불가 |

### 10.3 접근성

| 항목 | 기준 |
|------|------|
| 키보드 네비게이션 | 탭/엔터로 예약/공감 버튼 접근 가능 |
| 색상 대비 | 뱃지 텍스트 4.5:1 이상 대비 |
| 스크린 리더 | 버튼에 aria-label 포함 ("브랜드A 사전 예약하기") |

---

## 11. Implementation Phases

### Phase 1: Must (MVP) — 핵심 기능

이 Phase만으로도 기능이 동작해야 한다.

| 순서 | 작업 | 예상 시간 | 의존성 |
|:----:|------|:--------:|:-----:|
| 1 | DB migration (4개 테이블 + 인덱스 + 제약) | 30분 | 없음 |
| 2 | 파트너 API: Coming Soon 목록 + 예약 등록/취소 | 1.5시간 | #1 |
| 3 | 파트너 API: 요청 목록 + 등록(일일 제한) + 공감 등록/취소 | 2시간 | #1 |
| 4 | 어드민 API: Coming Soon CRUD | 1시간 | #1 |
| 5 | 어드민 API: 요청 목록 + 상태 변경 | 1시간 | #1 |
| 6 | 파트너 UI: `/dashboard/recruit` (두 탭 + 카드 + 모달) | 3시간 | #2, #3 |
| 7 | 어드민 UI: `/admin/recruit` (두 탭 + 테이블 + 모달) | 2시간 | #4, #5 |
| 8 | 네비게이션 탭 추가 (파트너 layout + 어드민 nav) | 30분 | #6, #7 |

**총 예상: ~11.5시간**

### Phase 2: Should (개선)

| 작업 | 설명 |
|------|------|
| Coming Soon → launched 전환 UI | 어드민이 실제 광고주 선택 후 전환하는 워크플로우 |
| 새 Coming Soon 알림 배지 | 파트너 탭에 빨간 점 (localStorage 기반, 이벤트 탭 패턴 재활용) |
| 사전 예약 파트너 목록 | 어드민이 Coming Soon별 예약 파트너 이름/이메일 확인 |
| 요청 중복 브랜드명 경고 | 유사 브랜드명 존재 시 경고 표시 |

### Phase 3: Could (향후)

| 작업 | 설명 |
|------|------|
| 카테고리 필터링 | 파트너 Coming Soon/요청 목록에서 카테고리 필터 |
| Coming Soon 알림 이메일 | 새 Coming Soon 등록 시 전체 파트너에 알림 이메일 |
| 자동 프로그램 매칭 | launched 전환 시 예약 파트너에게 자동 프로그램 연결 |
| 요청 → Coming Soon 전환 | 어드민이 승인한 요청을 Coming Soon으로 자동 생성 |

---

## 12. Open Questions

| # | 질문 | 결정 필요 시점 | 현재 기본값 |
|---|------|:------------:|-----------|
| 1 | Coming Soon 로고/이미지를 파일 업로드로 할지 URL 입력으로 할지? | Phase 1 시작 전 | URL 입력 (MVP 단순화) |
| 2 | 카테고리를 DB enum으로 강제할지 자유 텍스트로 할지? | Phase 1 시작 전 | 자유 텍스트 (UI 드롭다운으로 가이드) |
| 3 | launched 전환 시 예약 파트너에게 알림을 보낼지? | Phase 2 | 보내지 않음 (MVP) |
| 4 | 파트너 요청이 일정 공감 수 이상이면 자동으로 어드민에게 알림? | Phase 2 | 알림 없음 (어드민이 수시로 확인) |
| 5 | rejected 요청을 요청자에게도 숨길지? | **확정** | **어드민에게만 표시, 요청자 포함 파트너에게 미노출** |
| 6 | 파트너 탈퇴 시 해당 파트너의 요청/공감 처리 방식? | **확정** | CASCADE 삭제 (FK 설정, 구현 완료) |

---

## 13. Appendix

### 관련 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 기획안 (Plan) | `docs/01-plan/features/advertiser-recruitment.plan.md` | 초기 기획 + 유저 스토리 |
| 메인 PRD | `docs/PRD-v1.0.md` | 전체 프로젝트 PRD |
| 이벤트 탭 Plan | `docs/01-plan/features/event-detail-page.plan.md` | 재활용 패턴 참고 |

### 재활용 코드 패턴

| 기존 코드 | 재활용 위치 | 파일 |
|----------|-----------|------|
| 이벤트 카드 UI + TYPE_CONFIG | Coming Soon/요청 카드 | `src/app/dashboard/events/page.tsx` |
| 낙관적 참여 UX (이벤트 참여) | 예약/공감 토글 | `src/app/dashboard/events/page.tsx` |
| Dialog 모달 (게시물 인증) | 요청 등록 모달 | `@/components/ui/dialog` |
| 어드민 테이블 패턴 | 어드민 Coming Soon/요청 관리 | `src/app/admin/partners/page.tsx` |
| 파트너 nav items 배열 | 탭 추가 | `src/app/dashboard/layout.tsx` L42-49 |
| 어드민 NAV_ITEMS 배열 | 탭 추가 | `src/app/admin/admin-nav.tsx` L25-35 |
| localStorage 알림 배지 | 새 항목 알림 | `src/app/dashboard/layout.tsx` (이벤트 패턴) |

### Migration 번호

Migration 번호: **028** (`supabase/migrations/028_advertiser_recruitment.sql`)
Supabase 적용 완료 (2026-04-07)

---

## 14. 구현 이력

### Phase 1 완료 (2026-04-07, Vercel 배포 완료)

| 항목 | 파일 경로 | 상태 |
|------|----------|:----:|
| DB migration (테이블 4개) | `supabase/migrations/028_advertiser_recruitment.sql` | ✅ |
| Coming Soon 목록 API | `src/app/api/partner/recruit/coming-soon/route.ts` | ✅ |
| 사전 예약 API | `src/app/api/partner/recruit/coming-soon/[id]/interest/route.ts` | ✅ |
| 요청 목록/등록 API | `src/app/api/partner/recruit/requests/route.ts` | ✅ |
| 공감 투표 API | `src/app/api/partner/recruit/requests/[id]/vote/route.ts` | ✅ |
| 어드민 Coming Soon CRUD | `src/app/api/admin/recruit/coming-soon/route.ts` + `[id]/route.ts` | ✅ |
| 어드민 요청 목록/검수 | `src/app/api/admin/recruit/requests/route.ts` + `[id]/route.ts` | ✅ |
| 파트너 UI | `src/app/dashboard/recruit/page.tsx` | ✅ |
| 어드민 UI | `src/app/admin/recruit/page.tsx` | ✅ |
| 파트너 네비 탭 + NEW 뱃지 | `src/app/dashboard/layout.tsx` | ✅ |
| 어드민 네비 탭 | `src/app/admin/admin-nav.tsx` | ✅ |

### 확정된 비즈니스 규칙 (PRD 검토 중 결정)
- `rejected` 요청: 어드민에게만 노출, 요청자 포함 파트너에게 **완전 미노출**
- 요청 삭제: 파트너 불가, 어드민이 `rejected` 처리로 대체
- 일일 요청 한도: 파트너당 **3건** (KST 자정 리셋)
- `approved` 후에만 다른 파트너에게 공개 및 공감 가능

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial PRD (Plan 기반 작성) | Claude (PM Agent) |
| 1.1 | 2026-04-06 | 어드민 검수 플로우 추가, rejected 공개 범위 확정 | PO / Claude |
| 1.2 | 2026-04-07 | Phase 1 구현 완료 반영, 배포 이력 추가 | Claude |
