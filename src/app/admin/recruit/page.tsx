'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, EyeOff, ThumbsUp, Bookmark, Pencil, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface ComingSoonItem {
  id: string
  brand_name: string
  brand_logo_url: string | null
  brand_image_url: string | null
  description: string | null
  category: string | null
  expected_launch_date: string | null
  status: 'hidden' | 'visible' | 'launched'
  advertiser_id: string | null
  interest_count: number
  created_at: string
}

interface AdvertiserRequest {
  id: string
  brand_name: string
  brand_url: string | null
  description: string | null
  requested_by: string
  requester_name: string
  requester_email: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  vote_count: number
  created_at: string
}

type AdminTab = 'coming-soon' | 'requests'

const STATUS_LABELS: Record<string, string> = {
  hidden: '비공개',
  visible: '공개중',
  launched: '런칭 완료',
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '거절됨',
}

const STATUS_COLORS: Record<string, string> = {
  hidden: 'bg-slate-100 text-slate-600',
  visible: 'bg-green-100 text-green-700',
  launched: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const CATEGORIES = ['교육', '금융', '커머스', '푸드', '헬스', '뷰티', '여행', '엔터테인먼트', '기타']

export default function AdminRecruitPage() {
  const [tab, setTab] = useState<AdminTab>('coming-soon')
  const [comingSoon, setComingSoon] = useState<ComingSoonItem[]>([])
  const [requests, setRequests] = useState<AdvertiserRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Coming Soon 폼
  const [csModal, setCsModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ComingSoonItem | null>(null)
  const [csForm, setCsForm] = useState({
    brand_name: '', brand_logo_url: '', brand_image_url: '',
    description: '', category: '', expected_launch_date: '', status: 'hidden' as 'hidden' | 'visible',
  })
  const [csSaving, setCsSaving] = useState(false)

  // 요청 검수 모달
  const [reviewModal, setReviewModal] = useState<AdvertiserRequest | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [csRes, rqRes] = await Promise.all([
        fetch('/api/admin/recruit/coming-soon'),
        fetch('/api/admin/recruit/requests'),
      ])
      if (csRes.ok) setComingSoon((await csRes.json()).items || [])
      if (rqRes.ok) setRequests((await rqRes.json()).requests || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  const openCreate = () => {
    setEditTarget(null)
    setCsForm({ brand_name: '', brand_logo_url: '', brand_image_url: '', description: '', category: '', expected_launch_date: '', status: 'hidden' })
    setCsModal(true)
  }

  const openEdit = (item: ComingSoonItem) => {
    setEditTarget(item)
    setCsForm({
      brand_name: item.brand_name,
      brand_logo_url: item.brand_logo_url || '',
      brand_image_url: item.brand_image_url || '',
      description: item.description || '',
      category: item.category || '',
      expected_launch_date: item.expected_launch_date || '',
      status: item.status === 'launched' ? 'visible' : item.status,
    })
    setCsModal(true)
  }

  const handleCsSave = async () => {
    if (!csForm.brand_name.trim()) { toast.error('브랜드명을 입력해주세요'); return }
    setCsSaving(true)
    try {
      const body = {
        brand_name: csForm.brand_name.trim(),
        brand_logo_url: csForm.brand_logo_url || null,
        brand_image_url: csForm.brand_image_url || null,
        description: csForm.description || null,
        category: csForm.category || null,
        expected_launch_date: csForm.expected_launch_date || null,
        status: csForm.status,
      }
      const url = editTarget ? `/api/admin/recruit/coming-soon/${editTarget.id}` : '/api/admin/recruit/coming-soon'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        toast.success(editTarget ? '수정되었습니다' : '등록되었습니다')
        setCsModal(false)
        fetchAll()
      } else {
        const d = await res.json()
        toast.error(d.error || '저장에 실패했습니다')
      }
    } catch { toast.error('서버 오류') }
    setCsSaving(false)
  }

  const handleToggleVisible = async (item: ComingSoonItem) => {
    if (item.status === 'launched') return
    const newStatus = item.status === 'visible' ? 'hidden' : 'visible'
    const res = await fetch(`/api/admin/recruit/coming-soon/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      toast.success(newStatus === 'visible' ? '파트너에게 공개되었습니다' : '비공개로 변경되었습니다')
      fetchAll()
    } else toast.error('변경에 실패했습니다')
  }

  const handleDelete = async (item: ComingSoonItem) => {
    if (!confirm(`"${item.brand_name}"을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/admin/recruit/coming-soon/${item.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('삭제되었습니다'); fetchAll() }
    else { const d = await res.json(); toast.error(d.error || '삭제에 실패했습니다') }
  }

  const openReview = (req: AdvertiserRequest) => {
    setReviewModal(req)
    setAdminNote(req.admin_note || '')
  }

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewModal) return
    setReviewing(true)
    const res = await fetch(`/api/admin/recruit/requests/${reviewModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_note: adminNote }),
    })
    if (res.ok) {
      toast.success(status === 'approved' ? '승인되었습니다. 파트너에게 공개됩니다.' : '거절되었습니다.')
      setReviewModal(null)
      fetchAll()
    } else toast.error('처리에 실패했습니다')
    setReviewing(false)
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const otherRequests = requests.filter(r => r.status !== 'pending')

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">광고주 모집 관리</h1>
          <p className="text-sm text-slate-500 mt-1">Coming Soon 광고주 등록 및 파트너 요청 검수</p>
        </div>
        {tab === 'coming-soon' && (
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1" />등록
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('coming-soon')}
          className={`py-2 px-5 rounded-md text-sm font-medium transition-colors ${tab === 'coming-soon' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Coming Soon
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`py-2 px-5 rounded-md text-sm font-medium transition-colors ${tab === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          파트너 요청
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Coming Soon 관리 */}
      {tab === 'coming-soon' && (
        <div className="space-y-3">
          {comingSoon.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-4xl mb-3">🏢</p>
              <p>등록된 Coming Soon 광고주가 없습니다</p>
            </div>
          ) : (
            comingSoon.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900">{item.brand_name}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</Badge>
                    {item.category && <Badge className="text-xs bg-slate-100 text-slate-600">{item.category}</Badge>}
                  </div>
                  {item.description && <p className="text-sm text-slate-500 line-clamp-1">{item.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {item.expected_launch_date && <span>📅 {new Date(item.expected_launch_date).toLocaleDateString('ko-KR')}</span>}
                    <span className="flex items-center gap-0.5"><Bookmark className="w-3 h-3" /> {item.interest_count}명 예약</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status !== 'launched' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleToggleVisible(item)}>
                        {item.status === 'visible' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 파트너 요청 관리 */}
      {tab === 'requests' && (
        <div className="space-y-6">
          {/* 검토 대기 */}
          {pendingRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />검토 대기 ({pendingRequests.length}건)
              </h2>
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900">{req.brand_name}</span>
                      </div>
                      {req.brand_url && <a href={req.brand_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500">{req.brand_url}</a>}
                      {req.description && <p className="text-sm text-slate-600 mt-1">{req.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">요청자: {req.requester_name} ({req.requester_email}) · {new Date(req.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <Button size="sm" onClick={() => openReview(req)} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                      검수하기
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 처리 완료 */}
          {otherRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 mb-2">처리 완료 ({otherRequests.length}건)</h2>
              <div className="space-y-2">
                {otherRequests.map(req => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-slate-900">{req.brand_name}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</Badge>
                        <span className="flex items-center gap-0.5 text-xs text-slate-400"><ThumbsUp className="w-3 h-3" />{req.vote_count}</span>
                      </div>
                      {req.brand_url && <a href={req.brand_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500">{req.brand_url}</a>}
                      {req.description && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{req.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">요청자: {req.requester_name} · {new Date(req.created_at).toLocaleDateString('ko-KR')}</p>
                      {req.admin_note && <p className="text-xs text-blue-600 mt-1">메모: {req.admin_note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requests.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <p className="text-4xl mb-3">💬</p>
              <p>파트너 요청이 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* Coming Soon 등록/수정 모달 */}
      <Dialog open={csModal} onOpenChange={open => { if (!open) setCsModal(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Coming Soon 수정' : 'Coming Soon 등록'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>브랜드명 *</Label>
              <Input value={csForm.brand_name} onChange={e => setCsForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="예: 무신사" />
            </div>
            <div className="space-y-1">
              <Label>카테고리</Label>
              <Select value={csForm.category} onValueChange={v => setCsForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>서비스 소개</Label>
              <Textarea rows={2} value={csForm.description} onChange={e => setCsForm(f => ({ ...f, description: e.target.value }))} placeholder="한 줄 소개" />
            </div>
            <div className="space-y-1">
              <Label>로고 URL</Label>
              <Input value={csForm.brand_logo_url} onChange={e => setCsForm(f => ({ ...f, brand_logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>배너 이미지 URL</Label>
              <Input value={csForm.brand_image_url} onChange={e => setCsForm(f => ({ ...f, brand_image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>예상 런칭일</Label>
              <Input type="date" value={csForm.expected_launch_date} onChange={e => setCsForm(f => ({ ...f, expected_launch_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>공개 상태</Label>
              <Select value={csForm.status} onValueChange={v => setCsForm(f => ({ ...f, status: v as 'hidden' | 'visible' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">비공개 (파트너에게 미노출)</SelectItem>
                  <SelectItem value="visible">공개 (파트너에게 노출)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCsModal(false)} disabled={csSaving}>취소</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCsSave} disabled={csSaving}>
                {csSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 검수 모달 */}
      <Dialog open={!!reviewModal} onOpenChange={open => { if (!open) setReviewModal(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>광고주 요청 검수</DialogTitle>
          </DialogHeader>
          {reviewModal && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="font-bold text-slate-900">{reviewModal.brand_name}</p>
                {reviewModal.brand_url && <a href={reviewModal.brand_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500">{reviewModal.brand_url}</a>}
                {reviewModal.description && <p className="text-sm text-slate-600">{reviewModal.description}</p>}
                <p className="text-xs text-slate-400">요청자: {reviewModal.requester_name} ({reviewModal.requester_email})</p>
              </div>
              <div className="space-y-1.5">
                <Label>관리자 메모 (선택)</Label>
                <Textarea
                  rows={3}
                  placeholder="영업 계획, 거절 사유 등 내부 메모"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  disabled={reviewing}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleReview('approved')}
                  disabled={reviewing}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />승인 (파트너에게 공개)
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleReview('rejected')}
                  disabled={reviewing}
                >
                  <XCircle className="w-4 h-4 mr-1" />거절
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setReviewModal(null)} disabled={reviewing}>닫기</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
