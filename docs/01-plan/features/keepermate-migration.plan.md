# 한화비전 키퍼메이트 파트너 이관

> **Summary**: 기존 Airtable 기반으로 운영되던 한화비전 키퍼메이트 파트너 99명을 Referio 플랫폼으로 이관. Supabase Auth 계정 생성 + 비밀번호 설정 이메일 플로우 구축
>
> **Project**: referio-platform
> **Date**: 2026-03-26
> **Status**: 진행 중 (DB/Auth 완료, 이메일 발송 보류)

---

## 1. 개요

### 1.1 광고주 정보
- `advertiser_id`: `keepermate`
- `advertiser UUID`: `ab7da1e1-2bef-4065-8c84-88c037f2b4dc`

### 1.2 이관 대상
- 파트너 99명 (Airtable → Referio partners 테이블)
- 전원 `status=approved`, `tier=authorized`, referral_code 기존 값 유지

---

## 2. 완료된 작업

| 항목 | 상태 | 비고 |
|------|------|------|
| Supabase Auth 계정 생성 (99명) | 완료 | `scripts/migrate-keepermate-auth.js` |
| `partners.auth_user_id` 연결 | 완료 | 전원 연결 완료 |
| `partner_programs` 등록 | 완료 | status=approved, tier=authorized |
| BrandedSignupForm 비밀번호 설정 모드 | 완료 | `?code=` 파라미터 감지 시 전환 |
| Supabase redirect URL 허용 설정 | 완료 | `/signup/keepermate` 추가 |
| 테스트 이메일 발송 | 완료 | 1명 테스트 성공 |

---

## 3. 미완료 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| 96명 비밀번호 설정 이메일 일괄 발송 | **보류** | PO 최종 승인 후 진행 |

---

## 4. 비밀번호 설정 이메일 플로우

```
scripts/send-test-email.js 실행
  → Supabase Admin generateLink(recovery)
  → /signup/keepermate?code=xxx 형태 링크 포함
  → Resend로 이메일 발송 (noreply@updates.puzl.co.kr)
  → 파트너가 링크 클릭 → BrandedSignupForm 비밀번호 설정 모드
  → 비밀번호 설정 완료 → /login 이동
```

---

## 5. 관련 파일

- `scripts/migrate-keepermate-auth.js`: Auth 계정 생성 스크립트
- `scripts/send-test-email.js`: 이관 이메일 발송 스크립트
- `src/app/signup/[advertiserId]/page.tsx`: BrandedSignupForm 포함 브랜딩 가입 페이지

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|---------------|------|
| 2026-03-26 | dev | BrandedSignupForm 비밀번호 설정 모드, 해시 토큰 감지, 에러 메시지 한국어화 | 성공 |
