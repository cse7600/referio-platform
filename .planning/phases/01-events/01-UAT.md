---
status: testing
phase: 01-events
source: [이벤트 기능 구현 - 광고주 수정/파트너 이벤트 페이지/참여 기능]
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Test

number: 1
name: 광고주 이벤트 목록 확인
expected: |
  /advertiser/promotions 페이지에 접속하면 기존 이벤트가 카드 형태로 표시되고,
  각 카드에 "수정", "공개/비공개", "종료" 버튼이 보여야 합니다.
awaiting: user response

## Tests

### 1. 광고주 이벤트 목록 확인
expected: /advertiser/promotions 접속 시 기존 이벤트 카드 + 수정/공개/종료 버튼 표시
result: [pending]

### 2. 광고주 이벤트 수정
expected: "수정" 버튼 클릭 시 카드가 편집 폼으로 전환되고 제목·내용·날짜·리워드 수정 후 저장 가능
result: [pending]

### 3. 광고주 이벤트 공개/비공개 토글
expected: "공개/비공개" 버튼 클릭 시 즉시 상태 전환, "공개로 변경" 토스트 메시지 표시
result: [pending]

### 4. 이벤트 생성 폼
expected: "이벤트 생성" 버튼 클릭 시 폼 표시, 작성 후 저장하면 목록에 추가됨
result: [pending]

### 5. 파트너 이벤트 페이지 진입
expected: /dashboard/events 접속 시 (또는 사이드바 "이벤트" 클릭) 공개된 이벤트 카드 목록 표시
result: [pending]

### 6. 파트너 이벤트 내용 보기
expected: 이벤트 카드에서 "내용 보기" 클릭 시 상세 설명이 펼쳐지고 "내용 접기"로 변경
result: [pending]

### 7. 파트너 이벤트 신청하기
expected: "신청하기" 버튼 클릭 시 "이벤트 참여가 완료되었습니다!" 토스트, 버튼이 "참여 완료" 배지로 변경
result: [pending]

### 8. 중복 참여 방지
expected: 이미 참여한 이벤트에는 "참여 완료" 상태로 표시되고 신청 버튼 없음
result: [pending]

### 9. 광고주 참여자 수 확인
expected: 파트너 참여 후 광고주 이벤트 카드에 "참여 N명" 표시
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps

[none yet]
