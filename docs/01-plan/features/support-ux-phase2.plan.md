# support-ux-phase2 Planning Document

> **Summary**: 피드백/문의 시스템 UX Phase 2 — 어드민 답변 이메일 알림, 해결됨 UX 통일, 어드민 자동 갱신
>
> **Project**: referio-platform
> **Version**: Next.js 15 App Router + Supabase
> **Author**: CTO Lead
> **Date**: 2026-03-30
> **Status**: 진행 중

---

## 1. Overview

### 1.1 Purpose

Phase 1에서 즉시 수정 항목을 완료한 후, 실제 운영 시 사용성에 직접 영향을 주는 개선 항목을 처리한다.
가장 중요한 문제는 **어드민이 답변해도 고객이 모른다**는 점이다.

### 1.2 Background

- 어드민 reply API(`/api/admin/support/[id]/reply/route.ts`)에서 고객 이메일 발송 로직이 없음
  → 고객은 위젯을 직접 열어봐야만 답변 여부 확인 가능
- 해결됨 상태에서 위젯은 입력 불가, 대시보드는 입력 가능 → 불일치
- 어드민 페이지 자동 갱신 없음 → 새 문의 도착해도 수동 새로고침 필요

### 1.3 Related Files

- `src/app/api/admin/support/[id]/reply/route.ts` — 어드민 답변 API
- `src/components/ui/feedback-widget.tsx` — 해결됨 상태 처리
- `src/app/dashboard/support/page.tsx` — 해결됨 상태 처리
- `src/app/admin/support/page.tsx` — 어드민 문의 관리 페이지

---

## 2. Scope

### 2.1 In Scope

- FR-01: 어드민 답변 시 고객 이메일 알림 발송
- FR-02: 해결됨 상태 UX 통일 (위젯 + 대시보드)
- FR-03: 어드민 문의 목록 자동 갱신 (30초 폴링)

### 2.2 Out of Scope

- 어드민 이미지 첨부 (Phase 3)
- 필터/검색 기능 (Phase 3)
- WebSocket 전환 (Phase 3)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | 어드민이 답변 저장 후 → 고객 이메일 발송 (Resend API) | Critical |
| FR-01-a | 이메일 제목: `[Referio 답변] {문의 제목}` | Critical |
| FR-01-b | 이메일 본문: 어드민 답변 내용 + "대시보드에서 확인하세요" 안내 | High |
| FR-01-c | 이메일 발송 실패는 조용히 처리 (응답 지연 방지) | High |
| FR-02 | 해결됨 상태 UX 통일: 위젯과 대시보드 모두 동일한 정책 적용 | High |
| FR-02-a | 정책: 해결됨이어도 추가 문의 가능 → 전송 시 자동 `open` 재오픈 | High |
| FR-02-b | 위젯: 해결됨 배너 유지하되 입력창도 표시 (재오픈 안내 문구 추가) | High |
| FR-02-c | 대시보드: 현재와 동일 (입력 가능) — 변경 없음 | Low |
| FR-03 | 어드민 문의 목록 30초마다 자동 갱신 | Medium |
| FR-03-a | 페이지 마운트 시 폴링 시작, 언마운트 시 정리 | Medium |
| FR-03-b | 갱신 중 현재 선택된 티켓 유지 | Medium |
| FR-03-c | 어드민 전송 실패 시 화면에 에러 알림 표시 | Medium |

### 3.2 이메일 발송 기준 (FR-01 상세)

현재 `/api/admin/support/[id]/reply/route.ts`에 이미 Resend 발송 코드가 있음 → 확인 필요
(이전 세션에서 "어드민 답변 이메일 발송 로직 없다"고 판단했으나, 실제 코드를 다시 읽어 확인)

---

## 4. Success Criteria

- [ ] 어드민이 답변 후 고객 이메일 수신 확인
- [ ] 위젯 해결됨 상태에서 추가 입력 가능 + 자동 재오픈
- [ ] 어드민 페이지 새로고침 없이 새 문의 자동 표시

---

## 5. Architecture Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 해결됨 재오픈 정책 | 추가 문의 시 자동 재오픈 | 고객 친화적. "아직 해결 안 됐어요" 입력이 자연스럽게 재오픈으로 연결 |
| 어드민 갱신 방식 | 30초 setInterval 폴링 | WebSocket 불필요, 어드민 단독 사용 환경에서 충분 |
| 이메일 발송 시점 | reply 저장 직후 (기존 resolved 이메일과 동일 패턴) | 답변과 알림이 동기화됨 |

---

## 6. Next Steps

1. [x] FR-01 구현 (이미 완료 확인)
2. [x] FR-02 구현 (위젯 해결됨 UX 통일)
3. [x] FR-03 구현 (어드민 자동 갱신 + 에러 표시)
4. [ ] Gap 분석

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|---------------|------|
| 2026-03-30 | production | FR-01~03 전체 구현: 위젯 해결됨 입력 활성화, 어드민 30초 폴링, 전송 에러 표시 | 성공 |
