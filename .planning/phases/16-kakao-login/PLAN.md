# Phase 16: 카카오 로그인 + 카카오싱크 도입

**Goal:** 환경변수 하나로 카카오 로그인이 활성화되도록 모든 코드를 사전 구현한다.

**PRD:** docs/01-plan/features/kakao-login.plan.md

**Success Criteria:**
1. `NEXT_PUBLIC_KAKAO_ENABLED=true` 설정 시 가입/로그인 페이지에 카카오 버튼 표시
2. 카카오 OAuth → `/auth/callback` → partners 레코드 자동 생성 → /onboarding 정상 작동
3. 환경변수 미설정 시 기존 UI 완전히 동일 (카카오 버튼 미노출)
4. 빌드 에러 없음 (`npm run dev` 성공)

**Depends on:** 외부 — Supabase 대시보드 Kakao Provider 설정

---

## Plans

### Plan 1: KakaoLoginButton 컴포넌트 생성

**파일:** `src/components/auth/KakaoLoginButton.tsx`

**작업:**
- [ ] `NEXT_PUBLIC_KAKAO_ENABLED` 체크: falsy면 null 반환
- [ ] `supabase.auth.signInWithOAuth({ provider: 'kakao' })` 호출
- [ ] scope: Phase 1 = `profile_nickname account_email`
- [ ] `KAKAO_CHANNEL_PUBLIC_ID` 환경변수 있으면 `plusfriends` scope 자동 추가 (Phase 2 대비)
- [ ] 카카오 브랜드 컬러 버튼 (#FEE500 배경, #000 텍스트)
- [ ] 카카오 로고 SVG 인라인 포함
- [ ] redirectTo: `${location.origin}/auth/callback`

**구현 메모:**
```tsx
const KAKAO_ENABLED = process.env.NEXT_PUBLIC_KAKAO_ENABLED === 'true';
if (!KAKAO_ENABLED) return null;

const scopes = ['profile_nickname', 'account_email'];
if (process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID) {
  scopes.push('plusfriends');
}
```

---

### Plan 2: 가입 페이지에 카카오 버튼 추가

**파일:** `src/app/signup/page.tsx`

**작업:**
- [ ] `KakaoLoginButton` import 추가
- [ ] 기존 form 버튼 위에 구분선("또는") + KakaoLoginButton 삽입
- [ ] 구분선 UI: `relative flex items-center` + `<hr>` + "또는" 텍스트

---

### Plan 3: 로그인 페이지에 카카오 버튼 추가

**파일:** `src/app/login/page.tsx`

**작업:**
- [ ] `KakaoLoginButton` import 추가
- [ ] 로그인 버튼 아래 구분선("또는") + KakaoLoginButton 삽입
- [ ] "비밀번호를 잊으셨나요?" 링크는 그대로 유지

---

### Plan 4: Auth 콜백 OAuth 이름 처리 개선

**파일:** `src/app/auth/callback/route.ts`

**작업:**
- [ ] 카카오 OAuth user_metadata에서 이름 추출:
  - `user.user_metadata?.full_name` (카카오 닉네임이 여기 들어옴)
  - `user.user_metadata?.name` (기존 이메일 가입)
  - fallback: '파트너'
- [ ] 카카오 OAuth 가입 시 이미 프로필 이미지 있으므로 avatar_url 저장 고려 (선택)
- [ ] 기존 플로우 변경 없음 — 이름 추출 로직만 개선

**구현 메모:**
```typescript
// 카카오는 full_name, 이메일 가입은 name
const userName = nameParam
  ? decodeURIComponent(nameParam)
  : (data.user.user_metadata?.full_name as string)
  || (data.user.user_metadata?.name as string)
  || '파트너';
```

---

### Plan 5: 광고주 커스텀 가입 페이지 카카오 버튼 추가

**파일:** `src/app/signup/[advertiserId]/BrandedSignupForm.tsx`

**작업:**
- [ ] `KakaoLoginButton` import 및 삽입
- [ ] advertiserId를 redirectTo에 state로 전달 (광고주 프로그램 연결용)
- [ ] `signInWithOAuth` options.queryParams로 `state=advertiserId` 전달

---

### Plan 6: PRD 및 메인 PRD 업데이트

**파일:** 
- `docs/01-plan/features/kakao-login.plan.md` ✓ (이미 생성)
- `docs/PRD-v1.0.md` — 기능 PRD 추적 섹션에 kakao-login 추가

---

### Plan 7: 빌드 검증

**작업:**
- [ ] `npm run dev` 실행 → 에러 없음 확인
- [ ] 카카오 버튼 미노출 확인 (`NEXT_PUBLIC_KAKAO_ENABLED` 미설정 시)
- [ ] TypeScript 타입 에러 없음

---

## 환경변수 체크리스트 (PO 작업)

구현 완료 후 PO가 설정해야 하는 항목:

```
[Supabase 대시보드]
□ Authentication > Providers > Kakao 활성화
□ REST API Key 입력
□ Client Secret 입력
□ Redirect URL: https://[프로젝트].supabase.co/auth/v1/callback

[카카오 개발자 콘솔]
□ 플랫폼 > Web 플랫폼 등록 (도메인 추가)
□ 카카오 로그인 > Redirect URI: https://[프로젝트].supabase.co/auth/v1/callback
□ 동의항목 > 닉네임(필수), 이메일(선택) 설정

[Vercel 환경변수]
□ NEXT_PUBLIC_KAKAO_ENABLED=true
```

---

*Phase 16 created: 2026-04-09*
