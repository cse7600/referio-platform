# Sales Demo Mode Planning Document

> **Summary**: 실제 DB 없이도 광고주별 맞춤 더미 데이터로 플랫폼을 시연할 수 있는 범용 세일즈 데모 모드
>
> **Project**: Referio Platform
> **Author**: cse7600
> **Date**: 2026-04-08
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

신규 광고주 세일즈 미팅 시 실제 데이터 없이도 플랫폼의 가치를 직관적으로 보여줄 수 있는 시연 모드를 제공한다.
현재 차별화상회(chabyulhwa) 전용 하드코딩 방식을 범용 모듈 시스템으로 리팩토링하여, 새 광고주 추가 시 Config 한 줄로 대응 가능하게 한다.

### 1.2 Background

- **현재 상황**: 차별화상회 시연용 더미 데이터가 코드 곳곳에 하드코딩되어 있음
- **문제점**: 밀리의서재 시연 추가 시 같은 방식으로 하드코딩하면 코드 중복/유지보수 비용 급증
- **요구사항**: 광고주별 Config 파일 하나로 더미 데이터(파트너, 전환 이벤트, 정산, 프로그램)를 관리하는 범용 구조 필요

### 1.3 Related Documents

- 기존 구현: 코드베이스 내 chabyulhwa 관련 demo 플래그 참조
- 메인 PRD: `docs/PRD-v1.0.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] 범용 `DemoConfig` 인터페이스 및 레지스트리 구조 설계
- [ ] 차별화상회 기존 하드코딩 → Config 기반으로 마이그레이션
- [ ] 밀리의서재 시연 Config 추가 (app_install, subscribe 이벤트)
- [ ] 헤더 데모 토글 버튼 (ON/OFF, localStorage 상태 저장)
- [ ] 시연 적용 범위: 대시보드 홈, 파트너 목록, 정산, 이벤트 탭
- [ ] DEMO 태그 기반 코드 추적/제거 가이드

### 2.2 Out of Scope

- DB 스키마 변경 없음
- 어드민 GUI 기반 시연 데이터 관리 (향후 Phase 2)
- 실제 파트너 계정으로 로그인하는 시연 (이건 별도 staging 환경 영역)
- 타 광고주 계정에 영향을 주는 모든 변경

---

## 3. User Stories

### US-01: 세일즈 담당자 — 시연 시작

> 세일즈 담당자로서, 신규 광고주 미팅에서 헤더 토글 한 번으로 더미 데이터가 채워진 플랫폼을 보여주고 싶다.
> 그래야 "아직 파트너가 없어서 빈 화면"이라는 어색한 상황을 피할 수 있다.

**수락 기준**:
- 광고주 계정으로 로그인 후 헤더에 "시연 모드" 토글 표시
- 토글 ON → 해당 광고주의 더미 파트너/정산/이벤트 데이터로 대시보드 채워짐
- 새로고침 후에도 시연 모드 유지 (localStorage)

### US-02: 세일즈 담당자 — 광고주 맞춤 전환 이벤트 표시

> 세일즈 담당자로서, 밀리의서재 미팅에서는 "앱설치/구독" 기반 지표를 보여주고,
> 차별화상회 미팅에서는 "가입/첫구매" 기반 지표를 보여주고 싶다.
> 그래야 광고주가 자신의 비즈니스와 연결된 플랫폼으로 인식한다.

**수락 기준**:
- 광고주 ID에 따라 전환 이벤트 유형이 다른 더미 데이터 표시
- 차별화상회: sign_up, first_purchase
- 밀리의서재: app_install, subscribe

### US-03: 개발자 — 새 광고주 시연 Config 추가

> 개발자로서, 새 광고주 시연이 필요할 때 Config 파일 하나에 데이터를 정의하면
> 나머지 UI는 자동으로 처리되게 하고 싶다.

**수락 기준**:
- `src/lib/demo/configs/` 아래 파일 하나 추가로 신규 광고주 시연 지원
- 기존 광고주 코드를 수정하지 않아도 됨

---

## 4. DemoConfig 인터페이스 스펙

### 4.1 핵심 인터페이스

```typescript
// src/lib/demo/types.ts

export interface DemoConversionEvent {
  type: string;          // 'app_install' | 'subscribe' | 'sign_up' | ...
  label: string;         // 화면 표시용 한국어 이름 (예: '앱 설치')
  count: number;         // 더미 전환 수
}

export interface DemoPartner {
  id: string;
  name: string;
  referralCode: string;
  status: 'approved' | 'pending';
  joinedAt: string;      // ISO date string
  leads: number;
  conversions: DemoConversionEvent[];
  revenue: number;       // 원 단위
}

export interface DemoSettlement {
  partnerId: string;
  partnerName: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'paid';
  period: string;        // 예: '2026년 3월'
}

export interface DemoEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  participantCount: number;
}

export interface DemoConfig {
  advertiserId: string;        // advertisers.advertiser_id (예: 'chabyulhwa')
  advertiserName: string;      // 표시용 이름
  conversionEventTypes: DemoConversionEvent[];  // 이 광고주의 전환 이벤트 종류
  partners: DemoPartner[];
  settlements: DemoSettlement[];
  events: DemoEvent[];
  programName: string;         // 파트너 프로그램명
  programDescription: string;
}
```

### 4.2 광고주별 Config 파일 예시

```typescript
// src/lib/demo/configs/chabyulhwa.ts
export const chabyulhwaDemo: DemoConfig = {
  advertiserId: 'chabyulhwa',
  advertiserName: '차별화상회',
  conversionEventTypes: [
    { type: 'sign_up', label: '회원가입', count: 0 },
    { type: 'first_purchase', label: '첫구매', count: 0 },
  ],
  partners: [
    {
      id: 'demo-partner-1',
      name: '김인플루언서',
      referralCode: 'CBH_KIM001',
      status: 'approved',
      joinedAt: '2026-02-01',
      leads: 47,
      conversions: [
        { type: 'sign_up', label: '회원가입', count: 23 },
        { type: 'first_purchase', label: '첫구매', count: 11 },
      ],
      revenue: 330000,
    },
    // ... 더미 파트너 추가
  ],
  settlements: [ /* ... */ ],
  events: [ /* ... */ ],
  programName: '차별화상회 파트너 프로그램',
  programDescription: '...',
};

// src/lib/demo/configs/millie.ts
export const millieDemo: DemoConfig = {
  advertiserId: 'millie',
  advertiserName: '밀리의서재',
  conversionEventTypes: [
    { type: 'app_install', label: '앱 설치', count: 0 },
    { type: 'subscribe', label: '구독 시작', count: 0 },
  ],
  partners: [ /* ... */ ],
  settlements: [ /* ... */ ],
  events: [ /* ... */ ],
  programName: '밀리의서재 파트너 프로그램',
  programDescription: '...',
};
```

### 4.3 레지스트리

```typescript
// src/lib/demo/registry.ts
import { chabyulhwaDemo } from './configs/chabyulhwa';
import { millieDemo } from './configs/millie';

const DEMO_REGISTRY: Record<string, DemoConfig> = {
  chabyulhwa: chabyulhwaDemo,
  millie: millieDemo,
};

export function getDemoConfig(advertiserId: string): DemoConfig | null {
  return DEMO_REGISTRY[advertiserId] ?? null;
}
```

---

## 5. 페이지별 시연 적용 범위

### 5.1 적용 대상 페이지 및 동작

| 페이지 | 경로 | 시연 시 표시 내용 | 실제 API 호출 |
|--------|------|-----------------|--------------|
| 광고주 대시보드 홈 | `/advertiser` | 더미 파트너 수, 총 전환, 총 수익 집계 | 차단 |
| 파트너 목록 | `/advertiser/partners` | 더미 파트너 카드 목록 | 차단 |
| 정산 | `/advertiser/settlements` | 더미 정산 카드 목록 | 차단 |
| 이벤트 관리 | `/advertiser/promotions` | 더미 이벤트 카드 목록 | 차단 |

### 5.2 시연 모드 데이터 주입 방식

- 각 페이지의 데이터 fetch hook에서 `isDemoMode()` 체크
- `true`이면 실제 API 대신 `getDemoConfig(advertiserId)`의 더미 데이터 반환
- 실제 API 호출 없음 → 빈 DB여도 풍성한 시연 가능

### 5.3 시연 모드 표시 (UX)

- 헤더 우측에 "시연 모드" 배지 + 토글 스위치
- 시연 모드 활성 시 페이지 상단에 황색 배너: "현재 시연 데이터를 표시 중입니다"
- 광고주 대시보드(advertiser 계정)에서만 표시 (파트너/어드민 계정에서는 노출 안 함)

---

## 6. 구현 파일 구조

```
src/lib/demo/
├── types.ts              # DemoConfig 인터페이스 정의
├── registry.ts           # 광고주별 Config 레지스트리
├── hooks.ts              # useDemoMode() hook (localStorage 상태)
└── configs/
    ├── chabyulhwa.ts     # 차별화상회 더미 데이터
    └── millie.ts         # 밀리의서재 더미 데이터
```

---

## 7. DEMO 태그 기반 코드 추적 및 제거 가이드

### 7.1 태그 규칙

데모 모드 관련 코드에는 반드시 `// [DEMO]` 주석 태그를 붙인다.

```typescript
// [DEMO] 시연 모드 분기 — 실제 서비스 전 제거 또는 비활성화 필요
if (isDemoMode()) {
  return getDemoConfig(advertiserId)?.partners ?? [];
}
```

### 7.2 추적 방법

```bash
# 전체 DEMO 태그 위치 확인
grep -rn '\[DEMO\]' src/
```

### 7.3 제거 시나리오

- 특정 광고주가 실제 데이터를 충분히 쌓으면 해당 Config 파일만 제거
- 플랫폼 전체에서 데모 모드 제거 시 `[DEMO]` grep 후 분기 코드 일괄 제거
- `registry.ts`에서 해당 광고주 엔트리만 삭제해도 시연 모드 비활성화됨

---

## 8. 기능 요구사항 (MoSCoW)

| ID | 요구사항 | 우선순위 | 비고 |
|----|---------|---------|------|
| FR-01 | DemoConfig 인터페이스 및 레지스트리 구현 | Must | 범용 모듈의 핵심 |
| FR-02 | 차별화상회 기존 하드코딩 → Config 마이그레이션 | Must | 기술 부채 해소 |
| FR-03 | 밀리의서재 시연 Config 추가 | Must | 즉시 필요 |
| FR-04 | 헤더 토글 + localStorage 상태 유지 | Must | 이미 유사 구현 존재, 통합 필요 |
| FR-05 | 시연 모드 황색 배너 표시 | Should | 실수로 시연 데이터 혼동 방지 |
| FR-06 | 광고주 대시보드 4개 페이지 적용 | Must | |
| FR-07 | DEMO 태그 가이드 및 grep 스크립트 | Should | |
| FR-08 | 어드민 GUI에서 시연 Config 관리 | Won't | 향후 Phase 2 |

---

## 9. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| DB 변경 없음 | migration 없음, 기존 스키마 그대로 |
| 타 광고주 격리 | 시연 모드는 해당 광고주 세션에만 영향, 다른 광고주 계정에 영향 없음 |
| 실제 데이터 오염 없음 | 더미 데이터는 코드 레벨에만 존재, DB write 없음 |
| 빌드 영향 없음 | 시연 모드 코드가 production 빌드에 포함되어도 기능 자체는 정상 작동 |
| 코드 크기 | Config 파일 1개당 100~200줄 수준 유지 |

---

## 10. 성공 지표

- [ ] 밀리의서재 시연 미팅에서 빈 화면 없이 전체 플랫폼 시연 가능
- [ ] 새 광고주 시연 Config 추가 소요 시간 30분 이내
- [ ] `[DEMO]` 태그로 데모 관련 코드 100% 추적 가능
- [ ] 차별화상회 기존 하드코딩 코드 완전 제거

---

## 11. 향후 확장 방향 (Phase 2)

- **어드민 GUI 관리**: Admin 페이지에서 광고주별 시연 데이터를 UI로 편집 가능
- **시연 세션 링크**: 특정 URL 파라미터(`?demo=1`)로 토글 없이 시연 모드 진입
- **시연 분석**: 세일즈 시연 횟수, 어떤 광고주 대상으로 시연했는지 트래킹
- **화이트라벨 시연**: 광고주 브랜드 로고/색상도 더미 데이터에 포함

---

## 12. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|---------|
| 시연 데이터가 실제 데이터로 오해될 수 있음 | 높음 | 황색 배너 + 토글 버튼 명확한 라벨링 |
| 광고주가 직접 토글을 건드려 실데이터와 혼용 | 중간 | 배너 + 설명 툴팁 추가 |
| 기존 chabyulhwa 하드코딩 제거 시 누락 발생 | 중간 | [DEMO] 태그 기반 grep으로 전수 확인 후 제거 |
| 새 Config 추가 시 더미 데이터 품질 저하 | 낮음 | Config 작성 체크리스트 제공 |

---

## 13. 구현 순서 (권장)

1. `src/lib/demo/types.ts` — 인터페이스 정의
2. `src/lib/demo/configs/chabyulhwa.ts` — 기존 하드코딩 데이터 이전
3. `src/lib/demo/configs/millie.ts` — 밀리의서재 더미 데이터 작성
4. `src/lib/demo/registry.ts` + `hooks.ts` — 레지스트리 및 hook
5. 기존 하드코딩 코드 제거 → registry 기반으로 교체
6. 헤더 토글 버튼 통합
7. 광고주 4개 페이지 데이터 주입 적용

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-08 | Initial draft | cse7600 |
