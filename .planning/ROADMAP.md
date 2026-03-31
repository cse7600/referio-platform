# Roadmap: Referio Platform v1.1

**Milestone:** v1.1 — 이벤트 탭 배포 + 채널 UI + 키퍼메이트
**Phases:** 11–14
**Requirements:** 12 total

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 11 | DB Migration + 이벤트 탭 배포 | DB 스키마 적용 및 이벤트 탭 검증 | DB-01, DB-02, EVT-01~05 | Pending |
| 12 | 채널 링크 UI | 파트너 채널별 링크 표시 완성 | CH-01, CH-02 | Pending |
| 13 | 키퍼메이트 이메일 발송 | 96명 비밀번호 설정 이메일 일괄 발송 | KM-01, KM-02 | Pending |
| 14 | 배포 | 전체 변경사항 배포 | DEP-01 | Pending |

## Phase 11: DB Migration + 이벤트 탭 배포

**Goal:** DB migration 2건 적용, 이벤트 탭 개편 코드 완성 확인

**Requirements:** DB-01, DB-02, EVT-01, EVT-02, EVT-03, EVT-04, EVT-05

**Success Criteria:**
1. referrals.channel 컬럼이 DB에 존재
2. partner_promotions.banner_image_url, banner_bg_color 컬럼 존재
3. post_verification 타입이 DB constraint에 허용
4. 파트너 이벤트 탭에서 배너 카드 레이아웃 표시
5. 신청 클릭 즉시 "참여 완료" 표시 (낙관적 UI)

## Phase 12: 채널 링크 UI

**Goal:** 채널별 링크 UI 완성 및 tracking_link_url 우선 표시

**Requirements:** CH-01, CH-02

**Success Criteria:**
1. 파트너 프로그램 상세 페이지에서 채널별 링크가 표시됨
2. tracking_link_url 있는 파트너는 해당 URL이 추천 URL로 표시됨
3. tracking_link_url 없는 파트너는 기존 추천 URL 정상 표시

## Phase 13: 키퍼메이트 이메일 발송

**Goal:** keepermate 파트너 중 비밀번호 미설정 대상 이메일 발송

**Requirements:** KM-01, KM-02

**Success Criteria:**
1. 비밀번호 미설정 파트너 수 확인
2. 발송 스크립트 실행 성공
3. 발송 결과 리포트 출력

## Phase 14: 배포

**Goal:** 전체 변경사항 git push → Vercel 자동 배포

**Requirements:** DEP-01

**Success Criteria:**
1. git push 완료
2. Vercel 빌드 성공

### Phase 15: CRM 이메일 구조 완성 — 파트너 거절 이메일 추가, 전체 수신거부 링크 삽입, 1일 발송 쿨다운 규칙 설계

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 14
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 15 to break down)

---
*Created: 2026-03-31*
