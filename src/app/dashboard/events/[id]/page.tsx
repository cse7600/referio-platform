'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Gift, Trophy, Zap, CheckCircle2, Calendar, Camera, ArrowLeft } from 'lucide-react'

// SSR disabled — Tiptap requires browser APIs
const TiptapViewer = dynamic(() => import('@/components/editor/TiptapViewer'), { ssr: false })

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
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getDaysLeft(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [participating, setParticipating] = useState(false)
  const [postModal, setPostModal] = useState<PostVerificationState | null>(null)

  useEffect(() => {
    if (!id) return
    fetchEvent()
  }, [id])

  const fetchEvent = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/partner/events/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
      } else if (res.status === 404) {
        toast.error('이벤트를 찾을 수 없습니다')
        router.push('/dashboard/events')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setLoading(false)
  }

  const handleParticipate = async () => {
    if (!event) return
    setParticipating(true)
    // Optimistic update
    setEvent(prev => prev ? { ...prev, participated: true } : prev)
    try {
      const res = await fetch('/api/partner/events/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotion_id: event.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('이벤트 참여가 완료되었습니다!')
      } else {
        setEvent(prev => prev ? { ...prev, participated: false } : prev)
        toast.error(data.error || '참여에 실패했습니다')
      }
    } catch {
      setEvent(prev => prev ? { ...prev, participated: false } : prev)
      toast.error('서버 오류가 발생했습니다')
    }
    setParticipating(false)
  }

  const handlePostVerificationSubmit = async () => {
    if (!postModal || !event) return
    if (!postModal.postUrl.trim()) {
      toast.error('게시물 URL을 입력해주세요')
      return
    }
    setPostModal(prev => prev ? { ...prev, submitting: true } : null)
    // Optimistic update
    setEvent(prev => prev ? { ...prev, participated: true } : prev)
    try {
      const res = await fetch('/api/partner/events/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotion_id: event.id,
          post_url: postModal.postUrl.trim(),
          post_note: postModal.postNote.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('게시물 인증이 제출되었습니다!')
        setPostModal(null)
      } else {
        setEvent(prev => prev ? { ...prev, participated: false } : prev)
        setPostModal(prev => prev ? { ...prev, submitting: false } : null)
        toast.error(data.error || '제출에 실패했습니다')
      }
    } catch {
      setEvent(prev => prev ? { ...prev, participated: false } : prev)
      setPostModal(prev => prev ? { ...prev, submitting: false } : null)
      toast.error('서버 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        <div className="animate-pulse h-8 w-24 bg-slate-100 rounded" />
        <div className="animate-pulse h-40 bg-slate-100 rounded-xl" />
        <div className="animate-pulse h-64 bg-slate-100 rounded-xl" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <Card>
          <CardContent className="text-center py-16 text-slate-500">
            <p className="font-medium">이벤트를 찾을 수 없습니다</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/events')}>
              목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = TYPE_CONFIG[event.promotion_type] ?? TYPE_CONFIG.event
  const bgColor = event.banner_bg_color || config.bgColor
  const daysLeft = getDaysLeft(event.end_date)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/events')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        이벤트 목록
      </button>

      {/* Banner card */}
      <div
        className="rounded-xl border border-slate-200 overflow-hidden shadow-sm"
        style={{ backgroundColor: bgColor }}
      >
        <div className="flex items-stretch min-h-[140px]">
          {/* Left: text content */}
          <div className="flex-1 px-5 py-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={`text-xs ${config.badgeColor}`}>{config.label}</Badge>
                {event.participated && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    참여 완료
                  </Badge>
                )}
              </div>
              <h1 className="font-bold text-slate-900 text-lg leading-snug">{event.title}</h1>
              {event.reward_description && (
                <p className="text-sm text-slate-600 mt-1 leading-snug">{event.reward_description}</p>
              )}
            </div>

            {/* Date + action */}
            <div className="flex items-center justify-between flex-wrap gap-2 mt-4">
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

              {event.participated ? (
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  참여 완료
                </div>
              ) : (
                <Button
                  size="sm"
                  className={config.btnColor}
                  onClick={() =>
                    event.promotion_type === 'post_verification'
                      ? setPostModal({ postUrl: '', postNote: '', submitting: false })
                      : handleParticipate()
                  }
                  disabled={participating}
                >
                  {participating ? '처리 중...' : '신청하기'}
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
      </div>

      {/* Description */}
      {event.description && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">이벤트 내용</h2>
          <TiptapViewer content={event.description} />
        </div>
      )}

      {/* Event link */}
      {event.event_link_url && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4">
          <p className="text-sm text-slate-500 mb-2">이벤트 링크</p>
          <a
            href={event.event_link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline break-all"
          >
            {event.event_link_url}
          </a>
        </div>
      )}

      {/* Bottom participate button (if no description or as repeat CTA) */}
      {!event.participated && (
        <div className="pb-4">
          <Button
            className={`w-full ${config.btnColor}`}
            onClick={() =>
              event.promotion_type === 'post_verification'
                ? setPostModal({ postUrl: '', postNote: '', submitting: false })
                : handleParticipate()
            }
            disabled={participating}
          >
            {participating ? '처리 중...' : '신청하기'}
          </Button>
        </div>
      )}

      {/* Post verification modal */}
      <Dialog open={!!postModal} onOpenChange={(open) => { if (!open) setPostModal(null) }}>
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
  )
}
