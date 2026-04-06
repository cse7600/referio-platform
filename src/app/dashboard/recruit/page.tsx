'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Calendar, ThumbsUp, Bookmark, BookmarkCheck, Clock, CheckCircle2, Plus, ExternalLink } from 'lucide-react'

interface ComingSoonItem {
  id: string
  brand_name: string
  brand_logo_url: string | null
  brand_image_url: string | null
  description: string | null
  category: string | null
  expected_launch_date: string | null
  interest_count: number
  my_interest: boolean
}

interface AdvertiserRequest {
  id: string
  brand_name: string
  brand_url: string | null
  description: string | null
  requested_by: string
  requester_name: string
  status: 'pending' | 'approved'
  created_at: string
  vote_count: number
  my_vote: boolean
  is_mine: boolean
}

type TabType = 'coming-soon' | 'requests'

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getDaysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function RecruitPage() {
  const [tab, setTab] = useState<TabType>('coming-soon')
  const [comingSoon, setComingSoon] = useState<ComingSoonItem[]>([])
  const [requests, setRequests] = useState<AdvertiserRequest[]>([])
  const [todayRequestCount, setTodayRequestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [requestModal, setRequestModal] = useState(false)
  const [form, setForm] = useState({ brand_name: '', brand_url: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [csRes, rqRes] = await Promise.all([
        fetch('/api/partner/recruit/coming-soon'),
        fetch('/api/partner/recruit/requests'),
      ])
      if (csRes.ok) {
        const d = await csRes.json()
        setComingSoon(d.items || [])
      }
      if (rqRes.ok) {
        const d = await rqRes.json()
        setRequests(d.requests || [])
        setTodayRequestCount(d.today_request_count || 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleInterest = async (item: ComingSoonItem) => {
    if (toggling) return
    setToggling(item.id)
    const wasInterested = item.my_interest
    // Optimistic
    setComingSoon(prev => prev.map(i => i.id === item.id
      ? { ...i, my_interest: !wasInterested, interest_count: i.interest_count + (wasInterested ? -1 : 1) }
      : i
    ))
    try {
      const method = wasInterested ? 'DELETE' : 'POST'
      const res = await fetch(`/api/partner/recruit/coming-soon/${item.id}/interest`, { method })
      if (!res.ok) {
        // Rollback
        setComingSoon(prev => prev.map(i => i.id === item.id
          ? { ...i, my_interest: wasInterested, interest_count: i.interest_count + (wasInterested ? 1 : -1) }
          : i
        ))
        toast.error('처리에 실패했습니다')
      } else {
        toast.success(wasInterested ? '사전 예약을 취소했습니다' : '사전 예약이 완료되었습니다!')
      }
    } catch {
      setComingSoon(prev => prev.map(i => i.id === item.id
        ? { ...i, my_interest: wasInterested, interest_count: i.interest_count + (wasInterested ? 1 : -1) }
        : i
      ))
      toast.error('서버 오류가 발생했습니다')
    }
    setToggling(null)
  }

  const handleVote = async (req: AdvertiserRequest) => {
    if (toggling || req.is_mine) return
    setToggling(req.id)
    const wasVoted = req.my_vote
    // Optimistic
    setRequests(prev => prev.map(r => r.id === req.id
      ? { ...r, my_vote: !wasVoted, vote_count: r.vote_count + (wasVoted ? -1 : 1) }
      : r
    ))
    try {
      const method = wasVoted ? 'DELETE' : 'POST'
      const res = await fetch(`/api/partner/recruit/requests/${req.id}/vote`, { method })
      if (!res.ok) {
        setRequests(prev => prev.map(r => r.id === req.id
          ? { ...r, my_vote: wasVoted, vote_count: r.vote_count + (wasVoted ? 1 : -1) }
          : r
        ))
        toast.error('처리에 실패했습니다')
      } else {
        toast.success(wasVoted ? '공감을 취소했습니다' : '공감했습니다!')
      }
    } catch {
      setRequests(prev => prev.map(r => r.id === req.id
        ? { ...r, my_vote: wasVoted, vote_count: r.vote_count + (wasVoted ? 1 : -1) }
        : r
      ))
      toast.error('서버 오류가 발생했습니다')
    }
    setToggling(null)
  }

  const handleSubmitRequest = async () => {
    if (!form.brand_name.trim()) {
      toast.error('브랜드명을 입력해주세요')
      return
    }
    if (todayRequestCount >= 3) {
      toast.error('오늘은 최대 3건까지 요청 가능합니다')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/partner/recruit/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('요청이 접수되었습니다. 검토 후 공개됩니다.')
        setRequestModal(false)
        setForm({ brand_name: '', brand_url: '', description: '' })
        fetchAll()
      } else if (res.status === 429) {
        toast.error('오늘은 최대 3건까지 요청 가능합니다')
      } else {
        toast.error(data.error || '요청에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-28 bg-slate-100 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">광고주 모집</h1>
        <p className="text-sm text-slate-500 mt-1">곧 합류할 광고주를 미리 만나고, 원하는 브랜드를 요청해보세요</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setTab('coming-soon')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === 'coming-soon' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🚀 곧 합류해요
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tab === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          💬 파트너 요청
        </button>
      </div>

      {/* Coming Soon Tab */}
      {tab === 'coming-soon' && (
        <div className="space-y-3">
          {comingSoon.length === 0 ? (
            <Card className="py-20">
              <CardContent className="text-center text-slate-500">
                <div className="text-5xl mb-4">🏢</div>
                <p className="font-medium">현재 예정된 광고주가 없습니다</p>
                <p className="text-sm mt-1">새로운 광고주가 합류 예정이면 이곳에서 먼저 알려드릴게요!</p>
              </CardContent>
            </Card>
          ) : (
            comingSoon.map(item => {
              const daysUntil = getDaysUntil(item.expected_launch_date)
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                  <div className="flex items-stretch min-h-[130px]">
                    {/* Left: content */}
                    <div className="flex-1 px-5 py-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {item.category && (
                            <Badge className="text-xs bg-indigo-100 text-indigo-700">{item.category}</Badge>
                          )}
                          <Badge className="text-xs bg-amber-100 text-amber-700">🚀 Coming Soon</Badge>
                        </div>
                        <h3 className="font-bold text-slate-900 text-[17px] leading-snug">{item.brand_name}</h3>
                        {item.description && (
                          <p className="text-sm text-slate-600 mt-1 leading-snug line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex flex-col gap-0.5">
                          {item.expected_launch_date && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>예정일: {formatDate(item.expected_launch_date)}</span>
                              {daysUntil !== null && daysUntil > 0 && (
                                <span className="font-semibold text-indigo-600 ml-1">D-{daysUntil}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Bookmark className="w-3 h-3" />
                            <span>사전 예약 {item.interest_count}명</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={item.my_interest ? 'default' : 'outline'}
                          className={item.my_interest
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                          }
                          onClick={() => handleInterest(item)}
                          disabled={toggling === item.id}
                        >
                          {item.my_interest
                            ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1" />예약 완료</>
                            : <><Bookmark className="w-3.5 h-3.5 mr-1" />사전 예약</>
                          }
                        </Button>
                      </div>
                    </div>
                    {/* Right: image or logo */}
                    <div className="w-24 shrink-0 flex items-center justify-center bg-slate-50">
                      {item.brand_image_url || item.brand_logo_url ? (
                        <img
                          src={item.brand_image_url || item.brand_logo_url || ''}
                          alt={item.brand_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                          <span className="text-2xl font-bold text-indigo-400">
                            {item.brand_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {/* 요청 버튼 + 한도 안내 */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">오늘 요청 {todayRequestCount}/3건</p>
            <Button
              size="sm"
              onClick={() => setRequestModal(true)}
              disabled={todayRequestCount >= 3}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              광고주 요청하기
            </Button>
          </div>

          {requests.length === 0 ? (
            <Card className="py-20">
              <CardContent className="text-center text-slate-500">
                <div className="text-5xl mb-4">💬</div>
                <p className="font-medium">아직 요청이 없습니다</p>
                <p className="text-sm mt-1">원하는 브랜드가 있다면 첫 번째로 요청해보세요!</p>
              </CardContent>
            </Card>
          ) : (
            requests.map(req => (
              <div key={req.id} className="rounded-xl border border-slate-200 shadow-sm bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {req.is_mine && req.status === 'pending' && (
                        <Badge className="text-xs bg-amber-100 text-amber-700">
                          <Clock className="w-3 h-3 mr-0.5" />검토 대기중
                        </Badge>
                      )}
                      {req.status === 'approved' && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />승인됨
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">{req.requester_name} 님의 요청</span>
                    </div>
                    <h3 className="font-bold text-slate-900">{req.brand_name}</h3>
                    {req.brand_url && (
                      <a
                        href={req.brand_url.startsWith('http') ? req.brand_url : `https://${req.brand_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {req.brand_url}
                      </a>
                    )}
                    {req.description && (
                      <p className="text-sm text-slate-600 mt-1 leading-snug">{req.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(req.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {/* 공감 영역 */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    {req.is_mine ? (
                      <div className="flex flex-col items-center text-slate-400">
                        <ThumbsUp className="w-5 h-5" />
                        <span className="text-xs font-medium">{req.vote_count}</span>
                        <span className="text-[10px]">내 요청</span>
                      </div>
                    ) : req.status === 'approved' ? (
                      <button
                        onClick={() => handleVote(req)}
                        disabled={toggling === req.id}
                        className={`flex flex-col items-center gap-0.5 transition-colors ${
                          req.my_vote
                            ? 'text-indigo-600'
                            : 'text-slate-400 hover:text-indigo-500'
                        }`}
                      >
                        <ThumbsUp className={`w-5 h-5 ${req.my_vote ? 'fill-indigo-100' : ''}`} />
                        <span className="text-xs font-medium">{req.vote_count}</span>
                        <span className="text-[10px]">{req.my_vote ? '공감 완료' : '나도 원해요'}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center text-slate-300">
                        <ThumbsUp className="w-5 h-5" />
                        <span className="text-xs font-medium">{req.vote_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 요청 모달 */}
      <Dialog open={requestModal} onOpenChange={open => { if (!open) setRequestModal(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>광고주 요청하기</DialogTitle>
            <DialogDescription>
              원하는 브랜드를 요청해주세요. 검토 후 다른 파트너들에게 공개됩니다.
              <br />
              <span className="text-amber-600 font-medium">오늘 남은 요청 횟수: {3 - todayRequestCount}건</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">브랜드명 <span className="text-red-500">*</span></Label>
              <Input
                id="brand-name"
                placeholder="예: 무신사, 마켓컬리"
                value={form.brand_name}
                onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
                disabled={submitting}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-url">브랜드 URL <span className="text-slate-400 text-xs">(선택)</span></Label>
              <Input
                id="brand-url"
                placeholder="https://example.com"
                value={form.brand_url}
                onChange={e => setForm(f => ({ ...f, brand_url: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">서비스 소개 <span className="text-slate-400 text-xs">(선택)</span></Label>
              <Textarea
                id="description"
                placeholder="어떤 서비스인지 간단히 설명해주세요"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                disabled={submitting}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setRequestModal(false)} disabled={submitting}>취소</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSubmitRequest}
                disabled={submitting}
              >
                {submitting ? '제출 중...' : '요청 제출'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
