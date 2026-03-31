'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, X, Pencil, Users, Eye, EyeOff } from 'lucide-react'

interface Promotion {
  id: string
  title: string
  description: string | null
  promotion_type: 'event' | 'bonus' | 'ranking'
  reward_description: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'ended' | 'draft'
  is_visible_to_partners: boolean
  participation_count: number
  created_at: string
}

type FormState = {
  title: string
  description: string
  promotionType: 'event' | 'bonus' | 'ranking'
  rewardDescription: string
  startDate: string
  endDate: string
  isVisible: boolean
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  event: { label: '이벤트', color: 'bg-purple-100 text-purple-700' },
  bonus: { label: '보너스', color: 'bg-green-100 text-green-700' },
  ranking: { label: '랭킹', color: 'bg-orange-100 text-orange-700' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '진행 중', color: 'bg-green-100 text-green-700' },
  ended: { label: '종료', color: 'bg-gray-100 text-gray-500' },
  draft: { label: '임시저장', color: 'bg-yellow-100 text-yellow-700' },
}

function emptyForm(): FormState {
  return {
    title: '',
    description: '',
    promotionType: 'event',
    rewardDescription: '',
    startDate: '',
    endDate: '',
    isVisible: true,
  }
}

function promotionToForm(p: Promotion): FormState {
  return {
    title: p.title,
    description: p.description || '',
    promotionType: p.promotion_type,
    rewardDescription: p.reward_description || '',
    startDate: p.start_date || '',
    endDate: p.end_date || '',
    isVisible: p.is_visible_to_partners,
  }
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/advertiser/promotions')
      if (res.ok) {
        const data = await res.json()
        setPromotions(data.promotions || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/advertiser/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          promotion_type: form.promotionType,
          reward_description: form.rewardDescription || null,
          start_date: form.startDate || null,
          end_date: form.endDate || null,
          is_visible_to_partners: form.isVisible,
          status: 'active',
        }),
      })
      if (res.ok) {
        toast.success('이벤트가 생성되었습니다')
        setShowForm(false)
        setForm(emptyForm())
        fetchPromotions()
      } else {
        const data = await res.json()
        toast.error(data.error || '생성에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !form.title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/advertiser/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          title: form.title,
          description: form.description || null,
          promotion_type: form.promotionType,
          reward_description: form.rewardDescription || null,
          start_date: form.startDate || null,
          end_date: form.endDate || null,
          is_visible_to_partners: form.isVisible,
        }),
      })
      if (res.ok) {
        toast.success('이벤트가 수정되었습니다')
        setEditingId(null)
        fetchPromotions()
      } else {
        const data = await res.json()
        toast.error(data.error || '수정에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/advertiser/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        toast.success('상태가 변경되었습니다')
        fetchPromotions()
      }
    } catch {
      toast.error('변경에 실패했습니다')
    }
  }

  const handleToggleVisible = async (id: string, current: boolean) => {
    try {
      const res = await fetch('/api/advertiser/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_visible_to_partners: !current }),
      })
      if (res.ok) {
        toast.success(!current ? '파트너에게 공개되었습니다' : '비공개로 변경되었습니다')
        fetchPromotions()
      }
    } catch {
      toast.error('변경에 실패했습니다')
    }
  }

  const startEdit = (promo: Promotion) => {
    setEditingId(promo.id)
    setForm(promotionToForm(promo))
    setShowForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">이벤트 관리</h1>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">이벤트 관리</h1>
          <p className="text-slate-500 mt-1">파트너에게 공지할 이벤트/프로모션을 관리합니다</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()) }}>
          <Plus className="w-4 h-4 mr-2" />
          이벤트 생성
        </Button>
      </div>

      {/* 이벤트 생성 폼 */}
      {showForm && !editingId && (
        <EventForm
          form={form}
          setField={setField}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setForm(emptyForm()) }}
          title="새 이벤트 생성"
          submitLabel="이벤트 생성"
        />
      )}

      {/* 이벤트 목록 */}
      {promotions.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center text-slate-500">
            <p className="text-lg mb-2">진행 중인 이벤트가 없습니다</p>
            <p className="text-sm">이벤트를 생성하면 파트너 대시보드에 배너로 표시됩니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {promotions.map((promo) => {
            const typeInfo = TYPE_LABELS[promo.promotion_type]
            const statusInfo = STATUS_LABELS[promo.status]
            const isEditing = editingId === promo.id

            return (
              <Card key={promo.id} className={isEditing ? 'ring-2 ring-indigo-500' : ''}>
                {isEditing ? (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className="text-lg">이벤트 수정</CardTitle>
                        <CardDescription>내용을 수정하고 저장하세요</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <EventFormFields form={form} setField={setField} />
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleUpdate} disabled={saving}>
                          {saving ? '저장 중...' : '수정 저장'}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit}>취소</Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-slate-900">{promo.title}</h3>
                          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          {!promo.is_visible_to_partners && (
                            <Badge className="bg-slate-100 text-slate-500">비공개</Badge>
                          )}
                        </div>
                        {promo.description && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2 whitespace-pre-line">{promo.description}</p>
                        )}
                        {promo.reward_description && (
                          <p className="text-sm text-slate-500 mt-1">
                            <span className="font-medium">리워드:</span> {promo.reward_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          {(promo.start_date || promo.end_date) && (
                            <p className="text-xs text-slate-400">
                              {promo.start_date && `${promo.start_date}`}
                              {promo.start_date && promo.end_date && ' ~ '}
                              {promo.end_date && `${promo.end_date}`}
                            </p>
                          )}
                          {promo.participation_count > 0 && (
                            <p className="text-xs text-indigo-600 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              참여 {promo.participation_count}명
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleVisible(promo.id, promo.is_visible_to_partners)}
                          title={promo.is_visible_to_partners ? '비공개로 변경' : '파트너에게 공개'}
                        >
                          {promo.is_visible_to_partners
                            ? <><Eye className="w-3 h-3 mr-1" />공개</>
                            : <><EyeOff className="w-3 h-3 mr-1" />비공개</>
                          }
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(promo)}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          수정
                        </Button>
                        {promo.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(promo.id, 'ended')}
                          >
                            종료
                          </Button>
                        )}
                        {promo.status === 'ended' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(promo.id, 'active')}
                          >
                            재시작
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventForm({
  form,
  setField,
  saving,
  onSubmit,
  onCancel,
  title,
  submitLabel,
}: {
  form: FormState
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  saving: boolean
  onSubmit: () => void
  onCancel: () => void
  title: string
  submitLabel: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>파트너 대시보드에 표시될 이벤트를 만드세요</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <EventFormFields form={form} setField={setField} />
        <div className="flex gap-2 pt-2">
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? '저장 중...' : submitLabel}
          </Button>
          <Button variant="outline" onClick={onCancel}>취소</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EventFormFields({
  form,
  setField,
}: {
  form: FormState
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2 md:col-span-2">
        <Label>이벤트 제목 *</Label>
        <Input
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="3월 추천 왕 선발 이벤트"
        />
      </div>

      <div className="space-y-2">
        <Label>이벤트 유형</Label>
        <select
          value={form.promotionType}
          onChange={(e) => setField('promotionType', e.target.value as 'event' | 'bonus' | 'ranking')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="event">이벤트</option>
          <option value="bonus">보너스</option>
          <option value="ranking">랭킹</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>리워드 설명</Label>
        <Input
          value={form.rewardDescription}
          onChange={(e) => setField('rewardDescription', e.target.value)}
          placeholder="스타벅스 아메리카노 쿠폰"
        />
      </div>

      <div className="space-y-2">
        <Label>시작일</Label>
        <Input
          type="date"
          value={form.startDate}
          onChange={(e) => setField('startDate', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>종료일</Label>
        <Input
          type="date"
          value={form.endDate}
          onChange={(e) => setField('endDate', e.target.value)}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>상세 내용</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="이벤트 상세 내용을 입력하세요. 참가 조건, 지급 기준 등을 명확히 작성해주세요."
          rows={8}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={form.isVisible}
          onCheckedChange={(v) => setField('isVisible', v)}
        />
        <Label>파트너에게 공개</Label>
      </div>
    </div>
  )
}
