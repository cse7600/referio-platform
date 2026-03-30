# support-ux-fix Planning Document

> **Summary**: 피드백/문의 시스템 UX Phase 1 개선 — 위젯 한국어화, 버튼 충돌 해결, 대시보드 새 문의 버튼 추가
>
> **Project**: referio-platform
> **Version**: Next.js 15 App Router + Supabase
> **Author**: CTO Lead
> **Date**: 2026-03-30
> **Status**: 진행 중

---

## 1. Overview

### 1.1 Purpose

Opus UX 점검에서 식별된 즉시 수정 필요(🔴) 항목 3가지를 해결한다.
사용성 최우선 원칙으로, 고객이 실제 서비스를 사용할 때 느끼는 불편함을 제거한다.

### 1.2 Background

- 피드백 위젯(`feedback-widget.tsx`)의 모든 UI 텍스트가 영어 — 한국어 서비스와 불일치
- 프로그램 상세 페이지(`/dashboard/programs/[id]`)의 하단 고정 바(z-50)와 피드백 위젯 버튼(bottom-6 right-6 z-9998)이 시각적으로 겹침
- 파트너 대시보드 문의 페이지(`/dashboard/support`)에서 새 문의 작성 경로 없음 — 플로팅 위젯에만 의존

### 1.3 Related Files

- `src/components/ui/feedback-widget.tsx` — 피드백 위젯 전체
- `src/app/dashboard/programs/[id]/page.tsx` — 하단 바 고정 페이지
- `src/app/dashboard/support/page.tsx` — 파트너 문의 목록 페이지
- `src/app/dashboard/layout.tsx` — 위젯이 렌더링되는 레이아웃

---

## 2. Scope

### 2.1 In Scope

- [x] FR-01: 위젯 전체 한국어화 (UI 텍스트, 에러 메시지, aria-label 포함)
- [x] FR-02: 프로그램 상세 페이지 하단 바와 위젯 버튼 충돌 해결
- [x] FR-03: 대시보드 문의 페이지에 새 문의 작성 기능 추가

### 2.2 Out of Scope

- 웹소켓/실시간 전환 (Phase 3)
- 어드민 이미지 첨부 (Phase 2)
- 필터/검색 기능 (Phase 2)
- 복수 이미지 첨부 (Phase 3)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 위젯 내 모든 영어 텍스트를 한국어로 교체 | Critical | Pending |
| FR-01-a | aria-label `"Contact support"` → `"문의하기"` | Critical | Pending |
| FR-01-b | 헤더 `"Contact Support"` → `"운영팀 문의"` | Critical | Pending |
| FR-01-c | 환영 메시지 `"Welcome!"` → `"안녕하세요 👋"` | High | Pending |
| FR-01-d | 안내 문구 `"Feel free to ask..."` → `"무엇이든 편하게 질문하세요. 보통 몇 시간 안에 답변 드립니다."` | High | Pending |
| FR-01-e | `"Loading..."` → `"로딩 중..."` | High | Pending |
| FR-01-f | `"Please login first."` → `"로그인이 필요합니다."` | High | Pending |
| FR-01-g | `"Resolved"` 배너 → `"해결 완료"` | High | Pending |
| FR-01-h | `"This inquiry has been resolved."` → `"이 문의가 해결 완료되었습니다."` | High | Pending |
| FR-01-i | `"Start new inquiry"` → `"새 문의하기"` | High | Pending |
| FR-01-j | placeholder `"Type a message..."` → `"메시지를 입력하세요... (Enter)"` | High | Pending |
| FR-01-k | placeholder `"Describe your issue..."` → `"문의 내용을 입력하세요..."` | High | Pending |
| FR-01-l | 에러 `"5MB under only"` → `"5MB 이하 이미지만 첨부 가능합니다"` | Medium | Pending |
| FR-01-m | 에러 `"Image files only"` → `"이미지 파일만 첨부할 수 있습니다"` | Medium | Pending |
| FR-01-n | `"Network error"` → `"네트워크 오류가 발생했습니다. 다시 시도해주세요."` | Medium | Pending |
| FR-01-o | `"Failed to load data"` → `"데이터를 불러오지 못했습니다"` | Medium | Pending |
| FR-01-p | `"Failed"` → `"전송 실패"` | Medium | Pending |
| FR-01-q | 최근 문의 목록 제목 `"Recent inquiries"` → `"최근 문의"` | Medium | Pending |
| FR-01-r | 상태 뱃지 `"Open"` → `"접수됨"`, `"Replied"` → `"답변 완료"`, `"Resolved"` → `"해결됨"` | Medium | Pending |
| FR-02 | 하단 고정 바가 있는 페이지에서 위젯 버튼 위치 충돌 해결 | Critical | Pending |
| FR-02-a | 위젯 버튼을 `bottom-6`(24px) → `bottom-20`(80px)으로 올려 하단 바 위에 위치 | Critical | Pending |
| FR-02-b | 위젯 패널 열릴 때도 `bottom-20` 기준으로 위치 조정 | High | Pending |
| FR-03 | `/dashboard/support` 페이지 상단에 "새 문의하기" 버튼 추가 | Critical | Pending |
| FR-03-a | 버튼 클릭 시 새 문의 작성 폼(모달 또는 인라인) 표시 | Critical | Pending |
| FR-03-b | 빈 상태(empty state) 안내 문구 명확화 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| UX | 한국어 서비스와 UI 언어 100% 일치 |
| Layout | 모든 화면 크기에서 버튼 겹침 없음 |
| Accessibility | aria-label 한국어, 색상 대비 유지 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-03 전체 구현
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] 프로그램 상세 페이지에서 위젯 버튼이 하단 바 위에 표시됨 (겹침 없음)
- [ ] 위젯 내 영어 텍스트 0개

### 4.2 Quality Criteria

- [ ] 위젯 버튼 z-index 충돌 없음
- [ ] 모바일 화면에서도 버튼 접근 가능

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| bottom 값 변경 시 다른 페이지에서 어색해 보일 수 있음 | Low | Medium | bottom-20은 표준 FAB 위치, 하단 바 없는 페이지에서도 자연스러움 |
| 새 문의 폼을 위젯과 동일한 API 재사용 | Low | Low | /api/feedback POST 그대로 사용 |

---

## 6. Architecture Considerations

### 6.1 Project Level

Dynamic (Next.js 15 App Router, BaaS)

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 버튼 위치 충돌 해결 방식 | 전역 bottom 값 상향 (bottom-6 → bottom-20) | context 감지보다 단순하고 일관성 있음. bottom-20(80px)은 하단 바(64px) + 여백을 충분히 커버 |
| 새 문의 작성 UI | 인라인 폼 (페이지 상단 접힘/펼침) | 모달보다 맥락 유지가 좋고, 기존 목록과 함께 표시 가능 |
| 위젯 텍스트 관리 | 컴포넌트 내 상수 정의 | i18n 라이브러리 불필요, 한국어 단일 로케일 |

---

## 7. Implementation Order

1. **FR-02** — 버튼 충돌 먼저 해결 (시각적 즉시 효과)
2. **FR-01** — 위젯 한국어화 (텍스트 교체, 영향도 큰 항목 우선)
3. **FR-03** — 대시보드 새 문의 버튼 추가

---

## 8. Next Steps

1. [x] FR-02 구현 완료
2. [x] FR-01 구현 완료
3. [x] FR-03 구현 완료
4. [ ] Gap 분석

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|----------|--------------|------|
| 2026-03-30 | production | FR-01 위젯 한국어화, FR-02 버튼 위치 bottom-20 상향, FR-03 대시보드 새 문의 인라인 폼 추가 | 성공 |
