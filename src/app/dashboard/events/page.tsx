'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProgram } from '../ProgramContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Gift, Trophy, Zap, CheckCircle2, Calendar, ChevronDown, ChevronUp, Camera } from 'lucide-react'

interface Event {
  id: string
  advertiser_id: string
  title: string
  description: string | null
  promotion_type: 'event' | 'bonus' | 'ranking' | 'post_verification'
  reward_description: string | null
  start_date: string | null
  end_date: string | null
  status: string
  participated: boolean
  banner_image_url: string | null
  banner_bg_color: string | null
  event_link_url: string | null
  created_at: string
}

interface PostVerificationState {
  eventId: string
  postUrl: string
  postNote: string
  submitting: boolean
}

const TYPE_CONFIG = {
  event: {
    label: '이벤트',
    icon: Gift,
    badgeColor: 'bg-purple-100 text-purple-700',
    bgColor: '#f5f3ff',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-500',
    btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    emoji: '🎉',
  },
  bonus: {
    label: '보너스',
    icon: Zap,
    badgeColor: 'bg-green-100 text-green-700',
    bgColor: '#f0fdf4',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-500',
    btnColor: 'bg-green-600 hover:bg-green-700 text-white',
    emoji: '💰',
  },
  ranking: {
    label: '랭킹',
    icon: Trophy,
    badgeColor: 'bg-orange-100 text-orange-700',
    bgColor: '#fff7ed',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    btnColor: 'bg-orange-500 hover:bg-orange-600 text-white',
    emoji: '🏆',
  },
  post_verification: {
    label: '게시물 인증',
    icon: Camera,
    badgeColor: 'bg-sky-100 text-sky-700',
    bgColor: '#f0f9ff',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-500',
    btnColor: 'bg-sky-600 hover:bg-sky-700 text-white',
    emoji: '📸',
  },
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDaysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function EventsPage() {
  const { selectedProgram, loading: programLoading } = useProgram()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [participating, setParticipating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [postModal, setPostModal] = useState<PostVerificationState | null>(null)

  useEffect(() => {
    if (programLoading) return;
    fetchEvents();
  }, [selectedProgram, programLoading])

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const url = selectedProgram
        ? `/api/partner/events?advertiser_id=${selectedProgram.advertiser_id}`
        : '/api/partner/events';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  // Optimistic participation: mark as participated immediately, rollback on failure
  const handleParticipate = async (eventId: string) => {
    setParticipating(eventId);
    // Optimistic update
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, participated: true } : e));
    try {
      const res = await fetch('/api/partner/events/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotion_id: eventId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('이벤트 참여가 완료되었습니다!');
      } else {
        // Rollback on API error
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, participated: false } : e));
        toast.error(data.error || '참여에 실패했습니다');
      }
    } catch {
      // Rollback on network error
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, participated: false } : e));
      toast.error('서버 오류가 발생했습니다');
    }
    setParticipating(null);
  }

  const handlePostVerificationSubmit = async () => {
    if (!postModal) return;
    if (!postModal.postUrl.trim()) {
      toast.error('게시물 URL을 입력해주세요');
      return;
    }
    setPostModal(prev => prev ? { ...prev, submitting: true } : null);
    // Optimistic update
    setEvents(prev => prev.map(e => e.id === postModal.eventId ? { ...e, participated: true } : e));
    try {
      const res = await fetch('/api/partner/events/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotion_id: postModal.eventId,
          post_url: postModal.postUrl.trim(),
          post_note: postModal.postNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('게시물 인증이 제출되었습니다!');
        setPostModal(null);
      } else {
        // Rollback
        setEvents(prev => prev.map(e => e.id === postModal.eventId ? { ...e, participated: false } : e));
        setPostModal(prev => prev ? { ...prev, submitting: false } : null);
        toast.error(data.error || '제출에 실패했습니다');
      }
    } catch {
      // Rollback
      setEvents(prev => prev.map(e => e.id === postModal.eventId ? { ...e, participated: false } : e));
      setPostModal(prev => prev ? { ...prev, submitting: false } : null);
      toast.error('서버 오류가 발생했습니다');
    }
  }

  const openPostModal = (eventId: string) => {
    setPostModal({ eventId, postUrl: '', postNote: '', submitting: false });
  }

  if (programLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse h-32 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">이벤트</h1>
        <p className="text-sm text-slate-500 mt-1">
          {selectedProgram
            ? `${(selectedProgram.advertisers as unknown as { company_name: string }).company_name}의 진행 중인 이벤트`
            : '참여 중인 모든 프로그램의 진행 중인 이벤트'}
        </p>
      </div>

      {events.length === 0 ? (
        <Card className="py-20">
          <CardContent className="text-center text-slate-500">
            <div className="text-5xl mb-4">🎪</div>
            <p className="font-medium">진행 중인 이벤트가 없습니다</p>
            <p className="text-sm mt-1">새로운 이벤트가 시작되면 알려드릴게요!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const config = TYPE_CONFIG[event.promotion_type] ?? TYPE_CONFIG.event;
            const Icon = config.icon;
            const isExpanded = expanded === event.id;
            const daysLeft = getDaysLeft(event.end_date);
            const bgColor = event.banner_bg_color || config.bgColor;

            return (
              <div
                key={event.id}
                className="rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all"
                style={{ backgroundColor: bgColor }}
              >
                {/* Banner row — click to open detail page */}
                <div
                  className="flex items-stretch min-h-[128px] cursor-pointer"
                  onClick={() => router.push(`/dashboard/events/${event.id}`)}
                >
                  {/* Left: text content */}
                  <div className="flex-1 px-5 py-4 flex flex-col justify-between">
                    <div>
                      {/* Type badge + participated badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className={`text-xs ${config.badgeColor}`}>{config.label}</Badge>
                        {event.participated && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            참여 완료
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{event.title}</h3>

                      {/* Reward */}
                      {event.reward_description && (
                        <p className="text-sm text-slate-600 mt-1 leading-snug">{event.reward_description}</p>
                      )}
                    </div>

                    {/* Bottom: dates + action */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
                      {/* Date range */}
                      <div className="flex flex-col gap-0.5">
                        {(event.start_date || event.end_date) && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>
                              {event.start_date && formatDate(event.start_date)}
                              {event.start_date && event.end_date && ' ~ '}
                              {event.end_date && formatDate(event.end_date)}
                            </span>
                            {daysLeft !== null && daysLeft > 0 && (
                              <span className="font-semibold text-orange-600 ml-1">D-{daysLeft}</span>
                            )}
                            {daysLeft !== null && daysLeft <= 0 && (
                              <span className="text-slate-400 ml-1">종료됨</span>
                            )}
                          </div>
                        )}
                        <span className="text-xs text-slate-400">
                          게시 {new Date(event.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                      </div>

                      {/* Participate button */}
                      {event.participated ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          참여 완료
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className={config.btnColor}
                          onClick={(e) => {
                            e.stopPropagation()
                            event.promotion_type === 'post_verification'
                              ? openPostModal(event.id)
                              : handleParticipate(event.id)
                          }}
                          disabled={participating === event.id}
                        >
                          {participating === event.id ? '처리 중...' : '신청하기'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: image or icon */}
                  <div className="w-28 shrink-0 flex items-center justify-center">
                    {event.banner_image_url ? (
                      <img
                        src={event.banner_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
                        <span className="text-3xl select-none">{config.emoji}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description toggle */}
                {event.description && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(isExpanded ? null : event.id)
                      }}
                      className="w-full flex items-center gap-1 px-5 py-2 text-xs text-slate-500 hover:text-slate-800 border-t border-black/5 transition-colors bg-black/[0.02]"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-3.5 h-3.5" />내용 접기</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" />내용 보기</>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-2">
                        <div className="bg-white/70 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                          {event.description}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post verification modal */}
      <Dialog open={!!postModal} onOpenChange={(open) => { if (!open) setPostModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>게시물 인증 제출</DialogTitle>
            <DialogDescription>
              작성하신 게시물 URL을 입력해주세요. 검토 후 리워드가 지급됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="post-url">게시물 URL <span className="text-red-500">*</span></Label>
              <Input
                id="post-url"
                placeholder="https://blog.naver.com/..."
                value={postModal?.postUrl ?? ''}
                onChange={(e) => setPostModal(prev => prev ? { ...prev, postUrl: e.target.value } : null)}
                disabled={postModal?.submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-note">추가 메모 <span className="text-slate-400 text-xs">(선택)</span></Label>
              <Textarea
                id="post-note"
                placeholder="게시물 관련 추가 설명을 입력하세요"
                rows={3}
                value={postModal?.postNote ?? ''}
                onChange={(e) => setPostModal(prev => prev ? { ...prev, postNote: e.target.value } : null)}
                disabled={postModal?.submitting}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setPostModal(null)}
                disabled={postModal?.submitting}
              >
                취소
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                onClick={handlePostVerificationSubmit}
                disabled={postModal?.submitting}
              >
                {postModal?.submitting ? '제출 중...' : '제출하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
