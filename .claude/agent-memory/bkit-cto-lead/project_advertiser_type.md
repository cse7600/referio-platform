---
name: Advertiser Type Architecture
description: advertisers table now has advertiser_type (inquiry/event_tracking/hybrid) and type_config JSONB for dynamic behavior branching
type: project
---

advertiser_type architecture implemented 2026-03-27. Replaces all millie UUID hardcoding.

**Why:** Millie was the only event_tracking advertiser, causing UUID hardcoding across 4+ files. New advertisers using event tracking (e.g., Appsflyer, Adjust) would require code changes.

**How to apply:**
- Use `session.advertiserType` for feature gating (not UUID comparison)
- Use `session.typeConfig` for dynamic config (funnel_events, provider, etc.)
- Routes: `/advertiser/events` (not millie-events), `/api/advertiser/events`
- Old millie-events paths have redirect stubs for backward compat
- DB: `advertiser_type` column with CHECK constraint, `type_config` JSONB
