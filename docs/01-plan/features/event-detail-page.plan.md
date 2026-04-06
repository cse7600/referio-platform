---
feature: event-detail-page
phase: 2 (Phase 1: 이벤트 탭 기본 기능 — 2026-03-31 완료)
status: implemented_pending_deploy
started: 2026-03-31
---

# 이벤트 상세 페이지 & 리치 텍스트 에디터 (Phase 2)

## 목표
키퍼메이트 첫 게시물 인증 이벤트 기획서 내용처럼 풍부한 이벤트 내용을 작성할 수 있도록 한다.

## 요구사항

### 1. 광고주 이벤트 작성 — 리치 텍스트 에디터
- 이벤트 본문(description) 필드를 Tiptap 에디터로 교체
- 지원 기능: 이미지 삽입(드래그앤드롭/파일 업로드), 굵게, 기울임, 제목, 목록
- 기존 이미지 업로드 API `/api/upload/board-image` 재사용
- 저장: JSON.stringify(TiptapJSON) → DB text 컬럼

### 2. 파트너 이벤트 상세 페이지
- URL: `/dashboard/events/[id]`
- 이벤트 카드 클릭 → 상세 페이지 이동
- 배너 (배경색 + 우측 이미지)
- TiptapViewer로 리치 텍스트 렌더링
- 신청하기 버튼 (게시물 인증: 모달, 일반: 즉시)

### 3. API
- `GET /api/partner/events/[id]` — 이벤트 단건 조회 (participated 포함)

## 구현 파일
- `src/app/advertiser/promotions/page.tsx` — Tiptap 에디터 통합
- `src/app/dashboard/events/page.tsx` — 카드 클릭 라우팅 추가
- `src/app/dashboard/events/[id]/page.tsx` — 신규
- `src/app/api/partner/events/[id]/route.ts` — 신규

## 빌드 이력
| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|----------|--------------|------|
| 2026-03-31 | production | Tiptap 에디터 통합, 이벤트 상세 페이지(/dashboard/events/[id]) 신규, 단건 조회 API, 카드 클릭 라우팅 | 성공 |

## 테스트 이력
| 날짜 | 테스트 대상 | 결과 | 에러 수 | 경고 수 | 주요 발견 | 조치 |
|------|-----------|------|--------|--------|---------|------|
| 2026-03-31 | Playwright 브라우저 직접 테스트 (7개 항목) | PASS | 0 | 0 | Tiptap 에디터/상세 페이지/모달/라우팅 모두 정상, Tiptap JSON DB 저장 확인 | 없음 |

## 미완료
- [x] git commit & push → Vercel 배포 (2026-03-31 완료)
- [ ] keepermate 계정으로 실제 이벤트 생성 (키퍼메이트 첫 활동 인증 이벤트 docx 내용)

---

# Phase 3 — 이벤트 UX 개선 (2026-04-01 착수)

## 배경
운영자 피드백 반영: 광고주 이벤트 관리 페이지 카드 모서리 불일치(상단 둥글고 하단 각짐), 파트너 신규 알림 부재, 게시 날짜 미표시

## 요구사항

### 1. 광고주 이벤트 카드 모서리 통일
- 현재: 배너 상단 `rounded-t-xl`, 하단 버튼 영역 각짐 → "밤티" 느낌
- 변경: `Card`에 `overflow-hidden` 추가, 내부 bottom 영역 `rounded-b-xl` — all rounded 통일

### 2. 파트너 네비게이션 이벤트 탭 신규 알림 빨간 점
- 새 이벤트/공지가 추가됐을 때 사이드바 "이벤트" 탭 아이콘 우상단에 빨간 점(•) 표시
- 구현: localStorage `referio_events_last_seen` 타임스탬프 저장
  - 이벤트 탭 방문 시 → `last_seen` 현재 시간으로 갱신
  - events API 응답 중 `created_at > last_seen` 인 항목 있으면 배지 표시
  - 최초 방문(last_seen 없음)은 배지 미표시

### 3. 이벤트 게시 날짜 표시
- 파트너 이벤트 카드: 이벤트 날짜(시작~종료) 옆 또는 하단에 "게시 yyyy.MM.dd" 표시
- 광고주 관리 페이지: 카드 하단 날짜 영역에 "게시 yyyy.MM.dd" 추가

## 구현 파일
- `src/app/advertiser/promotions/page.tsx` — 모서리 통일 + 게시 날짜
- `src/app/dashboard/layout.tsx` — 이벤트 탭 빨간 점 알림
- `src/app/dashboard/events/page.tsx` — 게시 날짜 표시

## 빌드 이력
| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|----------|--------------|------|
| 2026-04-01 | production | 카드 모서리 all-rounded 통일, 이벤트 탭 신규 알림 빨간 점(localStorage 기반), 파트너/광고주 이벤트 게시 날짜 표시 | 성공 |
| 2026-04-06 | production | 버그 수정: 이벤트 탭 데이터 조회를 서버 API → 브라우저 클라이언트 직접 쿼리로 교체 (카카오톡 인앱 브라우저 쿠키 미전달 문제 해결) | 성공 |
