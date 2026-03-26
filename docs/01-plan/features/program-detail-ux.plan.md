# 프로그램 상세 페이지 UX 재설계

> **Summary**: 파트너 프로그램 상세 페이지(`/dashboard/programs/[id]`)를 탭 구조로 재설계하고, 광고주 활동 지원 콘텐츠(공지/게시판)를 통합한 풀 피처 페이지로 완성
>
> **Project**: referio-platform
> **Version**: Next.js 15 App Router
> **Date**: 2026-03-26
> **Status**: 완료

---

## 1. 개요

### 1.1 목적

파트너가 프로그램에 참가한 뒤 필요한 모든 정보(개요, 활동 가이드, 금지활동, 유의사항, 미디어, 게시판)를 하나의 페이지에서 확인할 수 있도록 UX를 재설계한다.

### 1.2 주요 변경사항

- 단일 스크롤 → 탭 구조로 전환
- MarkdownRenderer 컴포넌트 도입 (Tiptap JSON + 마크다운 문자열 모두 지원)
- 공지사항 + 게시판 통합 패널 추가
- 금지활동 / 유의사항을 별도 탭으로 분리
- 문의하기 버튼 제거 (UX 단순화)

---

## 2. 탭 구조

| 탭 ID | 이름 | 조건 | 설명 |
|-------|------|------|------|
| `overview` | 개요 | 항상 표시 | 프로그램 기본 정보, 단가, 추천 URL |
| `guide` | 활동 가이드 | 항상 표시 | `activity_guide` 필드. MarkdownRenderer 렌더링 |
| `rules` | 금지활동 | `prohibited_activities` 있을 때만 | MarkdownRenderer 렌더링 |
| `caution` | 유의사항 | `precautions` 있을 때만 | MarkdownRenderer 렌더링 |
| `media` | 미디어 | 항상 표시 | 이미지/동영상/유튜브 첨부 파일 |
| `board` | 게시판 | 항상 표시 | 공지사항 + 게시물 통합. 미읽음 배지 표시 |

---

## 3. 핵심 컴포넌트

### MarkdownRenderer (`src/components/editor/MarkdownRenderer.tsx`)
- Tiptap JSON(`{}` 시작) 또는 마크다운 문자열 자동 감지 후 렌더링
- SSR 비활성화 (`dynamic import, ssr: false`)

### ProgramDetailPage (`src/app/dashboard/programs/[id]/page.tsx`)
- `useProgram()` Context로 파트너/선택 프로그램 공유
- 탭 전환 시 URL 쿼리 변경 없이 클라이언트 state로 관리
- 공지사항 읽음 처리: 탭 클릭 시 `PATCH /api/partner/activity/[id]/read`

---

## 4. 데이터 흐름

```
GET /api/partner/programs/[id]
  → advertisers (프로그램 기본정보)
  → partner_programs (내 등록 정보, referral_code, commission)
  → program_media (이미지/영상)
  → activity_posts (공지사항 + 게시물, is_read 포함)
```

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|---------------|------|
| 2026-03-26 | dev | 탭 구조 재설계, MarkdownRenderer 도입, 공지·게시판 패널 통합 | 성공 |
