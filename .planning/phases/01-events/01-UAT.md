---
status: passed
phase: 01-events
source: [이벤트 기능 구현 - 광고주 수정/파트너 이벤트 페이지/참여 기능]
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T07:50:00Z
---

## Tests

### 1. 광고주 이벤트 목록 확인
expected: /advertiser/promotions 접속 시 기존 이벤트 카드 + 수정/공개/종료 버튼 표시
result: PASS — "이벤트 관리" 헤딩, 이벤트 카드, 수정/토글/종료 버튼, 유형 배지, 리워드, 날짜 표시 확인

### 2. 광고주 이벤트 수정
expected: "수정" 버튼 클릭 시 카드가 편집 폼으로 전환되고 제목·내용·날짜·리워드 수정 후 저장 가능
result: PASS — 제목 수정 후 "이벤트가 수정되었습니다" 토스트, 목록에 변경 반영 확인

### 3. 광고주 이벤트 공개/비공개 토글
expected: "공개/비공개" 버튼 클릭 시 즉시 상태 전환, 토스트 메시지 표시
result: PASS — 버튼 "공개"→"비공개" 전환, 카드에 "비공개" 배지, "비공개로 변경되었습니다" 토스트 확인

### 4. 이벤트 생성 폼
expected: "이벤트 생성" 버튼 클릭 시 폼 표시, 작성 후 저장하면 목록에 추가됨
result: PASS — "UAT 테스트 이벤트" 생성, "이벤트가 생성되었습니다" 토스트, 목록 추가 확인

### 5. 파트너 이벤트 페이지 진입
expected: /dashboard/events 접속 시 공개된 이벤트 카드 목록 표시
result: PASS — 3개 이벤트 카드 표시, 좌텍스트+우이미지 배너 레이아웃, 유형 배지, 리워드, D-day 카운트다운 확인

### 6. 파트너 이벤트 내용 보기
expected: 이벤트 카드에서 "내용 보기" 클릭 시 상세 설명이 펼쳐지고 "내용 접기"로 변경
result: PASS — 내용 펼침, "내용 접기" 버튼 전환 확인

### 7. 파트너 이벤트 신청하기
expected: "신청하기" 버튼 클릭 시 토스트, 버튼이 "참여 완료" 배지로 변경
result: PASS — 즉시 "참여 완료" 배지 표시 (낙관적 UI), 카드 헤더 배지 및 하단 체크 아이콘 모두 표시

### 8. 중복 참여 방지
expected: 이미 참여한 이벤트에는 "참여 완료" 상태로 표시되고 신청 버튼 없음
result: PASS — "참여 완료" 상태 유지, "신청하기" 버튼 없음 확인

### 9. 광고주 참여자 수 확인
expected: 파트너 참여 후 광고주 이벤트 카드에 "참여 N명" 표시
result: PASS — "참여 1명 보기" 링크 표시 확인

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Bugs Found & Fixed

### Bug 1: Participations API 데이터 형태 불일치 (수정 완료)
- 파일: `/api/advertiser/promotions/[id]/participations/route.ts`
- 문제: Supabase 조인 결과 중첩 반환 (`partners: { name, email }`)
- 프론트엔드 기대: `partner_name`, `partner_email` (flat), `submission_url`, `note`
- 수정: `data.map()`으로 데이터 형태 변환

### Bug 2: Partner events API 컬럼명 오류 — 치명적 (수정 완료)
- 파일: `/api/partner/events/route.ts`, `/api/partner/events/participate/route.ts`
- 문제: `.eq('user_id', user.id)` — partners 테이블에 `user_id` 컬럼 없음
- 올바른 컬럼: `auth_user_id`
- 영향: 모든 파트너에게 이벤트가 표시되지 않음 (silently fails)
- 수정: `.eq('auth_user_id', user.id)` 로 변경

## Non-Critical Observations
1. 파트너 프로그램 선택기가 기본값으로 첫 번째 프로그램을 선택함 — 의도된 동작
2. Next.js 16 Turbopack 캐시 이슈 (앱과 무관)
3. 토스트 메시지 지속 시간이 짧을 수 있음 (기능에 영향 없음)
