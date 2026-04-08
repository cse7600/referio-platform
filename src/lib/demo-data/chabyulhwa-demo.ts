/**
 * DEMO[chabyulhwa] - 차별화상회의 시연용 더미 데이터
 * 삭제 방법: 이 파일과 import 하는 코드 제거
 */

// ── 상수 ──
const FAMILY_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const GIVEN_NAMES = ['지연', '민준', '수현', '현우', '은지', '동현', '진아', '성훈', '재민', '준호', '영희', '혜원', '아름', '나리', '유진', '선호', '태영', '우석', '기현', '대원', '승민', '예린', '하은', '찬호', '도현', '미래', '서윤', '정원', '경민', '혜진'];
const CHANNELS = ['블로그', 'SNS', '유튜브', '인스타그램', '강사', '커뮤니티', '네이버카페', '직접영업'];

function r(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(r(seed) * arr.length)];
}

// ── 파트너 100명 생성 ──
export interface DemoPartner {
  id: string;
  name: string;
  status: 'approved' | 'pending' | 'rejected';
  tier: 'authorized' | 'silver' | 'gold';
  referral_code: string;
  channels: string[] | null;
  main_channel_link: string | null;
  is_active_partner: boolean;
  activity_link: string | null;
  memo: string | null;
  created_at: string;
  program_created_at: string;
  monthly_lead_count: number;
  monthly_contract_count: number;
  total_lead_count: number;
  total_contract_count: number;
  bank_name: string | null;
  bank_account: string | null;
  account_holder: string | null;
  ssn_encrypted: string | null;
  phone: string | null;
  email: string | null;
  lead_commission: number;
  contract_commission: number;
  program_id: string;
  applied_at: string;
  approved_at: string | null;
}

const BASE_DATE = new Date('2025-09-01');

function daysAgo(days: number): string {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const DEMO_PARTNERS: DemoPartner[] = Array.from({ length: 100 }, (_, i) => {
  const idx = i + 1;
  const seed = idx * 13;
  const statusRoll = r(seed);
  const status: 'approved' | 'pending' | 'rejected' =
    idx <= 70 ? 'approved' : idx <= 90 ? 'pending' : 'rejected';
  const tier: 'authorized' | 'silver' | 'gold' =
    idx <= 10 ? 'gold' : idx <= 35 ? 'silver' : 'authorized';
  const name = pick(FAMILY_NAMES, seed) + pick(GIVEN_NAMES, seed + 5);
  const appliedDays = Math.floor(r(seed + 1) * 180);
  const approvedDays = status === 'approved' ? appliedDays + 3 : null;
  const totalLeads = status === 'approved' ? Math.floor(r(seed + 2) * 80 + 5) : 0;
  const totalContracts = status === 'approved' ? Math.floor(totalLeads * (r(seed + 3) * 0.5 + 0.1)) : 0;
  const monthlyLeads = status === 'approved' ? Math.floor(r(seed + 4) * 15) : 0;

  return {
    id: `demo-partner-${idx.toString().padStart(3, '0')}`,
    name,
    status,
    tier,
    referral_code: `CBH_${idx.toString().padStart(3, '0')}`,
    channels: [pick(CHANNELS, seed + 6)],
    main_channel_link: null,
    is_active_partner: status === 'approved',
    activity_link: null,
    memo: null,
    created_at: daysAgo(appliedDays),
    program_created_at: daysAgo(appliedDays),
    monthly_lead_count: monthlyLeads,
    monthly_contract_count: Math.floor(monthlyLeads * (r(seed + 7) * 0.4 + 0.1)),
    total_lead_count: totalLeads,
    total_contract_count: totalContracts,
    bank_name: status === 'approved' ? '국민은행' : null,
    bank_account: status === 'approved' ? `123456-78-${(idx * 9871).toString().slice(0, 6)}` : null,
    account_holder: status === 'approved' ? name : null,
    ssn_encrypted: null,
    phone: status === 'approved' ? `010-${(1000 + Math.floor(r(seed + 8) * 9000)).toString()}-${(1000 + Math.floor(r(seed + 9) * 9000)).toString()}` : null,
    email: status === 'approved' ? `partner${idx}@gmail.com` : null,
    lead_commission: 5000,
    contract_commission: 30000,
    program_id: `demo-program-${idx.toString().padStart(3, '0')}`,
    applied_at: daysAgo(appliedDays),
    approved_at: approvedDays !== null ? daysAgo(approvedDays) : null,
  };
});

// ── 정산 70명 ──
export interface DemoSettlementGroup {
  partner_id: string;
  partner_name: string;
  partner_email: string;
  bank_name: string | null;
  bank_account: string | null;
  account_holder: string | null;
  has_ssn: boolean;
  total_amount: number;
  pending_amount: number;
  settlement_count: number;
  settlements: DemoSettlementItem[];
}

export interface DemoSettlementItem {
  id: string;
  type: string | null;
  referral_id: string | null;
  referral_name: string | null;
  amount: number;
  status: 'pending' | 'completed';
  settled_at: string | null;
  note: string | null;
  created_at: string;
}

export const DEMO_SETTLEMENTS: DemoSettlementGroup[] = DEMO_PARTNERS.filter(p => p.status === 'approved').map((p, i) => {
  const seed = i * 17 + 3;
  const count = Math.floor(r(seed) * 8 + 1);
  const amountPerItem = Math.floor(r(seed + 1) * 50000 + 10000);
  const completedCount = Math.floor(count * r(seed + 2));

  const items: DemoSettlementItem[] = Array.from({ length: count }, (_, j) => {
    const isCompleted = j < completedCount;
    return {
      id: `demo-settle-${p.id}-${j}`,
      type: 'first_purchase',
      referral_id: null,
      referral_name: null,
      amount: amountPerItem,
      status: isCompleted ? 'completed' : 'pending',
      settled_at: isCompleted ? daysAgo(i + j * 2 + 5) : null,
      note: null,
      created_at: daysAgo(i + j * 3 + 10),
    };
  });

  const totalAmount = items.reduce((s, it) => s + it.amount, 0);
  const pendingAmount = items.filter(it => it.status === 'pending').reduce((s, it) => s + it.amount, 0);

  return {
    partner_id: p.id,
    partner_name: p.name,
    partner_email: p.email ?? `partner${i + 1}@gmail.com`,
    bank_name: p.bank_name,
    bank_account: p.bank_account,
    account_holder: p.account_holder,
    has_ssn: false,
    total_amount: totalAmount,
    pending_amount: pendingAmount,
    settlement_count: count,
    settlements: items,
  };
});

// ── 정산 통계 ──
export const DEMO_SETTLEMENT_STATS = {
  totalPartners: DEMO_SETTLEMENTS.length,
  totalPending: DEMO_SETTLEMENTS.filter(g => g.pending_amount > 0).length,
  totalPendingAmount: DEMO_SETTLEMENTS.reduce((s, g) => s + g.pending_amount, 0),
  totalCompleted: DEMO_SETTLEMENTS.filter(g => g.pending_amount === 0).length,
  totalCompletedAmount: DEMO_SETTLEMENTS.reduce((s, g) => s + g.total_amount - g.pending_amount, 0),
};

// ── 이벤트 현황 ──
const TOTAL_SIGNUP = 1247;
const TOTAL_FIRST_PURCHASE = 384;

export const DEMO_EVENTS_DATA = {
  funnel_events: ['sign_up', 'first_purchase'],
  funnel: {
    sign_up: TOTAL_SIGNUP,
    first_purchase: TOTAL_FIRST_PURCHASE,
    sign_up_to_first_purchase: Math.round((TOTAL_FIRST_PURCHASE / TOTAL_SIGNUP) * 1000) / 10,
  },
  partners: DEMO_PARTNERS.filter(p => p.status === 'approved').slice(0, 20).map((p, i) => {
    const seed = i * 11 + 7;
    const signups = Math.floor(r(seed) * 80 + 5);
    const purchases = Math.floor(signups * (r(seed + 1) * 0.4 + 0.1));
    return {
      sub_id: p.referral_code,
      partner_name: p.name,
      event_counts: {
        sign_up: signups,
        first_purchase: purchases,
      },
      conversion_rate: signups > 0 ? Math.round((purchases / signups) * 1000) / 10 : 0,
      settlement_amount: purchases * 30000,
    };
  }),
  recent_events: Array.from({ length: 20 }, (_, i) => {
    const seed = i * 7 + 1;
    const isSignup = r(seed) > 0.3;
    const partnerIdx = Math.floor(r(seed + 1) * 20);
    const partner = DEMO_PARTNERS[partnerIdx];
    return {
      id: `demo-event-${i}`,
      event_type: isSignup ? 'sign_up' : 'first_purchase',
      user_identifier: `user_${(100000 + Math.floor(r(seed + 2) * 900000)).toString()}`,
      sub_id: partner.referral_code,
      partner_name: partner.name,
      created_at: new Date(Date.now() - i * 1000 * 60 * (Math.floor(r(seed + 3) * 120) + 5)).toISOString(),
    };
  }),
};

// ── 대시보드 통계 ──
export const DEMO_DASHBOARD_STATS = {
  totalPartners: 100,
  activePartners: 70,
  totalSettlements: DEMO_SETTLEMENTS.length,
  pendingSettlements: DEMO_SETTLEMENTS.filter(g => g.pending_amount > 0).length,
  thisMonthSettlementAmount: Math.floor(DEMO_SETTLEMENT_STATS.totalPendingAmount * 0.3),
  totalSignups: TOTAL_SIGNUP,
  totalFirstPurchase: TOTAL_FIRST_PURCHASE,
  conversionRate: Math.round((TOTAL_FIRST_PURCHASE / TOTAL_SIGNUP) * 1000) / 10,
};
