'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { JSONContent } from '@tiptap/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, X, Pencil, Users, Eye, EyeOff, Camera, Link, ExternalLink, Gift, Trophy, Zap, Image } from 'lucide-react'

const TiptapEditor = dynamic(() => import('@/components/editor/TiptapEditor'), { ssr: false })

interface Promotion {
  id: string
  title: string
  description: string | null
  promotion_type: 'event' | 'bonus' | 'ranking' | 'post_verification'
  reward_description: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'ended' | 'draft'
  is_visible_to_partners: boolean
  participation_count: number
  created_at: string
  banner_image_url?: string | null
  banner_bg_color?: string | null
  event_link_url?: string | null
}

interface Participation {
  id: string
  partner_name: string
  partner_email: string
  submission_url?: string | null
  note?: string | null
  created_at: string
}

type FormState = {
  title: string
  description: string
  promotionType: 'event' | 'bonus' | 'ranking' | 'post_verification'
  rewardDescription: string
  startDate: string
  endDate: string
  isVisible: boolean
  bannerImageUrl: string
  bannerBgColor: string
  eventLinkUrl: string
}

const TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  event: { label: '이벤트', color: 'bg-purple-100 text-purple-700', icon: <Zap className="w-3 h-3" /> },
  bonus: { label: '보너스', color: 'bg-green-100 text-green-700', icon: <Gift className="w-3 h-3" /> },
  ranking: { label: '랭킹', color: 'bg-orange-100 text-orange-700', icon: <Trophy className="w-3 h-3" /> },
  post_verification: { label: '게시물 인증', color: 'bg-blue-100 text-blue-700', icon: <Camera className="w-3 h-3" /> },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '진행 중', color: 'bg-green-100 text-green-700' },
  ended: { label: '종료', color: 'bg-gray-100 text-gray-500' },
  draft: { label: '임시저장', color: 'bg-yellow-100 text-yellow-700' },
}

const TYPE_EMOJIS: Record<string, string> = {
  event: '🎉',
  bonus: '🎁',
  ranking: '🏆',
  post_verification: '📸',
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
    bannerImageUrl: '',
    bannerBgColor: '#EEF2FF',
    eventLinkUrl: '',
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
    bannerImageUrl: p.banner_image_url || '',
    bannerBgColor: p.banner_bg_color || '#EEF2FF',
    eventLinkUrl: p.event_link_url || '',
  }
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [participationModal, setParticipationModal] = useState<{ id: string; title: string } | null>(null)
  const [participations, setParticipations] = useState<Participation[]>([])
  const [loadingParticipations, setLoadingParticipations] = useState(false)

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

  const fetchParticipations = async (promotionId: string) => {
    setLoadingParticipations(true)
    try {
      const res = await fetch(`/api/advertiser/promotions/${promotionId}/participations`)
      if (res.ok) {
        const data = await res.json()
        setParticipations(data.participations || [])
      } else {
        setParticipations([])
      }
    } catch {
      setParticipations([])
    }
    setLoadingParticipations(false)
  }

  const openParticipationModal = (promo: Promotion) => {
    setParticipationModal({ id: promo.id, title: promo.title })
    fetchParticipations(promo.id)
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
          banner_image_url: form.bannerImageUrl || null,
          banner_bg_color: form.bannerBgColor || null,
          event_link_url: form.eventLinkUrl || null,
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
          banner_image_url: form.bannerImageUrl || null,
          banner_bg_color: form.bannerBgColor || null,
          event_link_url: form.eventLinkUrl || null,
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
            const typeInfo = TYPE_LABELS[promo.promotion_type] ?? TYPE_LABELS.event
            const statusInfo = STATUS_LABELS[promo.status]
            const isEditing = editingId === promo.id
            const bgColor = promo.banner_bg_color || '#EEF2FF'

            return (
              <Card key={promo.id} className={`overflow-hidden rounded-xl ${isEditing ? 'ring-2 ring-indigo-500' : ''}`}>
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
                  <CardContent className="pt-0 p-0">
                    {/* Banner color strip */}
                    <div
                      className="flex items-center justify-between px-5 py-4"
                      style={{ backgroundColor: bgColor }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`${typeInfo.color} flex items-center gap-1`}>
                            {typeInfo.icon}
                            {typeInfo.label}
                          </Badge>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          {!promo.is_visible_to_partners && (
                            <Badge className="bg-slate-100 text-slate-500">비공개</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 text-base">{promo.title}</h3>
                        {promo.reward_description && (
                          <p className="text-sm text-slate-600 mt-0.5">
                            <span className="font-medium">리워드:</span> {promo.reward_description}
                          </p>
                        )}
                      </div>
                      {/* Banner image or emoji */}
                      <div className="ml-4 shrink-0 w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center bg-white/50 text-2xl">
                        {promo.banner_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={promo.banner_image_url}
                            alt="배너"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          TYPE_EMOJIS[promo.promotion_type] ?? '🎉'
                        )}
                      </div>
                    </div>

                    {/* Bottom section */}
                    <div className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        {(promo.start_date || promo.end_date) && (
                          <span>
                            {promo.start_date && `${promo.start_date}`}
                            {promo.start_date && promo.end_date && ' ~ '}
                            {promo.end_date && `${promo.end_date}`}
                          </span>
                        )}
                        <span>
                          게시 {new Date(promo.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                        {promo.participation_count > 0 ? (
                          <button
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 cursor-pointer underline-offset-2 hover:underline"
                            onClick={() => openParticipationModal(promo)}
                          >
                            <Users className="w-3 h-3" />
                            참여 {promo.participation_count}명 보기
                          </button>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            참여자 없음
                          </span>
                        )}
                        {promo.event_link_url && (
                          <a
                            href={promo.event_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                            링크
                          </a>
                        )}
                        {promo.description && (
                          <span className="text-slate-400 text-xs">상세 내용 있음</span>
                        )}
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

      {/* 참여자 목록 모달 */}
      {participationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-semibold text-slate-900">참여자 목록</h2>
                <p className="text-sm text-slate-500">{participationModal.title}</p>
              </div>
              <button
                className="p-1 rounded hover:bg-slate-100"
                onClick={() => { setParticipationModal(null); setParticipations([]) }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {loadingParticipations ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-slate-100 rounded" />
                  ))}
                </div>
              ) : participations.length === 0 ? (
                <p className="text-center text-slate-400 py-8">참여자가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {participations.map((p) => (
                    <div key={p.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{p.partner_name}</p>
                          <p className="text-xs text-slate-500">{p.partner_email}</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(p.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      {p.submission_url && (
                        <a
                          href={p.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 truncate"
                        >
                          <Link className="w-3 h-3 shrink-0" />
                          {p.submission_url}
                        </a>
                      )}
                      {p.note && (
                        <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded p-2">{p.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
      {/* Title */}
      <div className="space-y-2 md:col-span-2">
        <Label>이벤트 제목 *</Label>
        <Input
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="3월 추천 왕 선발 이벤트"
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>이벤트 유형</Label>
        <select
          value={form.promotionType}
          onChange={(e) => setField('promotionType', e.target.value as FormState['promotionType'])}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="event">이벤트</option>
          <option value="bonus">보너스</option>
          <option value="ranking">랭킹</option>
          <option value="post_verification">게시물 인증</option>
        </select>
      </div>

      {/* Reward */}
      <div className="space-y-2">
        <Label>리워드 설명</Label>
        <Input
          value={form.rewardDescription}
          onChange={(e) => setField('rewardDescription', e.target.value)}
          placeholder="스타벅스 아메리카노 쿠폰"
        />
      </div>

      {/* Dates */}
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

      {/* Description */}
      <div className="space-y-2 md:col-span-2">
        <Label>상세 내용</Label>
        <TiptapEditor
          content={(() => {
            if (!form.description) return null;
            try { return JSON.parse(form.description) as JSONContent; } catch { return null; }
          })()}
          onChange={(json) => setField('description', JSON.stringify(json))}
          placeholder="이벤트 상세 내용을 입력하세요. 이미지 삽입, 텍스트 서식 등을 활용하세요."
        />
      </div>

      {/* post_verification notice */}
      {form.promotionType === 'post_verification' && (
        <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">게시물 인증 이벤트 안내</p>
          <p>파트너가 블로그/SNS 게시물 링크와 메모를 입력하여 참여합니다. 파트너 대시보드에 제출 양식이 자동으로 표시됩니다.</p>
        </div>
      )}

      {/* Banner settings section */}
      <div className="md:col-span-2 border-t pt-4 mt-2">
        <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Image className="w-4 h-4" />
          배너 설정 (선택 사항)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>배너 이미지 URL</Label>
            <Input
              value={form.bannerImageUrl}
              onChange={(e) => setField('bannerImageUrl', e.target.value)}
              placeholder="https://example.com/banner.png"
            />
            <p className="text-xs text-slate-400">이미지가 없으면 이벤트 유형 이모지가 표시됩니다</p>
          </div>

          <div className="space-y-2">
            <Label>배너 배경색</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.bannerBgColor}
                onChange={(e) => setField('bannerBgColor', e.target.value)}
                className="w-10 h-10 rounded border border-input cursor-pointer p-0.5"
              />
              <Input
                value={form.bannerBgColor}
                onChange={(e) => setField('bannerBgColor', e.target.value)}
                placeholder="#EEF2FF"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              이벤트 링크 URL
            </Label>
            <Input
              value={form.eventLinkUrl}
              onChange={(e) => setField('eventLinkUrl', e.target.value)}
              placeholder="https://... (더 알아보기 링크)"
            />
          </div>
        </div>
      </div>

      {/* Live banner preview */}
      <div className="md:col-span-2 border-t pt-4 mt-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">미리보기 — 파트너에게 이렇게 보입니다</p>
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ backgroundColor: form.bannerBgColor || '#EEF2FF' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_LABELS[form.promotionType]?.color ?? 'bg-purple-100 text-purple-700'}`}>
                {TYPE_LABELS[form.promotionType]?.icon}
                {TYPE_LABELS[form.promotionType]?.label ?? '이벤트'}
              </span>
            </div>
            <p className="font-semibold text-slate-900 text-sm truncate">
              {form.title || '이벤트 제목'}
            </p>
            {form.rewardDescription && (
              <p className="text-xs text-slate-600 mt-0.5">
                리워드: {form.rewardDescription}
              </p>
            )}
          </div>
          <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-white/50 text-xl">
            {form.bannerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.bannerImageUrl}
                alt="배너 미리보기"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              TYPE_EMOJIS[form.promotionType] ?? '🎉'
            )}
          </div>
        </div>
      </div>

      {/* Visibility toggle */}
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
