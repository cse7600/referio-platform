'use client';

// DEMO[sales-demo]
import { useDemoMode } from '@/contexts/demo-mode-context';
import { DEMO_EVENTS_DATA as CHABYULHWA_EVENTS } from '@/lib/demo-data/chabyulhwa-demo';
import { DEMO_EVENTS_DATA as MILLIE_EVENTS } from '@/lib/demo-data/millie-demo';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface PartnerData {
  sub_id: string;
  partner_name: string;
  event_counts: Record<string, number>;
  conversion_rate: number;
  settlement_amount: number;
}

interface RecentEvent {
  id: string;
  event_type: string;
  user_identifier: string;
  sub_id: string | null;
  partner_name: string | null;
  created_at: string;
}

interface EventsData {
  funnel_events: string[];
  funnel: Record<string, number>;
  partners: PartnerData[];
  recent_events: RecentEvent[];
}

// Display labels for known event types
const EVENT_LABELS: Record<string, string> = {
  install: '설치',
  sign_up: '가입',
  subscribe: '구독',
  purchase: '구매',
  registration: '등록',
  first_purchase: '첫구매', // DEMO[chabyulhwa]
  app_install: '앱설치', // DEMO[sales-demo] millie
};

// Colors for funnel cards
const FUNNEL_COLORS: string[] = [
  'text-slate-900',
  'text-blue-600',
  'text-green-600',
  'text-orange-500',
  'text-purple-600',
];

function getEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] || eventType;
}

export default function EventsPage() {
  // DEMO[sales-demo]
  const { advertiserId, isDemoMode } = useDemoMode();
  const isDemo = isDemoMode && (advertiserId === 'chabyulhwa' || advertiserId === 'millie');

  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // DEMO[sales-demo] — API 호출 없이 더미 데이터 사용
    if (isDemo) {
      const eventsData = advertiserId === 'millie' ? MILLIE_EVENTS : CHABYULHWA_EVENTS;
      setData(eventsData as EventsData);
      setLoading(false);
      return;
    }
    fetchEvents();
  }, [isDemo]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/advertiser/events');
      if (!response.ok) {
        if (response.status === 403) {
          setError('이벤트 현황은 이벤트 추적형 광고주만 사용할 수 있습니다.');
        } else {
          setError('데이터를 불러오는데 실패했습니다.');
        }
        return;
      }
      const result = await response.json();
      setData(result);
    } catch {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { funnel_events, funnel, partners, recent_events } = data;

  // Build conversion rate keys
  const conversionKeys: { key: string; label: string }[] = [];
  for (let i = 1; i < funnel_events.length; i++) {
    const prev = funnel_events[i - 1];
    const curr = funnel_events[i];
    conversionKeys.push({
      key: `${prev}_to_${curr}`,
      label: `${getEventLabel(prev)} → ${getEventLabel(curr)}`,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">이벤트 현황</h1>
        <p className="text-sm text-slate-500 mt-1">트래킹 이벤트 실시간 집계</p>
      </div>

      {/* Funnel Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {funnel_events.map((event, idx) => (
          <Card key={event} className="p-4">
            <p className="text-xs text-slate-500 mb-1">총 {getEventLabel(event)}</p>
            <p className={`text-2xl font-bold ${FUNNEL_COLORS[idx % FUNNEL_COLORS.length]}`}>
              {(funnel[event] || 0).toLocaleString()}
            </p>
          </Card>
        ))}
        {conversionKeys.map((ck) => (
          <Card key={ck.key} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{ck.label}</p>
            <p className="text-2xl font-bold text-orange-500">
              {funnel[ck.key] || 0}%
            </p>
          </Card>
        ))}
      </div>

      {/* Partner Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">파트너별 이벤트</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>파트너명</TableHead>
                <TableHead>추천코드</TableHead>
                {funnel_events.map((event) => (
                  <TableHead key={event} className="text-right">
                    {getEventLabel(event)}
                  </TableHead>
                ))}
                <TableHead className="text-right">전환율</TableHead>
                <TableHead className="text-right">정산금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <TableRow key={p.sub_id}>
                  <TableCell className="font-medium">{p.partner_name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">{p.sub_id}</code>
                  </TableCell>
                  {funnel_events.map((event, idx) => (
                    <TableCell
                      key={event}
                      className={`text-right ${idx > 0 ? `${FUNNEL_COLORS[idx % FUNNEL_COLORS.length]} font-medium` : ''}`}
                    >
                      {(p.event_counts[event] || 0).toLocaleString()}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{p.conversion_rate}%</TableCell>
                  <TableCell className="text-right">
                    {p.settlement_amount > 0
                      ? `${p.settlement_amount.toLocaleString()}원`
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={funnel_events.length + 4} className="text-center text-slate-400 py-8">
                    아직 이벤트 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Events Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">최근 이벤트</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이벤트</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>파트너</TableHead>
                <TableHead>발생 시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent_events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <EventBadge type={event.event_type} />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-slate-500">{event.user_identifier}</code>
                  </TableCell>
                  <TableCell>
                    {event.partner_name ? (
                      <span className="text-sm">{event.partner_name}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDate(event.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {recent_events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    아직 이벤트가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const label = getEventLabel(type);
  switch (type) {
    case 'install':
      return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{label}</Badge>;
    case 'sign_up':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{label}</Badge>;
    case 'subscribe':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{label}</Badge>;
    case 'first_purchase': // DEMO[chabyulhwa]
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{label}</Badge>;
    case 'app_install': // DEMO[sales-demo] millie
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
