'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { PlusCircle, Loader2 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  is_active: boolean
  valid_amount: number
  contract_amount: number
  tier_pricing_enabled: boolean
  landing_url: string | null
  commission_rate: number
  min_settlement: number
  duplicate_check_days: number
  valid_deadline_days: number
  contract_deadline_days: number
}

interface TierRule {
  id: string
  tier: string
  min_contracts: number
  valid_amount: number | null
  contract_amount: number | null
}

interface Promotion {
  id: string
  name: string
  start_date: string
  end_date: string
  valid_bonus: number
  contract_bonus: number
  target_count: number | null
  target_bonus: number | null
  target_partners: string
  is_active: boolean
}

export default function AdvertiserCampaignsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [tierRules, setTierRules] = useState<TierRule[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 캠페인 생성 다이얼로그
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCampaign()
  }, [])

  const fetchCampaign = async () => {
    try {
      const response = await fetch('/api/advertiser/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaign(data.campaign)
        setTierRules(data.tierRules || [])
        setPromotions(data.promotions || [])
      }
    } catch (error) {
      console.error('Campaign fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newCampaignName.trim()) {
      toast.error('캠페인 이름을 입력해주세요')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/advertiser/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      })
      if (res.ok) {
        toast.success('캠페인이 생성되었습니다')
        setShowCreateDialog(false)
        setNewCampaignName('')
        setLoading(true)
        await fetchCampaign()
      } else {
        const data = await res.json()
        toast.error(data.error || '캠페인 생성에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setCreating(false)
  }

  const handleSave = async () => {
    if (!campaign) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/advertiser/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, tierRules }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '설정이 저장되었습니다' })
      } else {
        setMessage({ type: 'error', text: '저장에 실패했습니다' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (!campaign) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">캠페인 설정</h1>
            <p className="text-slate-500 mt-1">수수료와 정책을 설정하세요</p>
          </div>
          <Card className="p-6">
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-4">📢</div>
              <p className="font-medium text-slate-700 mb-1">아직 캠페인이 없습니다</p>
              <p className="text-sm mb-6">캠페인을 생성하면 파트너 수수료와 정책을 설정할 수 있습니다.</p>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowCreateDialog(true)}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                첫 캠페인 만들기
              </Button>
            </div>
          </Card>
        </div>

        {/* 캠페인 생성 다이얼로그 */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>새 캠페인 생성</DialogTitle>
              <DialogDescription>
                캠페인 이름을 입력하세요. 생성 후 수수료와 정책을 자세히 설정할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="campaign-name">캠페인 이름</Label>
              <Input
                id="campaign-name"
                value={newCampaignName}
                onChange={e => setNewCampaignName(e.target.value)}
                placeholder="예: 파트너 추천 프로그램 2026"
                className="mt-2"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
                취소
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreate}
                disabled={creating || !newCampaignName.trim()}
              >
                {creating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />생성 중...</>
                ) : (
                  '생성하기'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">캠페인 설정</h1>
          <p className="text-slate-500 mt-1">수수료와 정책을 설정하세요</p>
        </div>
        <div className="flex items-center gap-4">
          {message && (
            <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">기본 설정</TabsTrigger>
          <TabsTrigger value="policy">정책 설정</TabsTrigger>
        </TabsList>

        {/* 기본 설정 */}
        <TabsContent value="basic">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">캠페인 활성화</h3>
                <p className="text-sm text-slate-500">비활성화 시 새 정산이 생성되지 않습니다</p>
              </div>
              <Switch
                checked={campaign.is_active}
                onCheckedChange={(checked) =>
                  setCampaign({ ...campaign, is_active: checked })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>캠페인 이름</Label>
                <Input
                  value={campaign.name}
                  onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>랜딩 URL</Label>
                <Input
                  value={campaign.landing_url || ''}
                  onChange={(e) => setCampaign({ ...campaign, landing_url: e.target.value })}
                  placeholder="https://example.com/landing"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">기본 단가 설정</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>유효 단가 (원)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₩</span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={campaign.valid_amount}
                      onChange={(e) =>
                        setCampaign({ ...campaign, valid_amount: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-500">DB 유효 확인 시 파트너에게 지급</p>
                </div>

                <div className="space-y-2">
                  <Label>계약 단가 (원)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₩</span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={campaign.contract_amount}
                      onChange={(e) =>
                        setCampaign({ ...campaign, contract_amount: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-500">계약 완료 시 파트너에게 지급</p>
                </div>
              </div>
            </div>

          </Card>
        </TabsContent>

        {/* 정책 설정 */}
        <TabsContent value="policy">
          <Card className="p-6 space-y-6">
            <h3 className="font-medium">정책 설정</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>중복 체크 기간 (일)</Label>
                <Input
                  type="number"
                  value={campaign.duplicate_check_days}
                  onChange={(e) =>
                    setCampaign({ ...campaign, duplicate_check_days: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-slate-500">동일 연락처 중복 체크 기간</p>
              </div>

              <div className="space-y-2">
                <Label>유효 판정 기한 (일)</Label>
                <Input
                  type="number"
                  value={campaign.valid_deadline_days}
                  onChange={(e) =>
                    setCampaign({ ...campaign, valid_deadline_days: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-slate-500">유입 후 유효 판단까지</p>
              </div>

              <div className="space-y-2">
                <Label>계약 완료 기한 (일)</Label>
                <Input
                  type="number"
                  value={campaign.contract_deadline_days}
                  onChange={(e) =>
                    setCampaign({ ...campaign, contract_deadline_days: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-slate-500">유효 후 계약 완료까지</p>
              </div>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
