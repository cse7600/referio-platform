# 카카오 로그인 + 카카오싱크 도입 PRD

**버전:** v1.0  
**작성일:** 2026-04-09  
**상태:** 구현 준비 완료 (환경변수 주입 대기)  
**GSD Phase:** 16

---

## 개요

파트너 회원가입/로그인 화면에 카카오 로그인을 추가한다.  
`NEXT_PUBLIC_KAKAO_ENABLED=true` 환경변수 하나로 버튼이 활성화되며, 이외 모든 코드는 사전 구현 완료 상태이다.

카카오싱크는 카카오 로그인 동의 화면에 서비스 이용약관 동의 + 카카오 채널 추가를 통합한 기능이다.  
Phase 1은 기본 카카오 로그인을 구현하고, Phase 2(카카오 비즈앱 심사 통과 후)에 채널 추가 동의(`plusfriends`)를 추가한다.

---

## 문제 정의

- 현재 가입 방법: 이메일 + 비밀번호만 지원
- 블로거/인플루언서 파트너는 카카오 계정을 주로 사용 → 가입 마찰 높음
- 카카오 채널과 연결하면 파트너에게 채널 알림톡 발송 가능 (향후 CRM 고도화)

---

## 요구사항

### Phase 1 — 기본 카카오 로그인 (즉시 구현 가능)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| KAK-01 | 파트너 가입 페이지(`/signup`)에 카카오 로그인 버튼 표시 | P0 |
| KAK-02 | 파트너 로그인 페이지(`/login`)에 카카오 로그인 버튼 표시 | P0 |
| KAK-03 | 광고주 커스텀 가입 페이지(`/signup/[advertiserId]`)에도 카카오 버튼 | P1 |
| KAK-04 | OAuth 콜백(`/auth/callback`)에서 카카오 사용자 → partners 레코드 자동 생성 | P0 |
| KAK-05 | `NEXT_PUBLIC_KAKAO_ENABLED` 환경변수가 없으면 버튼 미표시 (기존 방식만) | P0 |
| KAK-06 | 카카오로 가입한 파트너도 기존 이메일 파트너와 동일한 온보딩 플로우 진행 | P0 |
| KAK-07 | 카카오 가입 시 환영 이메일 발송 (기존 콜백 로직 재사용) | P1 |
| KAK-08 | `/kakao-signup`: 이메일 가입 폼을 "이메일로 가입하기" 더보기 토글로 숨김 — 카카오 로그인 최우선 노출 | P0 ✓ 완료 |
| KAK-09 | `/kakao-login`: 카카오 로그인 전용 페이지 — 이메일 로그인은 텍스트 링크로만 노출 | P0 ✓ 완료 |

### Phase 2 — 카카오싱크 채널 추가 (비즈앱 심사 후)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| KAK-10 | `KAKAO_CHANNEL_PUBLIC_ID` 환경변수 설정 시 채널 추가 동의(`plusfriends`) scope 자동 활성화 | P1 |
| KAK-11 | OAuth 콜백에서 채널 추가 동의 여부 확인 후 `partners.kakao_channel_added` 필드 업데이트 | P1 |
| KAK-12 | 채널 추가 완료 파트너에게 카카오 채널 메시지 발송 가능 | P2 |

---

## 기술 설계

### 환경변수 구조

```bash
# Supabase 대시보드에서 Kakao OAuth 활성화 후 설정
NEXT_PUBLIC_KAKAO_ENABLED=true              # Phase 1 활성화 스위치
NEXT_PUBLIC_SUPABASE_URL=...               # 기존
NEXT_PUBLIC_SUPABASE_ANON_KEY=...          # 기존

# Phase 2 (카카오싱크 비즈앱 심사 후)
KAKAO_CHANNEL_PUBLIC_ID=_XxXxXx            # 카카오톡 채널 프로필 ID
```

> Supabase 대시보드에서 등록하는 카카오 앱 키/시크릿은 Supabase 내부에서만 관리되므로  
> 애플리케이션 .env.local에 별도 추가 불필요.

### OAuth 플로우

```
[파트너] 카카오 로그인 버튼 클릭
   ↓
supabase.auth.signInWithOAuth({ provider: 'kakao', scopes: ... })
   ↓
카카오 OAuth 동의 화면 (닉네임, 이메일)
   ↓
/auth/callback?code=...  ← 기존 콜백 재사용
   ↓
exchangeCodeForSession() → user 객체 획득
   ↓
[신규] partners INSERT (name=카카오닉네임, email=카카오이메일)
[기존] partners auth_user_id 업데이트
   ↓
/onboarding (전화번호 입력)
   ↓
/dashboard
```

### Scope 전략

| Phase | Scope | 설명 |
|-------|-------|------|
| Phase 1 | `profile_nickname account_email` | 기본, 심사 불필요 |
| Phase 2 | `+ plusfriends` | 채널 추가 동의, 비즈앱 필요 |
| 미래 | `+ phone_number` | 전화번호 자동 수신, 심사 3~5일 |

### 컴포넌트 구조

```
src/components/auth/KakaoLoginButton.tsx   ← 재사용 버튼 컴포넌트
src/app/signup/page.tsx                    ← 버튼 삽입
src/app/login/page.tsx                     ← 버튼 삽입
src/app/auth/callback/route.ts             ← OAuth 이름 추출 로직 추가
```

---

## 선행 작업 (비즈니스)

Phase 1 활성화에 필요한 외부 작업:

| 순서 | 작업 | 담당 | 소요 시간 |
|------|------|------|---------|
| 1 | 카카오 개발자 콘솔 앱 생성 | PO | 10분 |
| 2 | REST API 키 + Client Secret 발급 | PO | 즉시 |
| 3 | Supabase 대시보드 → Auth → Kakao 활성화 | PO | 5분 |
| 4 | Vercel 환경변수 `NEXT_PUBLIC_KAKAO_ENABLED=true` 추가 | PO | 2분 |
| 5 | Vercel 재배포 | 자동 | ~3분 |

Phase 2 추가 작업:

| 순서 | 작업 | 담당 | 소요 시간 |
|------|------|------|---------|
| 6 | 카카오 비즈앱 등록 신청 | PO | 1~3일 |
| 7 | 카카오 채널(비즈니스 채널) 개설 | PO | 1일 |
| 8 | `plusfriends` 동의항목 심사 | 카카오 | 3~5일 |

---

## 성공 기준

- [ ] 카카오 로그인 버튼 클릭 → 카카오 동의 화면 → 파트너 가입 완료
- [ ] 카카오 가입 파트너가 `/dashboard`에서 정상 작동
- [ ] `NEXT_PUBLIC_KAKAO_ENABLED` 미설정 시 버튼 미노출 (기존 UI 변화 없음)
- [ ] 기존 이메일 가입 파트너 영향 없음

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|---------|-------------|------|
| 2026-04-09 | production | KakaoLoginButton 컴포넌트 생성, signup/login/BrandedSignupForm 카카오 버튼 추가, auth/callback 이름 추출 개선 | 성공 |
