'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { ContentType, CollabStatus } from '@/types/database'

interface PartnerCandidate {
  partner_id: string
  name: string
  contract_count: number
}

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
  created_at: string
  partners: { name: string }
}

interface CollabMessage {
  id: string
  sender_type: 'advertiser' | 'partner'
  message: string
  created_at: string
}

const STATUS_LABELS: Record<CollabStatus, string> = {
  requested: '제안 대기',
  accepted: '수락됨',
  in_progress: '진행 중',
  submitted: '제출됨',
  revision: '수정 요청',
  completed: '완료',
  paid: '정산 완료',
  declined: '거절됨',
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

export default function AdvertiserCollaborationsPage() {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [partners, setPartners] = useState<PartnerCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null)
  const [messages, setMessages] = useState<CollabMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 제안 폼 상태
  const [selectedPartner, setSelectedPartner] = useState<PartnerCandidate | null>(null)
  const [form, setForm] = useState({
    title: '',
    brief: '',
    content_type: 'blog' as ContentType,
    budget: '',
    deadline: '',
  })

  useEffect(() => {
    fetchCollaborations()
    fetchTopPartners()
  }, [])

  const fetchCollaborations = async () => {
    try {
      const res = await fetch('/api/advertiser/collaborations')
      if (res.ok) {
        const data = await res.json()
        setCollaborations(data.collaborations)
      }
    } catch {
      console.error('Failed to fetch collaborations')
    }
    setLoading(false)
  }

  const fetchTopPartners = async () => {
    try {
      const res = await fetch('/api/advertiser/partners?sort=contracts&limit=20')
      if (res.ok) {
        const data = await res.json()
        setPartners(
          (data.partners || []).map((p: Record<string, unknown>) => ({
            partner_id: p.partner_id || p.id,
            name: (p.partners as Record<string, unknown>)?.name || p.name || '',
            contract_count: p.contract_count || 0,
          }))
        )
      }
    } catch {
      console.error('Failed to fetch partners')
    }
  }

  const handleCreate = async () => {
    if (!selectedPartner || !form.title || !form.brief || !form.budget) {
      toast.error('필수 항목을 입력해주세요')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/advertiser/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: selectedPartner.partner_id,
          title: form.title,
          brief: form.brief,
          content_type: form.content_type,
          budget: Number(form.budget),
          deadline: form.deadline || null,
        }),
      })

      if (res.ok) {
        toast.success('협업 제안이 전송되었습니다')
        setDialogOpen(false)
        setForm({ title: '', brief: '', content_type: 'blog', budget: '', deadline: '' })
        setSelectedPartner(null)
        fetchCollaborations()
      } else {
        const data = await res.json()
        toast.error(data.error || '협업 생성에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setSubmitting(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/advertiser/collaborations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        toast.success('상태가 변경되었습니다')
        fetchCollaborations()
        if (selectedCollab?.id === id) {
          openDetail({ ...selectedCollab, status: status as CollabStatus })
        }
      } else {
        const data = await res.json()
        toast.error(data.error || '상태 변경에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
  }

  const openDetail = async (collab: Collaboration) => {
    setSelectedCollab(collab)
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/advertiser/collaborations/${collab.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {
      console.error('Failed to fetch detail')
    }
  }

  const sendMessage = async () => {
    if (!selectedCollab || !newMessage.trim()) return
    try {
      const res = await fetch(`/api/advertiser/collaborations/${selectedCollab.id}`, {
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

  const budgetNum = Number(form.budget) || 0
  const platformFee = Math.round(budgetNum * 0.1)
  const partnerPayout = budgetNum - platformFee

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">콘텐츠 협업</h1>
        <div className="animate-pulse grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">콘텐츠 협업</h1>
          <p className="text-slate-500 mt-1">우수 파트너에게 브랜디드 콘텐츠를 의뢰하세요</p>
        </div>
      </div>

      <Tabs defaultValue="manage">
        <TabsList>
          <TabsTrigger value="partners">파트너 탐색</TabsTrigger>
          <TabsTrigger value="manage">협업 관리</TabsTrigger>
        </TabsList>

        {/* 파트너 탐색 탭 */}
        <TabsContent value="partners" className="space-y-4">
          <p className="text-sm text-slate-500">실적 상위 파트너 목록입니다. 협업을 제안해보세요.</p>
          <div className="grid gap-3">
            {partners.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-500">승인된 파트너가 없습니다</CardContent></Card>
            ) : (
              partners.map(p => (
                <Card key={p.partner_id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-slate-500">계약 실적 우수 파트너</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">계약</p>
                        <p className="font-semibold">{p.contract_count}건</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPartner(p)
                          setDialogOpen(true)
                        }}
                      >
                        협업 제안
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 협업 관리 탭 */}
        <TabsContent value="manage" className="space-y-4">
          {collaborations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                아직 협업이 없습니다. 파트너 탐색 탭에서 협업을 제안해보세요.
              </CardContent>
            </Card>
          ) : (
            collaborations.map(collab => (
              <Card key={collab.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(collab)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{collab.title}</h3>
                        <Badge className={STATUS_COLORS[collab.status]}>
                          {STATUS_LABELS[collab.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {collab.partners?.name} &middot; {CONTENT_TYPE_LABELS[collab.content_type]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">&#8361;{Number(collab.budget).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">
                        {collab.deadline ? `마감: ${collab.deadline}` : '마감일 미정'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* 협업 제안 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>협업 제안</DialogTitle>
          </DialogHeader>
          {selectedPartner && (
            <div className="bg-slate-50 rounded-lg p-3 mb-2">
              <p className="font-medium">{selectedPartner.name}</p>
              <p className="text-sm text-slate-500">계약 {selectedPartner.contract_count}건 달성</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: 제품 비교 블로그 작성"
              />
            </div>
            <div>
              <Label htmlFor="content_type">콘텐츠 유형</Label>
              <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v as ContentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">블로그</SelectItem>
                  <SelectItem value="youtube">유튜브</SelectItem>
                  <SelectItem value="instagram">인스타그램</SelectItem>
                  <SelectItem value="tiktok">틱톡</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="budget">예산 (원)</Label>
              <Input
                id="budget"
                type="number"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                placeholder="500000"
              />
              {budgetNum > 0 && (
                <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                  <p>플랫폼 수수료 (10%): &#8361;{platformFee.toLocaleString()}</p>
                  <p>파트너 수취분: &#8361;{partnerPayout.toLocaleString()}</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="deadline">마감일 (선택)</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="brief">브리프</Label>
              <Textarea
                id="brief"
                value={form.brief}
                onChange={e => setForm(f => ({ ...f, brief: e.target.value }))}
                rows={5}
                placeholder="콘텐츠 방향, 키워드, 톤앤매너 등을 설명해주세요..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? '전송 중...' : '제안 보내기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 협업 상세 다이얼로그 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">파트너</p>
                    <p className="font-medium">{selectedCollab.partners?.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">콘텐츠 유형</p>
                    <p className="font-medium">{CONTENT_TYPE_LABELS[selectedCollab.content_type]}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">예산</p>
                    <p className="font-medium">&#8361;{Number(selectedCollab.budget).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">마감일</p>
                    <p className="font-medium">{selectedCollab.deadline || '미정'}</p>
                  </div>
                </div>

                {/* 결과물 */}
                {selectedCollab.deliverable_url && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">결과물</CardTitle></CardHeader>
                    <CardContent>
                      <a href={selectedCollab.deliverable_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                        {selectedCollab.deliverable_url}
                      </a>
                      {selectedCollab.deliverable_note && (
                        <p className="text-sm text-slate-500 mt-1">{selectedCollab.deliverable_note}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  {selectedCollab.status === 'submitted' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusChange(selectedCollab.id, 'completed')}>검수 완료</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedCollab.id, 'revision')}>수정 요청</Button>
                    </>
                  )}
                  {!['completed', 'paid', 'declined', 'cancelled'].includes(selectedCollab.status) && (
                    <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selectedCollab.id, 'cancelled')}>취소</Button>
                  )}
                </div>

                {/* 메시지 */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3">메시지</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-slate-400">아직 메시지가 없습니다</p>
                    ) : (
                      messages.map(msg => (
                        <div key={msg.id} className={`text-sm p-2 rounded-lg ${msg.sender_type === 'advertiser' ? 'bg-blue-50 ml-8' : 'bg-slate-50 mr-8'}`}>
                          <p className="text-xs text-slate-400 mb-0.5">{msg.sender_type === 'advertiser' ? '나' : '파트너'}</p>
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
