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
