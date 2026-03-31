'use client'

import { useState, useEffect } from 'react'
import { useProgram } from '../ProgramContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Gift, Trophy, Zap, CheckCircle2, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface Event {
  id: string
  advertiser_id: string
  title: string
  description: string | null
  promotion_type: 'event' | 'bonus' | 'ranking'
  reward_description: string | null
  start_date: string | null
  end_date: string | null
  status: string
  participated: boolean
  created_at: string
}

const TYPE_CONFIG = {
  event: {
    label: '이벤트',
    icon: Gift,
    color: 'bg-purple-100 text-purple-700',
    bg: 'from-purple-50 to-indigo-50 border-purple-200',
    iconColor: 'text-purple-500',
    btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    emoji: '🎉',
  },
  bonus: {
    label: '보너스',
    icon: Zap,
    color: 'bg-green-100 text-green-700',
    bg: 'from-green-50 to-emerald-50 border-green-200',
    iconColor: 'text-green-500',
    btnColor: 'bg-green-600 hover:bg-green-700 text-white',
    emoji: '💰',
  },
  ranking: {
    label: '랭킹',
    icon: Trophy,
    color: 'bg-orange-100 text-orange-700',
    bg: 'from-orange-50 to-amber-50 border-orange-200',
    iconColor: 'text-orange-500',
    btnColor: 'bg-orange-500 hover:bg-orange-600 text-white',
    emoji: '🏆',
  },
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getDaysLeft(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function EventsPage() {
  const { selectedProgram, loading: programLoading } = useProgram()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [participating, setParticipating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (programLoading) return
    fetchEvents()
  }, [selectedProgram, programLoading])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const url = selectedProgram
        ? `/api/partner/events?advertiser_id=${selectedProgram.advertiser_id}`
        : '/api/partner/events'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleParticipate = async (eventId: string) => {
    setParticipating(eventId)
    try {
      const res = await fetch('/api/partner/events/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotion_id: eventId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('이벤트 참여가 완료되었습니다!')
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, participated: true } : e))
      } else {
        toast.error(data.error || '참여에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setParticipating(null)
  }

  if (programLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse h-40 bg-slate-100 rounded-xl" />
        ))}
      </div>
    )
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
        <div className="space-y-4">
          {events.map((event) => {
            const config = TYPE_CONFIG[event.promotion_type]
            const Icon = config.icon
            const isExpanded = expanded === event.id
            const daysLeft = getDaysLeft(event.end_date)

            return (
              <div
                key={event.id}
                className={`rounded-xl border bg-gradient-to-br ${config.bg} overflow-hidden transition-all`}
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl shrink-0 mt-0.5">{config.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={config.color}>{config.label}</Badge>
                        {event.participated && (
                          <Badge className="bg-indigo-100 text-indigo-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            참여 완료
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{event.title}</h3>

                      {/* Reward */}
                      {event.reward_description && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Gift className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">{event.reward_description}</span>
                        </div>
                      )}

                      {/* Dates */}
                      {(event.start_date || event.end_date) && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {event.start_date && formatDate(event.start_date)}
                            {event.start_date && event.end_date && ' ~ '}
                            {event.end_date && formatDate(event.end_date)}
                          </span>
                          {daysLeft !== null && daysLeft > 0 && (
                            <span className="text-xs font-medium text-orange-600 ml-1">
                              D-{daysLeft}
                            </span>
                          )}
                          {daysLeft !== null && daysLeft <= 0 && (
                            <span className="text-xs font-medium text-slate-400 ml-1">종료됨</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description toggle */}
                  {event.description && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : event.id)}
                      className="mt-3 flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-4 h-4" />내용 접기</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" />내용 보기</>
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded description */}
                {isExpanded && event.description && (
                  <div className="px-5 pb-4">
                    <div className="bg-white/60 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {event.description}
                    </div>
                  </div>
                )}

                {/* Participate button */}
                <div className="px-5 pb-5">
                  {event.participated ? (
                    <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      참여 완료했습니다
                    </div>
                  ) : (
                    <Button
                      className={config.btnColor}
                      onClick={() => handleParticipate(event.id)}
                      disabled={participating === event.id}
                    >
                      {participating === event.id ? '처리 중...' : '신청하기'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
