# password-reset-fix Design Document

> **Summary**: 3개 파일에 걸친 비밀번호 재설정 흐름 버그 수정 — 최소 길이 통일, 에러 처리 추가, 세션 정리, 안내 문구 개선
>
> **Project**: referio-platform
> **Version**: Next.js 15 App Router + Supabase Auth
> **Author**: CTO Lead
> **Date**: 2026-03-26
> **Status**: Draft
> **Planning Doc**: [password-reset-fix.plan.md](../01-plan/features/password-reset-fix.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 비밀번호 정책 일관성: 가입(6자)과 재설정(6자) 통일
- React 패턴 준수: DOM 직접 접근 제거
- UX 개선: `alert()` 팝업 제거, 인라인 메시지로 통일
- 보안 강화: 재설정 성공 후 이전 세션 무효화

### 1.2 Design Principles

- 최소 변경 원칙: 이슈 범위 내에서만 수정, 과잉 변경 없음
- React 방식 준수: DOM 직접 접근 금지, state 기반 UI 제어
- 사용자 경험 우선: 에러/성공 모두 인라인 메시지로 즉시 피드백

---

## 2. 수정 스펙 상세

### 이슈 1 — reset-password/page.tsx: 최소 길이 6자 통일

**대상 파일**: `src/app/reset-password/page.tsx`

**수정 위치 1** — 라인 52: 조건 검사

```typescript
// Before
if (password.length < 8) {
  setErrorMsg('비밀번호는 8자 이상이어야 합니다')

// After
if (password.length < 6) {
  setErrorMsg('비밀번호는 6자 이상이어야 합니다')
```

**수정 위치 2** — 라인 168: Input placeholder

```typescript
// Before
placeholder="8자 이상 입력"

// After
placeholder="6자 이상 입력"
```

**수정 위치 3** — 라인 173: Input minLength 속성

```typescript
// Before
minLength={8}

// After
minLength={6}
```

**수정 위치 4** — 라인 88: 좌측 배경 안내 문구

```typescript
// Before
<p className="text-slate-400 text-lg">
  8자 이상의 안전한 비밀번호를 사용하세요
</p>

// After
<p className="text-slate-400 text-lg">
  6자 이상의 안전한 비밀번호를 사용하세요
</p>
```

---

### 이슈 2 — login/page.tsx: 에러 처리 및 DOM 접근 제거

**대상 파일**: `src/app/login/page.tsx`

**추가할 state**: 비밀번호 찾기 성공 메시지용

```typescript
// 기존 state에 추가
const [resetMsg, setResetMsg] = useState('')
```

**수정 위치** — 라인 144~163: 비밀번호 찾기 버튼 onClick 핸들러

```typescript
// Before (문제점: DOM 접근, 에러 무시, alert 사용)
onClick={async () => {
  const emailInput = document.getElementById('email') as HTMLInputElement
  if (emailInput?.value) {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(emailInput.value, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setError('')
    alert('비밀번호 재설정 메일을 발송했습니다. 이메일을 확인해주세요.')
  } else {
    setError('이메일을 먼저 입력해주세요')
  }
}}

// After (수정: React state 사용, 에러 처리, 인라인 메시지)
onClick={async () => {
  if (!email) {
    setError('이메일을 먼저 입력해주세요')
    return
  }
  const supabase = createClient()
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (resetError) {
    setError('메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
  } else {
    setError('')
    setResetMsg('비밀번호 재설정 메일을 발송했습니다. 이메일을 확인해주세요.')
  }
}}
```

**성공 메시지 표시 위치** — `{error && ...}` 블록 아래에 추가:

```tsx
{resetMsg && (
  <p className="text-green-600 text-sm">{resetMsg}</p>
)}
```

---

### 이슈 3 — reset-password/page.tsx: 성공 후 세션 정리

**대상 파일**: `src/app/reset-password/page.tsx`

**수정 위치** — 라인 68~70: 성공 처리 블록

```typescript
// Before
} else {
  setStatus('success')
}

// After
} else {
  // Sign out to clear the password-reset session before redirecting
  await supabase.auth.signOut()
  setStatus('success')
}
```

**주의사항**:
- `setStatus('success')` 이전에 `await signOut()` 완료 보장
- 성공 화면에서 "로그인하기" 버튼 클릭 시 `/login` 이동 (기존 유지)

---

### 이슈 4 — advertiser/login/page.tsx: 안내 문구 개선

**대상 파일**: `src/app/advertiser/login/page.tsx`

**수정 위치** — 라인 123~131

```tsx
// Before
<div className="text-sm text-slate-400">
  비밀번호를 잊으셨나요?{' '}
  <a
    href="mailto:support@referio.kr?subject=광고주 비밀번호 초기화 요청"
    className="hover:underline text-slate-500"
  >
    고객센터에 문의하세요
  </a>
</div>

// After
<div className="text-sm text-slate-400">
  비밀번호를 잊으셨나요?{' '}
  <a
    href="mailto:support@referio.kr?subject=광고주 비밀번호 초기화 요청&body=로그인 ID: "
    className="hover:underline text-slate-500"
  >
    support@referio.kr로 로그인 ID와 함께 문의하세요
  </a>
</div>
```

---

## 3. 수정 파일 요약

| 파일 | 수정 항목 | 우선순위 |
|------|----------|---------|
| `src/app/reset-password/page.tsx` | 최소 길이 8→6 (4곳), signOut 추가 | High |
| `src/app/login/page.tsx` | DOM 접근 제거, 에러 처리, alert 제거, resetMsg state 추가 | High |
| `src/app/advertiser/login/page.tsx` | 안내 문구 텍스트 변경 | Low |

---

## 4. 영향 범위

- 신규 파일 없음
- 기존 3개 파일 수정만
- DB 변경 없음
- API 변경 없음
- 다른 컴포넌트 영향 없음

---

## 5. Test Plan

### 수동 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|---------|
| 비밀번호 재설정 페이지에서 6자 입력 | 에러 없이 제출 가능 |
| 비밀번호 재설정 페이지에서 5자 입력 | "6자 이상" 에러 메시지 |
| 로그인 페이지에서 이메일 없이 비밀번호 찾기 클릭 | "이메일을 먼저 입력해주세요" 인라인 에러 |
| 로그인 페이지에서 이메일 입력 후 비밀번호 찾기 클릭 | 인라인 성공 메시지 (alert 없음) |
| 비밀번호 재설정 성공 후 "로그인하기" 클릭 | /login으로 이동, 이전 세션 없음 |

---

## 6. 구현 순서

1. `src/app/reset-password/page.tsx` 수정 (이슈 1 + 이슈 3)
2. `src/app/login/page.tsx` 수정 (이슈 2)
3. `src/app/advertiser/login/page.tsx` 수정 (이슈 4)
4. `npm run dev` 빌드 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-26 | Initial draft | CTO Lead |
