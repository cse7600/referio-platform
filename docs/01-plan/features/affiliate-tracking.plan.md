# Affiliate Tracking & Landing Pages Plan

## Overview
Referio self-promotion affiliate system: click tracking, landing pages, conversion tracking.

## Features

### 1. Click Tracking API
- **Route**: `GET /api/r/[code]` (short redirect URL)
- **Flow**: short_code lookup -> validate active -> record click event -> redirect to landing_path
- **DB ops**: INSERT into `referio_affiliate_events` (type='click'), UPDATE `referio_affiliate_links.click_count` +1

### 2. Partner Recruitment Landing (`/join/partner`)
- Query param `?ref=p_abc123` -> store in `affiliate_ref` cookie (30 days)
- Referio branding, partner benefits explanation
- CTA -> `/signup` (existing partner signup)

### 3. Advertiser Recruitment Landing (`/join/advertiser`)
- Query param `?ref=a_abc123` -> store in `affiliate_ref` cookie (30 days)
- Referio service introduction, advertiser benefits
- CTA -> demo request or contact form

### 4. Conversion Tracking
- On partner signup (`/signup`): read `affiliate_ref` cookie -> record signup event
- API: `POST /api/affiliate/convert` called from signup flow
- DB ops: INSERT into `referio_affiliate_events` (type='signup'), UPDATE `referio_affiliate_links.conversion_count` +1
- Clear cookie after successful conversion

## Technical Decisions
- Use `GET /api/r/[code]` instead of `POST /api/affiliate/track` for cleaner redirect URLs
- Cookie name: `affiliate_ref`, value: short_code, 30-day expiry, path=/
- Landing pages are public (no auth required)
- Conversion API uses admin client (server-side, bypasses RLS)

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|-----------|----------------|------|
| 2026-03-30 | production | click/convert API DB 컬럼 불일치 버그 수정 (metadata→개별컬럼) | 성공 |

## File Structure
```
src/app/api/r/[code]/route.ts          # Click tracking + redirect
src/app/api/affiliate/convert/route.ts  # Conversion tracking
src/app/join/partner/page.tsx           # Partner landing
src/app/join/advertiser/page.tsx        # Advertiser landing
```
