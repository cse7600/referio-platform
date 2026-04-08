/**
 * DEMO[sales-demo] — 차별화상회 시연 설정
 */
import type { AdvertiserDemoConfig } from '../demo-config';

export const CHABYULHWA_DEMO_CONFIG: AdvertiserDemoConfig = {
  advertiserId: 'chabyulhwa',
  companyName: '차별화상회',
  funnelEvents: [
    { key: 'sign_up', label: '가입', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'first_purchase', label: '첫구매', badgeColor: 'bg-orange-50 text-orange-700 border-orange-200' },
  ],
  leadLabel: '가입',
  contractLabel: '첫구매',
  partnerCount: 100,
  approvedCount: 70,
  topFunnelTotal: 1247,
  bottomFunnelTotal: 384,
};
