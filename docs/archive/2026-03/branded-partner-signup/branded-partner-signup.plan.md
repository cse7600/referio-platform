# Branded Partner Signup Planning Document

> **Summary**: 광고주별 브랜딩이 적용된 파트너 가입 페이지 및 자동 프로그램 연결 기능
>
> **Project**: Referio Platform
> **Version**: 1.0
> **Author**: Product Manager
> **Date**: 2026-03-12
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 파트너 가입 페이지(`/signup`)는 Referio 기본 브랜딩만 표시되는 단일 페이지다.
광고주가 자기 브랜드의 파트너를 모집할 때, 파트너가 "이 브랜드의 프로그램에 참여하는 것"이라는 맥락 없이 일반적인 Referio 가입 페이지를 보게 되면 브랜드 경험이 끊기고 전환율이 떨어진다.

이 기능은 **광고주별 브랜딩이 적용된 전용 파트너 가입 페이지**를 제공하여:
- 파트너가 해당 브랜드의 프로그램에 가입하는 것임을 명확히 인지
- 가입 완료 즉시 해당 광고주의 프로그램에 자동 연결(승인 대기)
- 이후 다른 프로그램도 탐색할 수 있는 자연스러운 플로우 제공

### 1.2 Background

- **경쟁사 (tolt.com)**: 브랜디드 어필리에이트 포탈, 커스텀 도메인(affiliates.yourdomain.com), 브랜디드 이메일 알림 제공
- **현재 상태**: Referio에는 가입 페이지가 1개뿐이며 브랜딩 커스텀 불가. 광고주 설정에 `logo_url`, `primary_color` 컬럼은 이미 존재하나 가입 페이지에는 미적용
- **PO 요구**: "파트너 모집은 브랜드별로 브랜딩을 구축하고, 파트너 가입하기 누르면 referio의 가입 페이지로 넘어오되 브랜딩적 UX가 필요하다"

### 1.3 Related Documents

- PRD: `docs/PRD-v1.0.md`
- 현재 가입 페이지: `src/app/signup/page.tsx`
- 광고주 설정 페이지: `src/app/advertiser/settings/page.tsx`
- partner_programs 스키마: `supabase/migrations/008_partner_programs.sql`

---

## 2. Scope

### 2.1 In Scope

- [x] 광고주별 브랜디드 파트너 가입 페이지 (URL: `/signup/[advertiserId]`)
- [x] 광고주 포털에서 브랜딩 요소 설정 (로고, 색상, 메시지, 이미지)
- [x] 광고주별 전용 가입 링크 생성 및 복사 기능
- [x] 가입 완료 시 해당 프로그램에 자동 `partner_programs` 레코드 생성 (status: pending)
- [x] 가입 후 온보딩에서 다른 프로그램 탐색 유도

### 2.2 Out of Scope

- 커스텀 도메인 지원 (affiliates.brand.com) -- 장기 과제
- 이메일 알림 브랜딩 커스텀 -- 별도 기능으로 분리
- 파트너 대시보드 전체의 브랜딩 커스텀 -- 현 단계에서는 가입 페이지만
- 파트너가 이미 Referio 계정이 있는 경우의 프로그램 자동 연결 (기존 사용자는 프로그램 탐색 페이지에서 직접 신청)

---

## 3. User Stories

### 3.1 광고주 관점

**US-01**: 광고주로서, 내 브랜드에 맞는 파트너 가입 페이지를 설정하고 싶다. 그래야 파트너가 우리 브랜드의 프로그램에 가입하는 것임을 인지하고, 전문적인 인상을 줄 수 있다.

수락 기준:
- 광고주 설정 페이지에서 가입 페이지 브랜딩 요소(로고, 색상, 메시지, 배경이미지)를 설정할 수 있다
- 설정 저장 후 미리보기를 통해 파트너에게 보일 모습을 확인할 수 있다

**US-02**: 광고주로서, 내 브랜드 전용 파트너 가입 링크를 얻고 싶다. 그래야 웹사이트, SNS, 이메일 등에 넣어서 파트너를 모집할 수 있다.

수락 기준:
- 광고주 포털에서 전용 가입 링크를 복사할 수 있다
- 링크 형태: `https://referio.kr/signup/{advertiserId}`

**US-03**: 광고주로서, 브랜디드 가입 페이지를 통해 가입한 파트너가 자동으로 내 프로그램에 연결되길 원한다. 그래야 파트너가 별도로 프로그램을 찾아서 신청하는 수고를 줄일 수 있다.

수락 기준:
- 브랜디드 가입 링크로 가입한 파트너는 자동으로 `partner_programs`에 `status: pending` 레코드가 생성된다
- 광고주 파트너 관리 화면에 해당 파트너가 "승인 대기"로 즉시 표시된다

### 3.2 파트너 관점

**US-04**: 파트너 후보로서, 특정 브랜드의 파트너 모집 링크를 통해 가입할 때 해당 브랜드의 분위기를 느끼고 싶다. 그래야 신뢰감을 갖고 가입할 수 있다.

수락 기준:
- 가입 페이지 좌측 패널에 광고주의 로고, 브랜드 색상, 환영 메시지가 표시된다
- Referio 로고도 함께 표시되어 플랫폼 신뢰도가 유지된다

**US-05**: 파트너로서, 특정 브랜드 링크로 가입한 후에도 다른 프로그램을 둘러보고 추가로 참여하고 싶다.

수락 기준:
- 가입 후 온보딩/대시보드에서 "다른 프로그램도 둘러보기" 안내가 표시된다
- 프로그램 탐색 페이지(`/dashboard/programs`)로의 자연스러운 동선이 존재한다

---

## 4. Requirements

### 4.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 브랜디드 가입 페이지 (`/signup/[advertiserId]`) 라우트 생성 | Must | Pending |
| FR-02 | 좌측 패널 브랜딩: 광고주 로고, 브랜드 색상(그라데이션), 환영 메시지 표시 | Must | Pending |
| FR-03 | 배경 이미지 설정 및 표시 (좌측 패널) | Should | Pending |
| FR-04 | 가입 완료 시 `partner_programs` 자동 생성 (status: pending, referral_code 자동 발급) | Must | Pending |
| FR-05 | 광고주 설정 페이지에 "파트너 모집" 탭/섹션 추가 | Must | Pending |
| FR-06 | 파트너 모집 설정: 로고 업로드, 브랜드 색상 선택, 환영 메시지 편집 | Must | Pending |
| FR-07 | 파트너 모집 설정: 배경 이미지 업로드 | Should | Pending |
| FR-08 | 전용 가입 링크 표시 및 복사 버튼 | Must | Pending |
| FR-09 | 가입 페이지 미리보기 기능 | Could | Pending |
| FR-10 | 가입 후 온보딩에서 원래 프로그램 하이라이트 + 다른 프로그램 탐색 유도 | Should | Pending |
| FR-11 | 기존 `/signup` 페이지 유지 (일반 가입 경로) | Must | Pending |
| FR-12 | 이미 Referio 계정이 있는 사용자가 브랜디드 링크 접속 시 로그인 유도 + 프로그램 자동 신청 안내 | Should | Pending |
| FR-13 | "Powered by Referio" 표시 (브랜디드 페이지 하단) | Must | Pending |

### 4.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 브랜디드 가입 페이지 초기 로딩 < 2초 | Lighthouse |
| Security | 광고주 ID 유효성 검증 (존재하지 않는 ID 접근 시 404 또는 일반 가입 페이지로 fallback) | 수동 테스트 |
| UX | 모바일 반응형 (좌측 패널 숨김, 브랜딩은 상단에 축약 표시) | 수동 테스트 |
| SEO | 브랜디드 가입 페이지 noindex (검색엔진 노출 방지) | meta 태그 확인 |

---

## 5. DB Schema Changes

### 5.1 `advertisers` 테이블 -- 컬럼 추가

기존에 `logo_url`, `primary_color` 컬럼이 이미 존재. 추가 필요 컬럼:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `signup_welcome_title` | TEXT | NULL | 브랜디드 가입 페이지 환영 제목 (예: "함께 성장할 파트너를 찾습니다") |
| `signup_welcome_message` | TEXT | NULL | 브랜디드 가입 페이지 환영 메시지 본문 |
| `signup_bg_image_url` | TEXT | NULL | 브랜디드 가입 페이지 좌측 배경 이미지 URL |
| `partner_signup_enabled` | BOOLEAN | false | 브랜디드 파트너 가입 페이지 활성화 여부 |

### 5.2 기존 컬럼 활용

| Column | 현재 상태 | 용도 |
|--------|-----------|------|
| `logo_url` | 존재, 설정 페이지에서 관리 | 가입 페이지 좌측 로고 |
| `primary_color` | 존재, 설정 페이지에서 관리 | 가입 페이지 그라데이션, 버튼 색상 |
| `company_name` | 존재 | 가입 페이지 브랜드명 표시 |
| `program_name` | 존재 | 가입 페이지 프로그램명 표시 |
| `program_description` | 존재 | 가입 페이지 프로그램 설명 표시 |

### 5.3 새 테이블 -- 불필요

기존 `partner_programs` 테이블이 파트너-광고주 연결을 이미 처리하므로 새 테이블은 필요 없음.

---

## 6. Key Screens

### 6.1 광고주 측 화면

**화면 A: 광고주 설정 > 파트너 모집 탭** (`/advertiser/settings` -- 신규 탭)

| 요소 | 설명 |
|------|------|
| 활성화 토글 | 브랜디드 가입 페이지 ON/OFF |
| 가입 링크 | `https://referio.kr/signup/{advertiserId}` + 복사 버튼 |
| 로고 업로드 | 기존 로고 설정과 공유 (별도 업로드 불필요) |
| 브랜드 색상 | 기존 `primary_color`와 공유 |
| 환영 제목 | 텍스트 입력 (예: "함께 성장할 파트너를 찾습니다") |
| 환영 메시지 | 텍스트 영역 (예: 프로그램 혜택, 커미션 안내 등) |
| 배경 이미지 | 이미지 업로드 (좌측 패널 배경) |
| 미리보기 버튼 | 새 탭에서 가입 페이지 미리보기 |

**화면 B: 광고주 파트너 관리 페이지** (기존 화면 -- 변경 없음)

- 브랜디드 가입으로 유입된 파트너도 기존 승인 대기 목록에 동일하게 표시

### 6.2 파트너 측 화면

**화면 C: 브랜디드 파트너 가입 페이지** (`/signup/[advertiserId]`)

```
+------------------------------------------+
| [좌측 패널 - 브랜딩 영역]    | [우측 - 가입 폼]        |
|                               |                         |
| {광고주 로고}                 | 파트너 가입              |
| {company_name}                | {program_name}에 참여    |
|                               |                         |
| {signup_welcome_title}        | [이름 입력]              |
| {signup_welcome_message}      | [이메일 입력]            |
|                               | [비밀번호 입력]          |
| 배경: {primary_color}        | [비밀번호 확인]          |
| 그라데이션 또는               |                         |
| {signup_bg_image_url}        | [가입하기 버튼]          |
|                               | (색상: primary_color)   |
| Powered by Referio            | 이미 계정이 있나요?      |
+------------------------------------------+
```

- 모바일: 좌측 패널 숨김, 상단에 로고+브랜드명만 축약 표시
- 가입 폼은 기존 `/signup`과 동일한 필드 (이름, 이메일, 비밀번호, 비밀번호 확인)
- 카드 제목이 "{program_name}에 참여하세요" 등으로 변경

**화면 D: 가입 후 온보딩** (`/onboarding` -- 기존 화면 수정)

- 가입 시 `advertiserId`가 전달된 경우:
  - "OO 프로그램에 가입 신청이 완료되었습니다. 승인 후 활동을 시작할 수 있습니다."
  - "다른 프로그램도 둘러보기" 버튼 추가

---

## 7. URL Structure

| URL | 용도 | 비고 |
|-----|------|------|
| `/signup` | 일반 파트너 가입 (기존) | 변경 없음 |
| `/signup/[advertiserId]` | 브랜디드 파트너 가입 | 신규 |
| `/advertiser/settings` (파트너 모집 탭) | 브랜딩 설정 | 기존 페이지에 탭 추가 |

광고주가 공유하는 링크 예시: `https://referio.kr/signup/hanwha_vision`

---

## 8. Implementation Priority (MoSCoW)

### Must (MVP -- 1차 구현)

1. **브랜디드 가입 페이지 라우트** (`/signup/[advertiserId]/page.tsx`)
   - 광고주 정보 조회 (logo_url, primary_color, company_name, program_name)
   - 좌측 패널 브랜딩 적용
   - 가입 폼 (기존 로직 재사용)
2. **가입 시 `partner_programs` 자동 생성**
   - 가입 완료 후 해당 advertiserId로 자동 프로그램 신청 (status: pending)
3. **광고주 설정에 가입 링크 표시**
   - 가입 링크 복사 버튼
   - `partner_signup_enabled` 토글
4. **DB migration** -- 신규 컬럼 4개 추가

### Should (1차 이후 빠르게)

5. 광고주 설정에서 환영 메시지(제목/본문) 편집
6. 배경 이미지 업로드 및 표시
7. 온보딩 페이지에서 원래 프로그램 하이라이트
8. 기존 사용자 브랜디드 링크 접속 시 로그인 유도

### Could (시간 허락 시)

9. 가입 페이지 미리보기
10. 가입 페이지 방문 통계 (조회수, 전환율)

### Won't (이번 이터레이션 제외)

11. 커스텀 도메인 (affiliates.brand.com)
12. 파트너 대시보드 전체 브랜딩
13. 이메일 알림 브랜딩
14. A/B 테스트

---

## 9. Flow Diagram

### 9.1 파트너 가입 플로우

```
광고주 웹사이트/SNS에서 "파트너 되기" 클릭
        |
        v
/signup/{advertiserId} 접속
        |
        v
광고주 정보 로딩 (logo, color, message)
        |
   +----+----+
   |         |
 유효한    유효하지 않은
 광고주     광고주 ID
   |         |
   v         v
브랜디드   일반 /signup으로
가입 페이지  리다이렉트
   |
   v
이름, 이메일, 비밀번호 입력 → 가입
   |
   v
1. Supabase Auth 계정 생성
2. partners 테이블 레코드 생성
3. partner_programs 레코드 생성 (advertiser_id, status: pending)
   |
   v
/onboarding 페이지 이동
   |
   v
"{company_name} 프로그램 가입 신청 완료"
+ "다른 프로그램 둘러보기" 안내
```

### 9.2 광고주 설정 플로우

```
광고주 설정 > 파트너 모집 탭
        |
        v
브랜딩 설정 (로고, 색상, 메시지)
        |
        v
저장 → DB 업데이트
        |
        v
가입 링크 복사 → 파트너 모집 시작
```

---

## 10. Success Criteria

### 10.1 Definition of Done

- [ ] `/signup/[advertiserId]` 페이지가 광고주 브랜딩과 함께 정상 렌더링
- [ ] 유효하지 않은 `advertiserId` 접속 시 일반 가입 페이지로 fallback
- [ ] 가입 완료 시 `partner_programs` 레코드 자동 생성 확인
- [ ] 광고주 설정에서 브랜딩 요소 설정 및 저장 정상 동작
- [ ] 가입 링크 복사 기능 동작
- [ ] 모바일 반응형 정상
- [ ] 기존 `/signup` 페이지 영향 없음

### 10.2 Quality Criteria

- [ ] 빌드 성공 (`npm run build`)
- [ ] 광고주 로고/색상 미설정 시에도 깨지지 않는 fallback UI
- [ ] 중복 가입 방지 (동일 이메일 체크)
- [ ] `partner_programs` 중복 생성 방지 (동일 partner-advertiser 조합 unique 제약)

---

## 11. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 광고주가 브랜딩을 설정하지 않고 링크만 공유 | Medium | High | fallback UI 제공 (기본 Referio 브랜딩 + 광고주 이름만 표시) |
| 이미 Referio 계정이 있는 사용자가 브랜디드 링크로 접속 | Low | Medium | 로그인 페이지로 안내 + 로그인 후 프로그램 신청 유도 |
| partner_programs 자동 생성 시 중복 레코드 | High | Low | DB unique constraint (partner_id, advertiser_id) 이미 존재 → ON CONFLICT 처리 |
| 이미지 업로드 용량/형식 문제 | Low | Medium | 파일 크기 2MB 제한, 이미지 형식(jpg/png/webp) 검증 |
| 존재하지 않는 advertiserId로 SEO 스팸 | Low | Low | noindex 메타 태그 + 유효하지 않은 ID는 fallback 처리 |

---

## 12. Open Questions (PO 확인 필요)

| # | 질문 | 영향 범위 | 기본값 (PO 확인 전) |
|---|------|-----------|---------------------|
| Q1 | 브랜디드 가입 링크 형태를 `/signup/{advertiserId}`로 할지, `/join/{advertiserId}`처럼 더 직관적인 경로로 할지? | URL 구조 | `/signup/{advertiserId}` |
| Q2 | 파트너가 브랜디드 링크로 가입하면 자동 승인(auto-approve)할지, 기존대로 승인 대기(pending)로 둘지? | FR-04 | 승인 대기 (pending) -- 광고주 통제권 유지 |
| Q3 | 광고주가 `partner_signup_enabled`를 끄면 링크 접속 시 어떻게 할지? (404 vs 일반 가입으로 리다이렉트) | UX | 일반 가입 페이지로 리다이렉트 |
| Q4 | 환영 메시지에 커미션 금액 등 민감 정보를 표시해도 되는지? (공개 페이지이므로 누구나 볼 수 있음) | 보안/정책 | 광고주 자율 (경고 문구만 표시) |
| Q5 | 가입 페이지에 프로그램 혜택(커미션 구조, 티어 등)을 상세히 보여줄지, 간단한 안내만 할지? | UI 복잡도 | MVP에서는 광고주가 입력한 메시지만 표시, 상세 정보는 가입 후 확인 |

---

## 13. Architecture Considerations

### 13.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Dynamic** | Feature-based modules, BaaS integration | O |

### 13.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 라우트 구조 | Next.js App Router dynamic route | 기존 패턴과 일관성 |
| 이미지 업로드 | Supabase Storage | 기존 logo_url 업로드와 동일 방식 |
| 데이터 조회 | Supabase client (server-side fetch) | 기존 inquiry 페이지 패턴 재사용 |
| 컴포넌트 | 기존 signup 페이지 컴포넌트 확장 | 코드 중복 최소화 |

---

## 14. Next Steps

1. [ ] PO의 Open Questions 답변 확인
2. [ ] Design document 작성 (`branded-partner-signup.design.md`)
3. [ ] DB migration SQL 작성
4. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-12 | Initial draft | Product Manager |
