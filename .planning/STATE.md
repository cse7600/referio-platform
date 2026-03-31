# State: Referio Platform

## Current Position

Phase: 16 (CRM Phase 3 완료)
Plan: Ready to plan
Status: CRM Phase 3 완료 (Email 5/13/14 구현)
Last activity: 2026-03-31 — CRM Phase 3 완료. Email 5(신규프로그램), 13(위반경고+Admin UI), 14(탈퇴처리) 구현. 빌드 성공.

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** 파트너가 추천 링크 하나로 성과를 실시간 추적하고 정산까지 받을 수 있어야 한다
**Current focus:** Phase 12 — 채널 링크 UI

## Phase 11 완료 이력 (2026-03-31)

- DB migration 021 (referrals.channel): 이미 적용됨 ✓
- DB migration 023 (이벤트 강화): 이미 적용됨 ✓
- partner_promotion_participations 테이블: 존재 확인 ✓
- Bug 수정 1: participations API 데이터 형태 불일치 (partner_name/email flat 변환)
- Bug 수정 2 (치명적): partner events API `user_id` → `auth_user_id` 수정
- 빌드 성공: 126페이지 TypeScript 에러 없음
- UAT: 9/9 PASS (광고주 이벤트 생성/수정/공개, 파트너 이벤트 조회/참여/중복방지, 참여자 수 표시)

## Accumulated Context

### Roadmap Evolution
- Phase 15 added: CRM 이메일 구조 완성 — 파트너 거절 이메일 추가, 전체 수신거부 링크 삽입, 1일 발송 쿨다운 규칙 설계

- Phase 12: 채널별 링크 UI — 파트너 프로그램 상세 페이지에서 채널별 링크 표시
- Phase 12: tracking_link_url 있는 파트너는 해당 URL이 추천 URL로 우선 표시
- Phase 13: 키퍼메이트 96명 비밀번호 설정 이메일 발송 (scripts/migrate-keepermate-auth.js 존재)
- Phase 14: git push → Vercel 자동 배포
- referrals.channel 컬럼: DB 적용 완료, utm_source → channel 저장 코드 완료
- 채널별 링크 UI: 파트너 대시보드에 코드는 있으나 숨김 처리 상태
