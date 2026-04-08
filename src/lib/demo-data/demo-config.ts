/**
 * DEMO[sales-demo] — 광고주 세일즈 시연 모드 Config 타입 & 레지스트리
 *
 * 새 광고주 추가 방법:
 *   1. src/lib/demo-data/configs/{advertiserId}.ts 파일 생성
 *   2. DEMO_REGISTRY에 항목 추가
 *   3. 끝 — DB 변경 불필요
 *
 * 전체 제거 방법:
 *   DEMO_REGISTRY 비우거나, DEMO[sales-demo] 태그 검색 후 일괄 삭제
 */

// ── 퍼널 이벤트 정의 ──
export interface FunnelEventDef {
  key: string       // tracking_events.event_type 값 (예: 'sign_up')
  label: string     // UI 표시명 (예: '가입')
  badgeColor: string // Tailwind 클래스 (예: 'bg-blue-50 text-blue-700 border-blue-200')
}

// ── 광고주별 시연 설정 ──
export interface AdvertiserDemoConfig {
  advertiserId: string          // advertisers.advertiser_id 값
  companyName: string           // 표시용 회사명
  funnelEvents: FunnelEventDef[] // 순서 중요 — 첫 번째가 상위 퍼널
  leadLabel: string             // "리드" 대체 용어 (첫 번째 이벤트 레이블)
  contractLabel: string         // "계약" 대체 용어 (마지막 이벤트 레이블)
  partnerCount: number          // 총 파트너 수
  approvedCount: number         // 승인된 파트너 수 (= 정산 대상)
  topFunnelTotal: number        // 상위 퍼널 총 이벤트 수
  bottomFunnelTotal: number     // 하위 퍼널 총 이벤트 수
}

// ── 등록된 시연 광고주 목록 ──
// DEMO[sales-demo] — 시연 광고주 추가/제거는 여기서만
import { CHABYULHWA_DEMO_CONFIG } from './configs/chabyulhwa'
import { MILLIE_DEMO_CONFIG } from './configs/millie'

export const DEMO_REGISTRY: Record<string, AdvertiserDemoConfig> = {
  chabyulhwa: CHABYULHWA_DEMO_CONFIG,
  millie: MILLIE_DEMO_CONFIG,
}

/** 해당 광고주가 시연 모드를 지원하는지 확인 */
export function isDemoSupported(advertiserId: string): boolean {
  return advertiserId in DEMO_REGISTRY
}

/** 광고주 시연 설정 조회 (없으면 undefined) */
export function getDemoConfig(advertiserId: string): AdvertiserDemoConfig | undefined {
  return DEMO_REGISTRY[advertiserId]
}
