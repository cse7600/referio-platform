/**
 * DEMO[sales-demo] — 밀리의서재 시연 설정
 */
import type { AdvertiserDemoConfig } from '../demo-config';

export const MILLIE_DEMO_CONFIG: AdvertiserDemoConfig = {
  advertiserId: 'millie',
  companyName: '밀리의서재',
  funnelEvents: [
    { key: 'app_install', label: '앱설치', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'subscribe', label: '구독', badgeColor: 'bg-green-50 text-green-700 border-green-200' },
  ],
  leadLabel: '앱설치',
  contractLabel: '구독',
  partnerCount: 100,
  approvedCount: 70,
  topFunnelTotal: 4821,
  bottomFunnelTotal: 1247,
};
