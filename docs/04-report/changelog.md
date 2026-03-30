# Changelog

---

## [2026-03-30] — 파트너 모집 캠페인 클릭/전환 추적 버그 수정

### Fixed
- 클릭 추적 API (`/api/r/[code]`): 존재하지 않는 `metadata` 컬럼 제거, `ip_address` / `user_agent` / `referrer` 개별 컬럼으로 수정
- 전환 기록 API (`/api/affiliate/convert`): 존재하지 않는 `campaign_id`, `metadata` 제거, `referio_campaigns` 조인으로 보상금 자동 조회, 실제 DB 컬럼(`converted_entity_id`, `reward_amount`, `reward_status`) 사용
- 가입 페이지 (`/signup`): 가입 완료 후 `partner_id`를 조회해 전환 기록에 실제 연결

### Notes
- PDCA Gap Analysis 2차 통과 (100% Match Rate)
- 커밋: `d5798b7`, `653e2ce` → Vercel 자동 배포 완료

---

## [2026-03-26] — 비밀번호 재설정 플로우 개선

### Fixed
- 비밀번호 최소 길이 정책 불일치 수정 (6자 → 8자 통일)
- Supabase PKCE flow 완전 지원
- 파트너/광고주 별 재설정 경로 분리

### Notes
- PDCA Gap Analysis 통과 (100% Match Rate)
- 추가 이슈 없음 확인

---

## [2026-03-09] — MVP 완성

### Added
- 문의 폼 브랜딩 (로고, 색상, 프로그램명)
- 온보딩 가이드
- CSV 내보내기
- 캠페인, 리드 수동 등록, 초대 링크

### Fixed
- 테스트 계정 제거 (보안)
- inquiry_form_enabled null 체크 수정
