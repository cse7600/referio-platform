# Referio Platform

## What This Is

B2B 파트너 추천 마케팅 플랫폼 (SaaS). 광고주가 파트너(인플루언서/소개자)를 관리하고, 파트너는 추천 링크로 고객을 유치하며 성과 기반 정산을 받는다. 밀리의서재 등 다양한 광고주가 파트너 네트워크를 운영할 수 있도록 지원한다.

## Core Value

파트너가 추천 링크 하나로 성과를 실시간 추적하고 정산까지 받을 수 있어야 한다.

## Requirements

### Validated

- ✓ 파트너 인증 (가입/로그인/비밀번호 재설정) — Phase 1~3
- ✓ 광고주 인증 및 세션 관리 — Phase 1
- ✓ 추천 링크 생성 및 UTM 추적 — Phase 2
- ✓ Airtable 웹훅 연동 (리드 자동 수집) — Phase 3
- ✓ 파트너 대시보드 (홈/프로그램/고객/정산) — Phase 4
- ✓ 광고주 대시보드 (파트너 관리/리드 관리/정산) — Phase 4
- ✓ 이벤트/프로모션 시스템 (생성/관리/참여) — Phase 5
- ✓ 주민번호 보안 수집 및 정산 카드 UI — Phase 6
- ✓ 한화비전 키퍼메이트 파트너 99명 이관 — Phase 7
- ✓ 밀리의서재 에어브릿지 B2C 퍼널 연동 (코어 API) — Phase 8
- ✓ 비밀번호 재설정 플로우 개선 — Phase 9
- ✓ 피드백/문의 UX Phase 1~3 — Phase 10

### Active

- [ ] DB migration 적용 (021 채널 추적 + 023 이벤트 강화)
- [ ] 이벤트 탭 개편 배포 (배너 UI + 게시물 인증 + 낙관적 UX)
- [ ] 채널별 링크 UI 완성 (파트너 프로그램 상세 페이지)
- [ ] 파트너 대시보드 tracking_link_url 우선 표시
- [ ] 키퍼메이트 96명 비밀번호 설정 이메일 일괄 발송

### Out of Scope

- 에어브릿지 포스트백 실환경 테스트 — 밀리 담당자 액션 필요
- 소셜 로그인 (Google/Kakao) — 현재 불필요
- 모바일 앱 — 웹 퍼스트 전략

## Context

- Next.js 15 App Router + Supabase PostgreSQL + Vercel
- 광고주 세션: `advertiser_sessions` 쿠키, `getAdvertiserSession()` 반환
- 파트너 세션: Supabase Auth
- 이벤트 시스템: `partner_promotions` + `partner_promotion_participations` 테이블
- 밀리 전용: `tracking_links` + `tracking_events` + `advertiser_type` 분기

## Constraints

- **DB**: Supabase Management API로 직접 실행 (sbp_1340fa6745900f442022994429553f793589652c)
- **이메일**: Resend, FROM=noreply@updates.puzl.co.kr
- **배포**: git push → Vercel 자동 배포

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| advertiser_type 컬럼 기반 분기 | 밀리/일반 광고주 코드 분리 | ✓ Good |
| 낙관적 UI for 이벤트 참여 | 클릭 즉시 피드백, UX 개선 | ✓ Good |
| Supabase Management API로 migration 직접 실행 | 대시보드 없이 CI/CD 가능 | — Pending |

## Current Milestone: v1.1 — 이벤트 탭 배포 + 채널 UI + 키퍼메이트

**Goal:** 이벤트 탭 개편 배포, 채널 링크 UI 완성, 키퍼메이트 이메일 발송

**Target features:**
- DB migration 적용 (채널 추적 + 이벤트 강화)
- 이벤트 탭 배포
- 채널별 링크 UI
- tracking_link_url 우선 표시
- 키퍼메이트 96명 이메일 발송

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

---
*Last updated: 2026-03-31 — Milestone v1.1 started*
