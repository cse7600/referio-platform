export type PartnerStatus = 'pending' | 'approved' | 'rejected'
export type PartnerTier = 'authorized' | 'silver' | 'gold' | 'platinum'
export type ContractStatus = 'pending' | 'call_1' | 'call_2' | 'call_3' | 'completed' | 'invalid' | 'duplicate'
export type SettlementStatus = 'pending' | 'completed' | 'rejected'
export type SettlementType = 'contract' | 'valid'
export type AdvertiserStatus = 'active' | 'suspended' | 'inactive'
export type AdvertiserType = 'inquiry' | 'event_tracking' | 'hybrid'

export interface EventTrackingConfig {
  provider: 'airbridge' | 'appsflyer' | 'adjust';
  funnel_events: string[];
  conversion_event: string;
  settlement_trigger: 'auto';
  link_type: 'tracking_link';
}

export type TypeConfig = EventTrackingConfig | Record<string, never>

// 광고주
export interface Advertiser {
  id: string
  advertiser_id: string // 광고주 고유 ID (예: hanwha_vision)
  company_name: string
  user_id: string // 로그인용 사용자 ID
  password_hash: string // bcrypt로 해시된 비밀번호
  status: AdvertiserStatus
  logo_url: string | null
  primary_color: string | null // 브랜드 색상
  contact_email: string | null
  contact_phone: string | null
  program_name: string | null
  program_description: string | null
  default_lead_commission: number
  default_contract_commission: number
  advertiser_type: AdvertiserType
  type_config: TypeConfig
  is_public: boolean
  category: string | null
  homepage_url: string | null
  activity_guide: string | null
  content_sources: string | null
  prohibited_activities: string | null
  precautions: string | null
  created_at: string
  updated_at: string
}

// 광고주 사용자 세션
export interface AdvertiserSession {
  id: string
  advertiser_id: string
  token: string
  expires_at: string
  created_at: string
}

export interface Partner {
  id: string
  advertiser_id: string // 소속 광고주
  name: string
  phone: string | null
  email: string
  status: PartnerStatus
  referral_code: string
  referral_url: string
  main_channel_link: string | null
  channels: string[] | null
  bank_name: string | null
  bank_account: string | null
  account_holder: string | null
  ssn_encrypted: string | null
  tier: PartnerTier
  tier_evaluated_at: string | null
  lead_commission: number
  contract_commission: number
  monthly_fee: number
  marketing_consent: boolean
  created_at: string
  auth_user_id: string | null
}

// 프로그램 (광고주당 N개 가능 — migration 022에서 advertisers에서 분리)
export interface Program {
  id: string
  advertiser_id: string
  name: string
  description: string | null
  category: string | null
  homepage_url: string | null
  landing_url: string | null
  activity_guide: string | null
  content_sources: string | null
  prohibited_activities: string | null
  precautions: string | null
  default_lead_commission: number
  default_contract_commission: number
  is_active: boolean
  is_public: boolean
  created_at: string
  updated_at: string
}

// 파트너 프로그램 (다대다 관계)
export interface PartnerProgram {
  id: string
  partner_id: string
  advertiser_id: string
  program_id: string | null // migration 022 이후 추가. 기존 레코드는 NULL
  status: PartnerStatus
  tier: PartnerTier
  referral_code: string
  lead_commission: number
  contract_commission: number
  monthly_fee: number
  tracking_link_url: string | null
  applied_at: string
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Referral {
  id: string
  advertiser_id: string | null // 소속 광고주
  name: string
  name_masked?: string
  phone: string | null
  referral_code_input: string | null
  partner_id: string | null
  sales_rep: string | null
  contract_status: ContractStatus
  is_valid: boolean | null
  contracted_at: string | null
  inquiry: string | null
  channel: string | null // marketing channel tag (e.g. blog, youtube)
  created_at: string
}

export interface Settlement {
  id: string
  advertiser_id: string | null // 소속 광고주
  type?: SettlementType
  partner_id: string
  referral_id: string | null
  amount: number
  status: 'pending' | 'completed'
  settled_at: string | null
  note: string | null
  created_at: string
}

export interface PartnerStats {
  partner_id: string
  total_referrals: number
  total_valid: number
  total_contracts: number
  total_settlement: number
}

// 캠페인 설정
export interface Campaign {
  id: string
  advertiser_id: string | null // 소속 광고주
  name: string
  is_active: boolean
  valid_amount: number
  contract_amount: number
  tier_pricing_enabled: boolean
  landing_url: string | null
  commission_rate: number
  min_settlement: number
  duplicate_check_days: number
  valid_deadline_days: number
  contract_deadline_days: number
  created_at: string
  updated_at: string
}

// 프로모션
export type TargetPartners = 'all' | 'new' | `tier:${PartnerTier}`

export interface Promotion {
  id: string
  campaign_id: string
  name: string
  start_date: string
  end_date: string
  valid_bonus: number
  contract_bonus: number
  target_count: number | null
  target_bonus: number | null
  target_partners: TargetPartners
  is_active: boolean
  created_at: string
}

// 티어별 단가 규칙
export interface TierRule {
  id: string
  campaign_id: string
  tier: PartnerTier
  min_contracts: number
  valid_amount: number | null
  contract_amount: number | null
  created_at: string
}

// SaaS 구독 플랜
export type SubscriptionPlanName = 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due'

export interface SubscriptionPlanFeatures {
  dashboard?: boolean
  basic_report?: boolean
  detailed_report?: boolean
  custom_landing?: boolean
  priority_settlement?: boolean
  api_access?: boolean
  dedicated_manager?: boolean
}

export interface SubscriptionPlan {
  id: string
  name: SubscriptionPlanName
  display_name: string
  monthly_price: number
  commission_rate: number
  monthly_db_limit: number | null
  custom_landing_count: number | null
  features: SubscriptionPlanFeatures
  is_active: boolean
  sort_order: number
  created_at: string
}

// 파트너별 구독 상태
export interface PartnerSubscription {
  id: string
  partner_id: string
  plan_id: string
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  monthly_db_used: number
  created_at: string
  updated_at: string
}

// 웹훅 연동 설정
export type WebhookSource = 'recatch' | 'salesmap' | 'custom'

export interface WebhookIntegration {
  id: string
  advertiser_id: string
  name: string
  source: WebhookSource
  api_key: string
  api_secret: string
  webhook_url: string | null
  is_active: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

// 파트너 API 키
export interface PartnerApiKey {
  id: string
  partner_id: string
  advertiser_id: string
  name: string
  api_key: string
  rate_limit_monthly: number
  requests_this_month: number
  last_used_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// API 사용량 로그
export type ApiSourceType = 'partner_api' | 'webhook'

export interface ApiUsageLog {
  id: string
  source_type: ApiSourceType
  source_id: string | null
  endpoint: string | null
  method: string | null
  status_code: number | null
  ip_address: string | null
  user_agent: string | null
  request_body: Record<string, unknown> | null
  response_summary: string | null
  created_at: string
}

// 파트너 메시지
export interface PartnerMessage {
  id: string
  advertiser_id: string
  title: string
  body: string
  target_type: 'all' | 'tier' | 'specific'
  target_tier: string | null
  target_partner_ids: string[] | null
  sent_at: string
}

export interface PartnerMessageRead {
  id: string
  message_id: string
  partner_id: string
  read_at: string
}

// 브랜디드 콘텐츠 협업
export type ContentType = 'blog' | 'youtube' | 'instagram' | 'tiktok' | 'other'
export type CollabStatus = 'requested' | 'accepted' | 'in_progress' | 'submitted' | 'revision' | 'completed' | 'paid' | 'declined' | 'cancelled'

export interface ContentCollaboration {
  id: string
  advertiser_id: string
  partner_id: string
  title: string
  brief: string
  content_type: ContentType
  budget: number
  platform_fee_rate: number
  platform_fee: number
  partner_payout: number
  deadline: string | null
  status: CollabStatus
  deliverable_url: string | null
  deliverable_note: string | null
  decline_reason: string | null
  cancel_reason: string | null
  requested_at: string
  accepted_at: string | null
  submitted_at: string | null
  completed_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface CollaborationMessage {
  id: string
  collaboration_id: string
  sender_type: 'advertiser' | 'partner'
  sender_id: string
  message: string
  created_at: string
}

// 파트너 추천 링크
export interface PartnerLink {
  id: string
  partner_id: string
  advertiser_id: string
  name: string
  base_url: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  short_code: string | null
  is_active: boolean
  click_count: number
  created_at: string
  updated_at: string
}
