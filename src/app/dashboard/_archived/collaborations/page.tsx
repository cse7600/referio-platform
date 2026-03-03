'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ContentType, CollabStatus } from '@/types/database'

interface Collaboration {
  id: string
  title: string
  brief: string
  content_type: ContentType
  budget: number
  platform_fee: number
  partner_payout: number
  deadline: string | null
  status: CollabStatus
  deliverable_url: string | null
  deliverable_note: string | null
  decline_reason: string | null
  created_at: string
  advertisers: { company_name: string }
}

interface CollabMessage {
  id: string
  sender_type: 'advertiser' | 'partner'
  message: string
  created_at: string
}

const STATUS_LABELS: Record<CollabStatus, string> = {
  requested: '제안 수신',
  accepted: '수락함',
  in_progress: '진행 중',
  submitted: '제출 완료',
  revision: '수정 요청',
  completed: '검수 완료',
  paid: '정산 완료',
  declined: '거절함',
  cancelled: '취소됨',
}

const STATUS_COLORS: Record<CollabStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  submitted: 'bg-purple-100 text-purple-800',
  revision: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-800',
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: '블로그',
  youtube: '유튜브',
  instagram: '인스타그램',
  tiktok: '틱톡',
  other: '기타',
}

export default function PartnerCollaborationsPage() {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null)
  const [messages, setMessages] = useState<CollabMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [submitForm, setSubmitForm] = useState({ url: '', note: '' })
  const [declineReason, setDeclineReason] = useState('')
  const [showDecline, setShowDecline] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  useEffect(() => {
    fetchCollaborations()
  }, [])

  const fetchCollaborations = async () => {
    try {
      const res = await fetch('/api/partner/collaborations')
      if (res.ok) {
        const data = await res.json()
        setCollaborations(data.collaborations)
      }
    } catch {
      console.error('Failed to fetch collaborations')
    }
    setLoading(false)
  }

  const openDetail = async (collab: Collaboration) => {
    setSelectedCollab(collab)
    setDetailOpen(true)
    setShowDecline(false)
    setShowSubmit(false)
    try {
      const res = await fetch(`/api/partner/collaborations/${collab.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {
      console.error('Failed to fetch detail')
    }
  }

  const handleStatusChange = async (status: string, extra?: Record<string, unknown>) => {
    if (!selectedCollab) return
    try {
      const res = await fetch(`/api/partner/collaborations/${selectedCollab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      })

      if (res.ok) {
        toast.success('상태가 변경되었습니다')
        fetchCollaborations()
        setDetailOpen(false)
      } else {
        const data = await res.json()
        toast.error(data.error || '상태 변경에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
  }

  const sendMessage = async () => {
    if (!selectedCollab || !newMessage.trim()) return
    try {
      const res = await fetch(`/api/partner/collaborations/${selectedCollab.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
      }
    } catch {
      toast.error('메시지 전송에 실패했습니다')
    }
  }

  const pendingCount = collaborations.filter(c => c.status === 'requested').length
  const activeCount = collaborations.filter(c => ['accepted', 'in_progress', 'submitted', 'revision'].includes(c.status)).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">콘텐츠 협업</h1>
        <div className="animate-pulse grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">콘텐츠 협업</h1>
        <p className="text-gray-500 mt-1">광고주로부터 받은 콘텐츠 제작 제안을 관리하세요</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-gray-500">새 제안</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{activeCount}</p>
            <p className="text-sm text-gray-500">진행 중</p>
          </CardContent>
        </Card>
      </div>

      {/* 협업 목록 */}
      {collaborations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            아직 협업 제안이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {collaborations.map(collab => (
            <Card
              key={collab.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetail(collab)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{collab.title}</h3>
                      <Badge className={STATUS_COLORS[collab.status]}>
                        {STATUS_LABELS[collab.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {collab.advertisers?.company_name} &middot; {CONTENT_TYPE_LABELS[collab.content_type]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">&#8361;{Number(collab.partner_payout).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">수취분</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 상세 다이얼로그 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCollab && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedCollab.title}</DialogTitle>
                  <Badge className={STATUS_COLORS[selectedCollab.status]}>
                    {STATUS_LABELS[selectedCollab.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">광고주</p>
                    <p className="font-medium">{selectedCollab.advertisers?.company_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">콘텐츠 유형</p>
                    <p className="font-medium">{CONTENT_TYPE_LABELS[selectedCollab.content_type]}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">수취분</p>
                    <p className="font-medium text-green-600">&#8361;{Number(selectedCollab.partner_payout).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">마감일</p>
                    <p className="font-medium">{selectedCollab.deadline || '미정'}</p>
                  </div>
                </div>

                {/* 브리프 */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">브리프</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedCollab.brief}</p>
                  </CardContent>
                </Card>

                {/* 액션 버튼 */}
                <div className="flex flex-wrap gap-2">
                  {selectedCollab.status === 'requested' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusChange('accepted')}>수락</Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowDecline(true)}>거절</Button>
                    </>
                  )}
                  {selectedCollab.status === 'accepted' && (
                    <Button size="sm" onClick={() => handleStatusChange('in_progress')}>작업 시작</Button>
                  )}
                  {['in_progress', 'revision'].includes(selectedCollab.status) && (
                    <Button size="sm" onClick={() => setShowSubmit(true)}>결과물 제출</Button>
                  )}
                </div>

                {/* 거절 폼 */}
                {showDecline && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <Label>거절 사유</Label>
                    <Textarea
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      placeholder="거절 사유를 입력해주세요 (선택)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange('declined', { decline_reason: declineReason })}>거절 확인</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowDecline(false)}>취소</Button>
                    </div>
                  </div>
                )}

                {/* 제출 폼 */}
                {showSubmit && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <div>
                      <Label>결과물 URL</Label>
                      <Input
                        value={submitForm.url}
                        onChange={e => setSubmitForm(f => ({ ...f, url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>비고 (선택)</Label>
                      <Textarea
                        value={submitForm.note}
                        onChange={e => setSubmitForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="추가 설명..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange('submitted', {
                          deliverable_url: submitForm.url,
                          deliverable_note: submitForm.note,
                        })}
                      >
                        제출
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowSubmit(false)}>취소</Button>
                    </div>
                  </div>
                )}

                {/* 메시지 */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3">메시지</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-gray-400">아직 메시지가 없습니다</p>
                    ) : (
                      messages.map(msg => (
                        <div key={msg.id} className={`text-sm p-2 rounded-lg ${msg.sender_type === 'partner' ? 'bg-indigo-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                          <p className="text-xs text-gray-400 mb-0.5">{msg.sender_type === 'partner' ? '나' : '광고주'}</p>
                          <p>{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {!['completed', 'paid', 'declined', 'cancelled'].includes(selectedCollab.status) && (
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="메시지 입력..."
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      />
                      <Button size="sm" onClick={sendMessage}>전송</Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
