# Report Generator Agent Memory

## Referio MVP Project Context

### Project Overview
- **Type**: B2B Affiliate Platform (멀티테넌트)
- **Status**: MVP 완성 (2026-03-09)
- **Business Model**: Advertisers (광고주) + Partners (파트너) + Referio (플랫폼 수수료 10%)

### Key Completion Status
- **P0 (Security)**: 100% — 테스트 계정 제거, 비밀번호 재설정 완성
- **P1 (Core Features)**: 100% — 문의 폼 브랜딩, 온보딩 가이드, CSV 내보내기
- **P2 (Growth)**: 90% — 캠페인, 리드 수동 등록, 초대 링크 완성

### Critical Implementation Details

**Inquiry Form** (`/inquiry/[advertiserId]`)
- Supports UUID and text advertiser_id
- Branding: logo, program_name, primary_color, description, contact_phone
- Email field added (병합 방식으로 DB 스키마 변경 없이 처리)
- 중복 체크: 90일 이내 같은 연락처

**API** (`/api/inquiry`)
- Fixed: inquiry_form_enabled null check (명시적 false만 차단)
- Supports ref parameter (referral_code tracking)
- Auto settlement creation on valid/contract status

**Password Reset** (`/reset-password`)
- Supabase PKCE flow 완전 지원
- Partners: email reset link in login
- Advertisers: customer center email

### Known Limitations
- Tier auto-upgrade logic: 미구현 (백엔드 필요)
- Multi-campaign: UI assumes 1 campaign per advertiser
- Advertiser auth: Custom session (not Supabase Auth)

### Report Location
- `/docs/04-report/mvp-inquiry.report.md` — MVP completion report

### Next Steps for Product
1. First customer onboarding (1주)
2. Technical debt cleanup: _archived folder 정리
3. Tier auto-upgrade implementation
4. Real-time notifications (Slack/Email UI)

---

**Last Updated**: 2026-03-09
**Session Focus**: MVP Completion Report Generation + Security Validation
