# Requirements: Referio Platform v1.1

**Defined:** 2026-03-31
**Core Value:** 파트너가 추천 링크 하나로 성과를 실시간 추적하고 정산까지 받을 수 있어야 한다

## v1.1 Requirements

### DB Migration

- [ ] **DB-01**: 021_channel_tracking.sql 적용 — referrals.channel 컬럼 추가
- [ ] **DB-02**: 023_event_enhancements.sql 적용 — 이벤트 배너/게시물인증 스키마

### 이벤트 탭

- [ ] **EVT-01**: 이벤트 탭 배너 UI (좌텍스트+우이미지) 파트너에게 표시
- [ ] **EVT-02**: 이벤트 신청 클릭 시 즉시 "참여 완료" 상태 전환
- [ ] **EVT-03**: 게시물 인증 이벤트 — 파트너가 URL 제출하여 참여
- [ ] **EVT-04**: 광고주가 배너 이미지/배경색 설정하여 이벤트 생성
- [ ] **EVT-05**: 광고주가 게시물 인증 타입 이벤트 생성 가능

### 채널 링크 UI

- [ ] **CH-01**: 파트너 프로그램 상세 페이지에서 채널별 링크 표시 (현재 숨김 해제)
- [ ] **CH-02**: 파트너 대시보드에서 tracking_link_url 있으면 추천 URL 대신 표시

### 키퍼메이트 이메일

- [ ] **KM-01**: 비밀번호 미설정 파트너 목록 조회
- [ ] **KM-02**: 96명 비밀번호 설정 이메일 일괄 발송

### 배포

- [ ] **DEP-01**: 전체 변경사항 git commit & push → Vercel 자동 배포

## Out of Scope

| Feature | Reason |
|---------|--------|
| 에어브릿지 실환경 포스트백 테스트 | 밀리 담당자 액션 필요 |
| 이벤트 삭제 기능 | 다음 마일스톤 |
| 채널별 성과 통계 집계 | 데이터 충분 후 구현 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 11 | Pending |
| DB-02 | Phase 11 | Pending |
| EVT-01 | Phase 11 | Pending |
| EVT-02 | Phase 11 | Pending |
| EVT-03 | Phase 11 | Pending |
| EVT-04 | Phase 11 | Pending |
| EVT-05 | Phase 11 | Pending |
| CH-01 | Phase 12 | Pending |
| CH-02 | Phase 12 | Pending |
| KM-01 | Phase 13 | Pending |
| KM-02 | Phase 13 | Pending |
| DEP-01 | Phase 14 | Pending |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
