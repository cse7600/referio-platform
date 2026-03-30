# password-reset-fix Planning Document

> **Summary**: 비밀번호 재설정 흐름의 4가지 버그 수정 — 최소 길이 불일치, 에러 처리 누락, 세션 정리 미흡, 안내 문구 불명확
>
> **Project**: referio-platform
> **Version**: Next.js 15 App Router + Supabase Auth
> **Author**: CTO Lead
> **Date**: 2026-03-26
> **Status**: 완료 (2026-03-30 추가 수정)

---

## 1. Overview

### 1.1 Purpose

파트너 로그인/비밀번호 재설정 흐름에서 발견된 4가지 이슈를 수정한다.
사용자 경험을 개선하고, 잘못된 에러 처리로 인한 혼란을 제거한다.

### 1.2 Background

- 비밀번호 가입 시 최소 6자 정책인데, 재설정 페이지는 8자로 구현되어 일부 파트너가 유효한 비밀번호를 입력해도 오류를 만남
- `resetPasswordForEmail()`에서 에러가 발생해도 성공 메시지를 보여주는 버그 존재
- 비밀번호 재설정 성공 후 이전 세션이 그대로 남아 있어 보안상 불완전
- 광고주 비밀번호 찾기 안내 문구가 불명확함

### 1.3 Related Documents

- 파일: `src/app/reset-password/page.tsx`
- 파일: `src/app/login/page.tsx`
- 파일: `src/app/advertiser/login/page.tsx`

---

## 2. Scope

### 2.1 In Scope

- [x] 이슈 1: `reset-password/page.tsx` 비밀번호 최소 길이 8자 → 6자 수정
- [x] 이슈 2: `login/page.tsx` 비밀번호 찾기 에러 처리 및 DOM 직접 접근 제거
- [x] 이슈 3: `reset-password/page.tsx` 성공 후 `signOut()` 호출 추가
- [x] 이슈 4: `advertiser/login/page.tsx` 비밀번호 분실 안내 문구 개선

### 2.2 Out of Scope

- 비밀번호 찾기 이메일 디자인 변경
- 광고주 셀프 서비스 비밀번호 재설정 기능 신규 개발
- 가입 페이지 변경

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `reset-password/page.tsx`: 비밀번호 최소 길이 조건을 6자로 변경 (코드 라인 52, 173, placeholder 텍스트, 좌측 배경 안내 문구) | High | Pending |
| FR-02 | `login/page.tsx`: `resetPasswordForEmail()` 결과를 검증하여 에러 시 인라인 에러 메시지 표시 | High | Pending |
| FR-03 | `login/page.tsx`: `document.getElementById('email')` 대신 React state `email`을 직접 사용 | High | Pending |
| FR-04 | `login/page.tsx`: `alert()` 제거, 성공 시 인라인 메시지로 대체 | Medium | Pending |
| FR-05 | `reset-password/page.tsx`: 성공 시 `/login` 이동 전 `supabase.auth.signOut()` 호출 | Medium | Pending |
| FR-06 | `advertiser/login/page.tsx`: 비밀번호 분실 안내 문구를 더 명확하게 변경 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| UX | alert() 팝업 제거, 인라인 메시지로 대체 | 육안 확인 |
| Security | 비밀번호 재설정 후 이전 세션 무효화 | 세션 쿠키 확인 |
| Consistency | 최소 길이 6자로 가입 정책과 일치 | 코드 리뷰 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] FR-01~FR-06 모두 구현
- [x] `npm run dev` 빌드 성공
- [x] 타입스크립트 컴파일 오류 없음

### 4.2 Quality Criteria

- [x] Zero TypeScript 타입 에러
- [x] Zero lint errors
- [x] 기존 기능(로그인, 로그아웃) 정상 동작 유지

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| signOut() 호출 후 이동 시 race condition | Low | Low | await 처리 후 router.push |
| 인라인 성공 메시지 state 관리 복잡도 증가 | Low | Low | 단순 boolean state 추가 |

---

## 6. Architecture Considerations

### 6.1 Project Level

Dynamic (Next.js 15 + Supabase Auth, BaaS 기반)

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 에러 표시 방식 | 인라인 state | alert()은 UX 안티패턴, React 방식으로 통일 |
| 이메일 값 접근 | React state `email` | DOM 직접 접근은 React 패턴 위반 |
| signOut 시점 | 성공 직후, push 전 | await로 완료 보장 |

---

## 7. Next Steps

1. [ ] Design 문서 작성 (`password-reset-fix.design.md`)
2. [ ] 코드 구현 (3개 파일)
3. [ ] Gap 분석

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|---------------|------|
| 2026-03-30 | production | 4가지 추가 수정: 재설정 링크 만료 시 재발급 UI, 미들웨어 recovery code 우회, BrandedSignupForm signOut 추가, 이메일 만료 안내 문구 | 성공 |

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-26 | Initial draft | CTO Lead |
| 0.2 | 2026-03-30 | 추가 수정: 만료 링크 재발급 UI, 미들웨어 recovery 우회, signOut 누락, 이메일 만료 안내 | CTO Lead |
