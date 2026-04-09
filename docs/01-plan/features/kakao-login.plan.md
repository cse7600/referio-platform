# 카카오 로그인 + 카카오싱크 도입 PRD

**버전:** v1.2
**작성일:** 2026-04-09
**최종 업데이트:** 2026-04-09
**상태:** 비즈니스 채널 심사 진행 중 (Phase 2 코드 사전 구현 완료)
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

### Phase 1 — 기본 카카오 로그인 (코드 완료, 환경변수 대기)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| KAK-01 | 파트너 가입 페이지(`/signup`)에 카카오 로그인 버튼 표시 | P0 | ✅ 코드 완료 |
| KAK-02 | 파트너 로그인 페이지(`/login`)에 카카오 로그인 버튼 표시 | P0 | ✅ 코드 완료 |
| KAK-03 | 광고주 커스텀 가입 페이지(`/signup/[advertiserId]`)에도 카카오 버튼 | P1 | ✅ 코드 완료 |
| KAK-04 | OAuth 콜백(`/auth/callback`)에서 카카오 사용자 → partners 레코드 자동 생성 | P0 | ✅ 코드 완료 |
| KAK-05 | `NEXT_PUBLIC_KAKAO_ENABLED` 환경변수가 없으면 버튼 미표시 (기존 방식만) | P0 | ✅ 코드 완료 |
| KAK-06 | 카카오로 가입한 파트너도 기존 이메일 파트너와 동일한 온보딩 플로우 진행 | P0 | ✅ 코드 완료 |
| KAK-07 | 카카오 가입 시 환영 이메일 발송 (기존 콜백 로직 재사용) | P1 | ✅ 코드 완료 |
| KAK-08 | `/kakao-signup`: 이메일 가입 폼을 "이메일로 가입하기" 더보기 토글로 숨김 | P0 | ✅ 완료 |
| KAK-09 | `/kakao-login`: 카카오 로그인 전용 페이지 — 이메일 로그인은 텍스트 링크로만 | P0 | ✅ 완료 |

### Phase 2 — 카카오싱크 채널 추가 (비즈앱 심사 후, 코드 사전 구현 완료)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| KAK-10 | `NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID` 설정 시 `plusfriends` scope 자동 활성화 | P1 | ✅ 코드 완료 |
| KAK-11 | DB `partners.kakao_channel_added` 컬럼으로 채널 동의 여부 추적 | P1 | ✅ 코드 완료 (심사 승인 후 활성화) |
| KAK-12 | 채널 추가 완료 파트너에게 카카오 채널 메시지 발송 인프라 | P2 | 🔲 스켈레톤만 (추후 구현) |

---

## 기술 설계

### 환경변수 구조

```bash
# Supabase 대시보드에서 Kakao OAuth 활성화 후 설정
NEXT_PUBLIC_KAKAO_ENABLED=true              # Phase 1 활성화 스위치

# Phase 2 (카카오싱크 비즈앱 심사 후)
NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID=_XxXxXx  # 카카오톡 채널 프로필 ID
KAKAO_ADMIN_KEY=...                           # 서버사이드 채널 메시지 발송용
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
/auth/callback?code=...  ← 기존 콜백 재사용 (변경 없음)
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

### DB 구조 (migration 030)

```sql
-- partners 테이블 추가 컬럼
kakao_channel_added     BOOLEAN DEFAULT false   -- Phase 2 채널 추가 동의 여부
kakao_channel_added_at  TIMESTAMPTZ             -- 동의 시각
```

### 컴포넌트 구조

```
src/components/auth/KakaoLoginButton.tsx   ← 재사용 버튼 컴포넌트 (plusfriends scope 조건부 포함)
src/app/signup/page.tsx                    ← 카카오 버튼 삽입
src/app/login/page.tsx                     ← 카카오 버튼 삽입
src/app/kakao-signup/page.tsx              ← 심사 제출용 전용 가입 페이지
src/app/kakao-login/page.tsx               ← 심사 제출용 전용 로그인 페이지
src/app/auth/callback/route.ts             ← 기존 콜백 (변경 없음, 카카오 채널 로직 미포함)
src/lib/kakao-channel.ts                   ← 채널 메시지 API 스켈레톤 (Phase 2 추후 구현)
```

---

## 개인정보 수집 사유 (카카오 심사 제출용)

### 닉네임(이름) 수집 사유

> Referio는 기업-파트너 추천 마케팅 플랫폼으로, 카카오 로그인을 통해 파트너(블로거·인플루언서) 회원가입을 지원합니다. 닉네임은 파트너 계정 표시명 및 광고주 협업·정산 처리 시 당사자 식별에 사용되며, 이메일은 서비스 공지 발송·본인 확인·연락 수단으로 활용됩니다. 별도 회원가입 절차 없이 카카오 계정만으로 즉시 서비스 이용이 가능하도록 최소한의 항목만 수집합니다.

### 이메일(account_email) 수집 사유

> 카카오 로그인으로 가입한 파트너의 이메일 주소는 ① 서비스 이용 관련 공지 및 정산 안내 발송, ② 비밀번호 없는 계정의 본인 확인 수단, ③ 광고주와의 협업 진행 시 연락처로 활용됩니다. 이메일은 서비스 운영상 불가결한 식별 정보로, 별도 가입 양식 없이 카카오 계정 이메일을 통해 즉시 서비스 이용이 가능하도록 하기 위해 수집합니다.

---

## 심사 현황 (2026-04-09 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| 카카오 개발자 앱 생성 | ✅ 완료 | |
| REST API 키 + Client Secret 발급 | ✅ 완료 | |
| 비즈니스 채널 개설 | ✅ 완료 | |
| 개인정보 동의항목 (닉네임, 이메일) 신청 | ✅ 심사 중 | 기본 앱 심사 |
| `plusfriends` 동의항목 신청 | 🔲 예정 | 비즈앱 심사 완료 후 |
| Supabase Kakao Provider 활성화 | 🔲 대기 | 심사 승인 후 PO 액션 |
| Vercel `NEXT_PUBLIC_KAKAO_ENABLED=true` | 🔲 대기 | 심사 승인 후 PO 액션 |

### 심사 제출 자료

| 항목 | URL |
|------|-----|
| 회원가입 화면 | https://referio.puzl.co.kr/kakao-signup |
| 로그인 화면 | https://referio.puzl.co.kr/kakao-login |
| 개인정보처리방침 | https://referio.puzl.co.kr/privacy |
| 서비스 홈 | https://referio.puzl.co.kr/signup |

---

## Phase 1 활성화 절차 (심사 승인 후 PO 액션)

| 순서 | 작업 | 담당 | 소요 |
|------|------|------|------|
| 1 | Supabase Dashboard → Auth → Providers → Kakao → REST API 키 + Client Secret 입력 | PO | 5분 |
| 2 | 카카오 콘솔 → Redirect URI 등록: `https://eqdnirtgmevhobmycxzn.supabase.co/auth/v1/callback` | PO | 2분 |
| 3 | Vercel 환경변수 `NEXT_PUBLIC_KAKAO_ENABLED=true` 추가 → 재배포 | PO | 3분 |

## Phase 2 활성화 절차 (plusfriends 심사 완료 후 PO 액션)

| 순서 | 작업 | 담당 | 소요 |
|------|------|------|------|
| 1 | Vercel 환경변수 `NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID=_채널ID` 추가 | PO | 2분 |
| 2 | Vercel 환경변수 `KAKAO_ADMIN_KEY=...` 추가 | PO | 2분 |
| 3 | `src/lib/kakao-channel.ts` 내 TODO 블록 실제 구현 | 개발 | |

---

## 성공 기준

- [ ] 카카오 로그인 버튼 클릭 → 카카오 동의 화면 → 파트너 가입 완료
- [ ] 카카오 가입 파트너가 `/dashboard`에서 정상 작동
- [ ] `NEXT_PUBLIC_KAKAO_ENABLED` 미설정 시 버튼 미노출 (기존 UI 변화 없음)
- [ ] 기존 이메일 가입 파트너 영향 없음
- [ ] Phase 2: `NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID` 설정 시 채널 동의 scope 자동 추가

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|---------|-------------|------|
| 2026-04-09 | production | KakaoLoginButton 컴포넌트 생성, signup/login/BrandedSignupForm 카카오 버튼 추가, auth/callback 이름 추출 개선 | 성공 |
| 2026-04-09 | production | kakao-signup/kakao-login 심사용 전용 페이지 추가, PRD KAK-08/09 추가 | 성공 |
| 2026-04-09 | production | Phase 2 사전 구현: migration 030 (kakao_channel_added 컬럼), KakaoLoginButton plusfriends scope 조건부 추가, UI 뱃지 (NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID 가드), kakao-channel.ts 스켈레톤 | 성공 |
