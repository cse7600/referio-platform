# Plan: millie-airbridge (Millie Airbridge Integration)

## 1. Overview
밀리의서재(advertiser_id: 'millie') 전용 에어브릿지(Airbridge) 트래킹 연동.
**B2C 이벤트 트래킹 방식** — 고객 이름/연락처 없이 device_id/user_id로만 식별.
파트너별 고유 트래킹 링크 생성/할당, 이벤트 포스트백 수신을 통한 리퍼럴 자동 생성 및 정산 처리.

## 2. Background
- 기존 B2B 방식(담당자가 고객 이름/연락처/계약상태 수동 관리)과 완전히 다른 모델
- **퍼널**: 설치(install) -> 가입(sign_up) -> 구독 시작(subscribe)
- **에어브릿지**가 각 이벤트를 자동으로 Referio 서버로 전송
- 고객 이름/연락처 **없음** — device_id 또는 user_id로만 식별
- 담당자가 상태를 수동으로 바꾸는 일 **없음** — 이벤트 수신 시 자동 처리
- 밀리의서재 전용 구현이며, 다른 광고주(puzlcorp, savetax1, keepermate)에 영향 없음
- 에어브릿지 API 토큰/앱 정보는 webhook_integrations 테이블에 이미 등록 완료
- **is_public = false 영구 유지** (제안용이며, 실제 파트너 모집은 추후 결정)

## 3. Scope

### In-Scope
- DB 스키마: tracking_links, tracking_events 테이블 생성
- API: 트래킹 링크 생성 (광고주용), 링크 할당 (광고주용), 웹훅 수신 (에어브릿지 포스트백)
- partner_programs에 tracking_link_url 컬럼 추가
- 파트너 대시보드: tracking_link_url 우선 표시
- 밀리의서재 광고주 프로그램 정보 완성 (activity_guide, prohibited_activities 등)
- 데모용 더미 데이터 셋업 (파트너 5명, tracking_events 262건)
- **이벤트 현황 UI** (밀리 전용 광고주 대시보드 페이지)
- **/api/webhook/airbridge 재설계** (install/sign_up/subscribe 3단계 퍼널)

### Out-of-Scope
- 에어브릿지 웹 SDK 프론트엔드 삽입 (별도 태스크)
- 다른 광고주의 에어브릿지 연동
- 트래킹 링크 자동 할당 (수동 할당만)
- is_public 변경 (영구 false)

## 4. Technical Approach

### 4.1 DB Schema
- `tracking_links`: 풀 방식으로 미리 생성한 링크 저장, status로 할당 상태 관리
- `tracking_events`: 에어브릿지 포스트백 원본 로그 저장, 멱등성 보장
- `partner_programs.tracking_link_url`: 할당된 트래킹 링크 URL

### 4.2 API Endpoints
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/advertiser/tracking-links/generate | POST | advertiser_session | 트래킹 링크 N개 생성 |
| /api/advertiser/tracking-links/assign | POST | advertiser_session | 파트너에게 링크 할당 |
| /api/webhook/airbridge | POST | X-API-Key header | 에어브릿지 포스트백 수신 |
| /api/advertiser/millie-events | GET | advertiser_session (millie only) | 이벤트 현황 집계 |

### 4.3 Airbridge API
- Create Tracking Link: POST https://api.airbridge.io/v1/apps/{app_name}/tracking-links
- Authorization: Bearer {tracking_link_api_token}
- sub_id 파라미터로 파트너 식별

### 4.4 Event Flow (B2C 퍼널)
1. 에어브릿지 포스트백 -> /api/webhook/airbridge
2. sub_id로 tracking_links에서 파트너 매핑
3. **install 이벤트 -> tracking_events에만 기록 (referral 생성 없음)**
4. **sign_up 이벤트 -> tracking_events 기록 + referral 생성 (user_identifier 기반, 이름/연락처 없음)**
5. **subscribe 이벤트 -> tracking_events 기록 + 기존 referral의 contract_status='completed' -> 정산 트리거 자동 발동**
6. 멱등성: external_event_id 기준 중복 방지

### 4.5 이벤트 현황 UI
- 경로: `/advertiser/millie-events`
- 퍼널 요약 카드: 설치/가입/구독 건수 + 전환율
- 파트너별 이벤트 테이블: 설치/가입/구독/전환율/정산금액
- 최근 이벤트 스트림 (최근 20건)
- 사이드바: millie 광고주인 경우 "고객 관리" 대신 "이벤트 현황" 메뉴 표시

## 5. Constraints
- 밀리의서재 전용 (advertiser_id='millie', UUID='e6d1acf7-2288-46e1-b50a-53f368366f9f')
- 기존 referral_code 방식 불변
- 다른 광고주 코드 경로 불변
- **is_public = false 영구 유지**

## 6. Progress Tracking

### 완료 항목
- [x] DB 계정 생성 (millie / millie2026!)
- [x] webhook_integrations에 에어브릿지 토큰 등록
- [x] tracking_links 테이블 생성
- [x] tracking_events 테이블 생성
- [x] partner_programs.tracking_link_url 컬럼 추가
- [x] 트래킹 링크 생성 API (`/api/advertiser/tracking-links/generate`)
- [x] 트래킹 링크 할당 API (`/api/advertiser/tracking-links/assign`)
- [x] 에어브릿지 웹훅 수신 API (`/api/webhook/airbridge`)
- [x] 광고주 프로그램 정보 업데이트 (설명, 활동가이드, 금지활동, 수수료)
- [x] 더미 파트너 5명 INSERT (김도서, 이독서, 박밀리, 최책방, 정구독)
- [x] partner_programs 5건 INSERT (referral_code: MIL_KIM001~MIL_JUNG005)
- [x] 에어브릿지 설정 가이드 문서 작성 (`docs/millie-airbridge-setup-guide.md`)
- [x] 기존 더미 referrals/settlements 삭제 (B2C 전환)
- [x] tracking_events 더미 데이터 262건 INSERT (현실적 퍼널 전환율)
- [x] tracking_links 5건 생성 (파트너별 sub_id 할당)
- [x] /api/webhook/airbridge 재설계 (install/sign_up/subscribe 3단계)
- [x] 이벤트 현황 API (`/api/advertiser/millie-events`) → `/api/advertiser/events`로 이동 (2026-03-27)
- [x] 이벤트 현황 페이지 (`/advertiser/millie-events`) → `/advertiser/events`로 이동 (2026-03-27)
- [x] 사이드바 조건부 메뉴 (millie -> "이벤트 현황") → advertiserType 기반 분기로 리팩터 (2026-03-27)
- [x] advertiser_type / type_config DB 컬럼 추가 + 밀리 마이그레이션 (2026-03-27)
- [x] 전체 UUID 하드코딩 제거: events API, tracking-links generate/assign (2026-03-27)
- [x] getAdvertiserSession()에 advertiserType, typeConfig 필드 추가 (2026-03-27)
- [x] type_config 기반 동적 퍼널 이벤트 처리 (2026-03-27)

### 미완료 항목 (밀리의서재 담당자 액션 필요)
- [ ] 에어브릿지 포스트백 설정 (밀리의서재 담당자가 에어브릿지 대시보드에서 설정)
  - 가이드 문서: `docs/millie-airbridge-setup-guide.md`
- [ ] 포스트백 페이로드 구조 확인 후 webhook/airbridge route.ts 최종 보정
  - Preview payload 스크린샷 수신 후 필드 매핑 확인 필요

### 미완료 항목 (Referio 관리자 액션 필요)
- [ ] 파트너 대시보드에서 tracking_link_url 우선 표시 UI 반영

## 7. Success Criteria
- [x] tracking_links, tracking_events 테이블 생성
- [x] 트래킹 링크 생성 API 동작
- [x] 트래킹 링크 할당 API 동작
- [x] 에어브릿지 웹훅 수신 API 구현 (3단계 퍼널)
- [x] 이벤트 현황 UI 구현 (퍼널 요약, 파트너별 테이블, 최근 이벤트)
- [ ] 에어브릿지 실제 포스트백 수신 -> 리퍼럴 생성/업데이트 (실환경 테스트 필요)
- [ ] 파트너 대시보드에서 tracking_link_url 우선 표시
- [x] 기존 광고주 기능 무영향

---
**Status**: In Progress (B2C 이벤트 퍼널 구현 완료, 에어브릿지 포스트백 설정 대기 중)
**Created**: 2026-03-27
**Updated**: 2026-03-27
