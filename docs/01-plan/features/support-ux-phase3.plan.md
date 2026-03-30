# support-ux-phase3 Planning Document

> **Summary**: 피드백/문의 시스템 UX Phase 3 — 어드민 이미지 첨부, 에러 재시도, 어드민 상태별 필터
>
> **Project**: referio-platform
> **Version**: Next.js 15 App Router + Supabase Storage
> **Author**: CTO Lead
> **Date**: 2026-03-30
> **Status**: 진행 중

---

## 1. Overview

### 1.1 Purpose

Phase 1/2 완료 후, 실무 운영 효율을 높이는 기능을 추가한다.
어드민이 답변 시 이미지를 첨부할 수 있게 하고, 문의가 많아질 때 필터로 관리 효율을 높인다.

### 1.2 Background

- 어드민은 현재 텍스트 답변만 가능 — 스크린샷/가이드 이미지 전송 불가
- 고객 위젯에서 이미지 업로드는 `/api/feedback/upload`로 이미 구현됨 → 어드민도 동일 endpoint 재사용 가능
- 어드민 문의 목록에 필터 없음 — 문의 증가 시 상태별 구분 어려움

### 1.3 Related Files

- `src/app/admin/support/page.tsx` — 어드민 문의 관리 (이미지 첨부 + 필터 추가)
- `src/app/api/admin/support/[id]/reply/route.ts` — 어드민 답변 API (image_url 파라미터 추가)
- `src/app/api/feedback/upload/route.ts` — 기존 이미지 업로드 API (어드민도 재사용)
- `src/components/ui/feedback-widget.tsx` — 에러 재시도 버튼 추가

---

## 2. Scope

### 2.1 In Scope

- FR-01: 어드민 답변 이미지 첨부 (파일 선택 + 클립보드 붙여넣기)
- FR-02: 위젯 에러 상황 "다시 시도" 버튼
- FR-03: 어드민 목록 상태별 탭 필터 (전체 / 대기 / 진행중 / 해결됨)

### 2.2 Out of Scope

- 이미지 복수 첨부 (UX 복잡도 증가 대비 효용 낮음, 제외)
- WebSocket 전환 (별도 인프라 필요)
- 어드민 검색 기능 (Phase 3 이후)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | 어드민 답변 입력 영역에 이미지 첨부 버튼 추가 | High |
| FR-01-a | 파일 선택(input[type=file]) + 클립보드 붙여넣기(Ctrl+V) 지원 | High |
| FR-01-b | 5MB 이하, 이미지 파일만 허용 | High |
| FR-01-c | 미리보기 + 삭제(X) 버튼 | High |
| FR-01-d | 전송 시 이미지를 먼저 `/api/feedback/upload`로 업로드 후 URL을 답변 API에 포함 | High |
| FR-01-e | 어드민 reply API(`/api/admin/support/[id]/reply/route.ts`)에 `image_url` 파라미터 수신 및 저장 추가 | High |
| FR-02 | 위젯에서 전송 실패 시 "다시 시도" 버튼 표시 | Medium |
| FR-02-a | 기존 에러 텍스트("전송 실패") 옆에 "다시 시도" 버튼 추가 | Medium |
| FR-02-b | 버튼 클릭 시 마지막 전송 액션 재실행 | Medium |
| FR-02-c | 폴링 에러 3회 연속 시 "연결 상태 불안정" 안내 표시 | Low |
| FR-03 | 어드민 문의 목록 상단에 상태별 탭 필터 추가 | High |
| FR-03-a | 탭: 전체 / 대기(open) / 진행중(in_progress) / 해결됨(resolved) | High |
| FR-03-b | 각 탭에 해당 건수 배지 표시 | Medium |
| FR-03-c | "대기" 탭에 미읽음 건수 빨간 배지 추가 표시 | Medium |
| FR-03-d | 탭 선택 시 목록 필터링 (클라이언트 사이드, API 재호출 없음) | High |
| FR-03-e | 탭 전환 시 현재 선택된 티켓 선택 해제 | Low |

---

## 4. Architecture Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 이미지 업로드 endpoint | 기존 `/api/feedback/upload` 재사용 | 어드민도 Supabase Auth 로그인 상태이므로 인증 통과. 별도 API 불필요 |
| 필터 방식 | 클라이언트 사이드 필터링 | 30초 폴링으로 전체 목록을 이미 가져옴. 탭별 API 재호출 불필요 |
| 에러 재시도 | 마지막 메시지/이미지 state 유지 후 재전송 | 실패 후 입력이 사라지지 않으므로 자연스럽게 재시도 가능 |

---

## 5. Success Criteria

- [ ] 어드민이 답변에 이미지 첨부 후 전송 → 고객 위젯에서 이미지 확인
- [ ] 위젯 전송 실패 시 "다시 시도" 버튼 표시
- [ ] 어드민 목록에서 상태별 탭 필터 동작
- [ ] `npm run build` 성공

---

## 6. Next Steps

1. [x] FR-01/02/03 구현 완료
2. [x] Gap 분석 완료 (Match Rate 100%)
3. [ ] 배포 후 실제 테스트

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|----------|---------------|------|
| 2026-03-30 | production | FR-01 어드민 이미지 첨부, FR-02 위젯 에러 재시도, FR-03 상태별 탭 필터 구현 | 성공 |
