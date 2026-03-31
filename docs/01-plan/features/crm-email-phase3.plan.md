# CRM 이메일 Phase 3 구현 계획

**기능명**: CRM 이메일 자동화 — Phase 3 (고급 기능)
**상태**: 완료
**작성일**: 2026-03-31

---

## 구현 범위

### 신규 이메일 함수 (src/lib/email.ts)
| 이메일 | 함수명 | 트리거 |
|--------|--------|--------|
| Email 5: 신규 프로그램 안내 | `sendNewProgramEmail()` | 광고주 프로그램 is_active=false→true 전환 |
| Email 13: 위반 경고 | `sendViolationWarningEmail()` | Admin 위반 확정 버튼 클릭 |
| Email 14: 탈퇴 처리 완료 | `sendAccountDeletedEmail()` | 파트너 탈퇴 API 처리 완료 |

### 신규 API
- `POST /api/admin/partners/[id]/violation`: 위반 경고 발송
- `POST /api/partner/withdraw`: 파트너 탈퇴 처리

### DB Migration
- `supabase/migrations/025_violation_logs.sql`: violation_logs 테이블 (Supabase 적용 필요)

### UI 추가
- Admin 파트너 목록 (`/admin/partners`): 위반 경고 발송 버튼 + 모달
- 파트너 프로필 페이지 (`/dashboard/profile`): 계정 탈퇴 섹션

### 트리거 연결
- `advertiser/programs/[programId]/route.ts`: PATCH에서 is_active 전환 시 Email 5 트리거

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|----------------|------|
| 2026-03-31 | production | Email 5/13/14 함수 + violation_logs migration + withdraw API + Admin UI 위반경고 버튼 + 탈퇴 UI | 성공 |

---

## 미완료 (Phase 4 예정)
- Email 9: 티어 승급 축하 (티어 시스템 선행 구현 필요)
- violation_logs migration Supabase 실제 적용
- 수신거부 링크 실제 엔드포인트 구현
