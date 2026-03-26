// GTM Container: GTM-K7NZSXZ3
// GA4 Measurement ID: G-52G9C0DC1K

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function push(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

// Core conversion events for Referio B2B affiliate platform

/** 파트너가 고객 상담 신청 제출 완료 — 가장 핵심 전환 이벤트 */
export function trackInquirySubmit(params: {
  advertiser_id: string;
  referral_code?: string;
}) {
  push({
    event: 'inquiry_submit',
    advertiser_id: params.advertiser_id,
    referral_code: params.referral_code || null,
  });
}

/** 파트너 신규 가입 완료 */
export function trackPartnerSignup() {
  push({ event: 'partner_signup' });
}

/** 파트너 로그인 성공 */
export function trackPartnerLogin() {
  push({ event: 'partner_login' });
}

/** 파트너가 추천 링크를 클립보드에 복사 */
export function trackReferralLinkCopy(params: {
  advertiser_id: string;
  referral_code: string;
}) {
  push({
    event: 'referral_link_copy',
    advertiser_id: params.advertiser_id,
    referral_code: params.referral_code,
  });
}

/** 광고주 신규 가입 완료 */
export function trackAdvertiserSignup() {
  push({ event: 'advertiser_signup' });
}
