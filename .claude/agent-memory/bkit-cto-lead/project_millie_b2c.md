---
name: millie-b2c-event-tracking
description: Millie advertiser uses B2C event tracking (install/sign_up/subscribe funnel via Airbridge) instead of B2B manual referral management
type: project
---

Millie (advertiser_id: millie, UUID: e6d1acf7-2288-46e1-b50a-53f368366f9f) uses a completely different model from other advertisers.

**Why:** Millie is a B2C app (ebook subscription). No customer names/phones — only device_id/user_id tracking via Airbridge postbacks. Events are automated, no manual status changes by staff.

**How to apply:**
- When touching webhook/airbridge code, remember the 3-stage funnel: install (log only) -> sign_up (create referral) -> subscribe (complete referral -> settlement trigger)
- Millie sidebar shows "이벤트 현황" instead of "고객 관리"
- is_public must stay false forever
- Referrals for millie use user_identifier in the name field (not actual human names)
