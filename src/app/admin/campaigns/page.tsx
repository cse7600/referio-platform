'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Gift,
  Crown,
  Calendar,
  Target,
  Percent,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Campaign, Promotion, TierRule, PartnerTier } from '@/types/database'

const TIERS: { id: PartnerTier; label: string; color: string }[] = [
  { id: 'authorized', label: 'Authorized', color: 'bg-gray-100 text-gray-700' },
  { id: 'silver', label: 'Silver', color: 'bg-gray-200 text-gray-800' },
  { id: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'platinum', label: 'Platinum', color: 'bg-purple-100 text-purple-800' },
]

export default function AdminCampaignsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [tierRules, setTierRules] = useState<TierRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 프로모션 다이얼로그
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [promoForm, setPromoForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    valid_bonus: 0,
    contract_bonus: 0,
    target_count: '',
    target_bonus: '',
    target_partners: 'all',
  })

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    // 활성 캠페인 조회
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .single()

    if (campaignData) {
      setCampaign(campaignData)

      // 프로모션 조회
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .order('created_at', { ascending: false })

      setPromotions(promoData || [])

      // 티어 규칙 조회
      const { data: tierData } = await supabase
        .from('tier_rules')
        .select('*')
        .eq('campaign_id', campaignData.id)

      setTierRules(tierData || [])
    }

    setLoading(false)
  }

  const handleSaveCampaign = async () => {
    if (!campaign) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('campaigns')
      .update({
        name: campaign.name,
        valid_amount: campaign.valid_amount,
        contract_amount: campaign.contract_amount,
        tier_pricing_enabled: campaign.tier_pricing_enabled,
        landing_url: campaign.landing_url,
        commission_rate: campaign.commission_rate,
        min_settlement: campaign.min_settlement,
        duplicate_check_days: campaign.duplicate_check_days,
        valid_deadline_days: campaign.valid_deadline_days,
        contract_deadline_days: campaign.contract_deadline_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id)

    if (error) {
      toast.error('캠페인 저장에 실패했습니다')
    } else {
      toast.success('캠페인이 저장되었습니다')
    }

    setSaving(false)
  }

  const handleSaveTierRules = async () => {
    if (!campaign) return

    setSaving(true)
    const supabase = createClient()

    for (const rule of tierRules) {
      const { error } = await supabase
        .from('tier_rules')
        .update({
          valid_amount: rule.valid_amount,
          contract_amount: rule.contract_amount,
          min_contracts: rule.min_contracts,
        })
        .eq('id', rule.id)

      if (error) {
        toast.error(`${rule.tier} 티어 저장 실패`)
        setSaving(false)
        return
      }
    }

    toast.success('티어별 단가가 저장되었습니다')
    setSaving(false)
  }

  const openPromoDialog = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo)
      setPromoForm({
        name: promo.name,
        start_date: promo.start_date,
        end_date: promo.end_date,
        valid_bonus: promo.valid_bonus,
        contract_bonus: promo.contract_bonus,
        target_count: promo.target_count?.toString() || '',
        target_bonus: promo.target_bonus?.toString() || '',
        target_partners: promo.target_partners,
      })
    } else {
      setEditingPromo(null)
      setPromoForm({
        name: '',
        start_date: '',
        end_date: '',
        valid_bonus: 0,
        contract_bonus: 0,
        target_count: '',
        target_bonus: '',
        target_partners: 'all',
      })
    }
    setIsPromoDialogOpen(true)
  }

  const handleSavePromotion = async () => {
    if (!campaign || !promoForm.name || !promoForm.start_date || !promoForm.end_date) {
      toast.error('필수 항목을 입력해주세요')
      return
    }

    const supabase = createClient()

    const promoData = {
      campaign_id: campaign.id,
      name: promoForm.name,
      start_date: promoForm.start_date,
      end_date: promoForm.end_date,
      valid_bonus: promoForm.valid_bonus || 0,
      contract_bonus: promoForm.contract_bonus || 0,
      target_count: promoForm.target_count ? parseInt(promoForm.target_count) : null,
      target_bonus: promoForm.target_bonus ? parseInt(promoForm.target_bonus) : null,
      target_partners: promoForm.target_partners,
      is_active: true,
    }

    let error

    if (editingPromo) {
      const result = await supabase
        .from('promotions')
        .update(promoData)
        .eq('id', editingPromo.id)
      error = result.error
    } else {
      const result = await supabase.from('promotions').insert(promoData)
      error = result.error
    }

    if (error) {
      toast.error('프로모션 저장에 실패했습니다')
    } else {
      toast.success(editingPromo ? '프로모션이 수정되었습니다' : '프로모션이 생성되었습니다')
      setIsPromoDialogOpen(false)
      fetchData()
    }
  }

  const handleDeletePromotion = async (promoId: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promoId)

    if (error) {
      toast.error('프로모션 삭제에 실패했습니다')
    } else {
      toast.success('프로모션이 삭제되었습니다')
      fetchData()
    }
  }

  const handleTogglePromotion = async (promo: Promotion) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id)

    if (error) {
      toast.error('상태 변경에 실패했습니다')
    } else {
      toast.success(promo.is_active ? '프로모션이 비활성화되었습니다' : '프로모션이 활성화되었습니다')
      fetchData()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  const isPromoActive = (promo: Promotion) => {
    const today = new Date().toISOString().split('T')[0]
    return promo.is_active && promo.start_date <= today && promo.end_date >= today
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">활성 캠페인이 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">캠페인 설정</h1>
          <p className="text-gray-500 mt-1">정산 단가, 프로모션, 정책 관리</p>
        </div>
        <Button onClick={handleSaveCampaign} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">
            <Settings className="w-4 h-4 mr-2" />
            기본 설정
          </TabsTrigger>
          <TabsTrigger value="tier">
            <Crown className="w-4 h-4 mr-2" />
            티어별 단가
          </TabsTrigger>
          <TabsTrigger value="promotions">
            <Gift className="w-4 h-4 mr-2" />
            프로모션
          </TabsTrigger>
          <TabsTrigger value="policy">
            <Clock className="w-4 h-4 mr-2" />
            정책
          </TabsTrigger>
        </TabsList>

        {/* 기본 설정 탭 */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 단가 설정</CardTitle>
              <CardDescription>유효/계약 시 기본 정산 금액</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>유효 단가</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₩</span>
                    <Input
                      type="number"
                      value={campaign.valid_amount}
                      onChange={(e) => setCampaign({ ...campaign, valid_amount: parseInt(e.target.value) || 0 })}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>계약 단가</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₩</span>
                    <Input
                      type="number"
                      value={campaign.contract_amount}
                      onChange={(e) => setCampaign({ ...campaign, contract_amount: parseInt(e.target.value) || 0 })}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>정산 수수료율</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={campaign.commission_rate}
                      onChange={(e) => setCampaign({ ...campaign, commission_rate: parseFloat(e.target.value) || 0 })}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">랜딩 URL</CardTitle>
              <CardDescription>고객 유입 폼 기본 URL</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={campaign.landing_url || ''}
                onChange={(e) => setCampaign({ ...campaign, landing_url: e.target.value })}
                placeholder="https://referio.puzl.co.kr/security"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 티어별 단가 탭 */}
        <TabsContent value="tier" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">티어별 단가 차등</CardTitle>
                  <CardDescription>티어마다 다른 정산 금액을 적용합니다</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {campaign.tier_pricing_enabled ? '활성' : '비활성'}
                  </span>
                  <Button
                    variant={campaign.tier_pricing_enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCampaign({ ...campaign, tier_pricing_enabled: !campaign.tier_pricing_enabled })}
                  >
                    {campaign.tier_pricing_enabled ? '켜짐' : '꺼짐'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {campaign.tier_pricing_enabled ? (
                <div className="space-y-4">
                  {tierRules.map((rule) => {
                    const tierInfo = TIERS.find(t => t.id === rule.tier)
                    return (
                      <div key={rule.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <Badge className={tierInfo?.color || ''}>
                          {tierInfo?.label || rule.tier}
                        </Badge>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">최소 계약 수</Label>
                            <Input
                              type="number"
                              value={rule.min_contracts}
                              onChange={(e) => {
                                const updated = tierRules.map(r =>
                                  r.id === rule.id ? { ...r, min_contracts: parseInt(e.target.value) || 0 } : r
                                )
                                setTierRules(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">유효 단가</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₩</span>
                              <Input
                                type="number"
                                value={rule.valid_amount || ''}
                                onChange={(e) => {
                                  const updated = tierRules.map(r =>
                                    r.id === rule.id ? { ...r, valid_amount: parseInt(e.target.value) || null } : r
                                  )
                                  setTierRules(updated)
                                }}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">계약 단가</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₩</span>
                              <Input
                                type="number"
                                value={rule.contract_amount || ''}
                                onChange={(e) => {
                                  const updated = tierRules.map(r =>
                                    r.id === rule.id ? { ...r, contract_amount: parseInt(e.target.value) || null } : r
                                  )
                                  setTierRules(updated)
                                }}
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <Button onClick={handleSaveTierRules} disabled={saving} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    티어별 단가 저장
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Crown className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>티어별 단가 차등이 비활성화되어 있습니다.</p>
                  <p className="text-sm">활성화하면 티어마다 다른 정산 금액을 적용할 수 있습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 프로모션 탭 */}
        <TabsContent value="promotions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">프로모션 관리</CardTitle>
                  <CardDescription>기간별 추가 보너스 이벤트</CardDescription>
                </div>
                {mounted && (
                  <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openPromoDialog()}>
                        <Plus className="w-4 h-4 mr-2" />
                        프로모션 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{editingPromo ? '프로모션 수정' : '새 프로모션'}</DialogTitle>
                        <DialogDescription>
                          기간과 보너스 금액을 설정하세요
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>프로모션명 *</Label>
                          <Input
                            value={promoForm.name}
                            onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                            placeholder="2월 신규 파트너 부스트"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>시작일 *</Label>
                            <Input
                              type="date"
                              value={promoForm.start_date}
                              onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>종료일 *</Label>
                            <Input
                              type="date"
                              value={promoForm.end_date}
                              onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>유효 보너스</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">+₩</span>
                              <Input
                                type="number"
                                value={promoForm.valid_bonus}
                                onChange={(e) => setPromoForm({ ...promoForm, valid_bonus: parseInt(e.target.value) || 0 })}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>계약 보너스</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">+₩</span>
                              <Input
                                type="number"
                                value={promoForm.contract_bonus}
                                onChange={(e) => setPromoForm({ ...promoForm, contract_bonus: parseInt(e.target.value) || 0 })}
                                className="pl-10"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>목표 건수</Label>
                            <Input
                              type="number"
                              value={promoForm.target_count}
                              onChange={(e) => setPromoForm({ ...promoForm, target_count: e.target.value })}
                              placeholder="10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>목표 달성 보너스</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">+₩</span>
                              <Input
                                type="number"
                                value={promoForm.target_bonus}
                                onChange={(e) => setPromoForm({ ...promoForm, target_bonus: e.target.value })}
                                className="pl-10"
                                placeholder="50000"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>대상 파트너</Label>
                          <Select
                            value={promoForm.target_partners}
                            onValueChange={(value) => setPromoForm({ ...promoForm, target_partners: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체 파트너</SelectItem>
                              <SelectItem value="new">신규 파트너만</SelectItem>
                              <SelectItem value="tier:authorized">Authorized 티어</SelectItem>
                              <SelectItem value="tier:silver">Silver 티어</SelectItem>
                              <SelectItem value="tier:gold">Gold 티어</SelectItem>
                              <SelectItem value="tier:platinum">Platinum 티어</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPromoDialogOpen(false)}>
                          취소
                        </Button>
                        <Button onClick={handleSavePromotion}>
                          {editingPromo ? '수정' : '생성'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>등록된 프로모션이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotions.map((promo) => {
                    const active = isPromoActive(promo)
                    return (
                      <div
                        key={promo.id}
                        className={`p-4 rounded-lg border-2 ${
                          active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {active ? (
                                <Badge className="bg-green-100 text-green-700">진행 중</Badge>
                              ) : promo.is_active ? (
                                <Badge className="bg-blue-100 text-blue-700">예정</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">비활성</Badge>
                              )}
                              <h3 className="font-semibold">{promo.name}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {promo.start_date} ~ {promo.end_date}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600">유효 +₩{formatCurrency(promo.valid_bonus)}</span>
                              <span className="text-purple-600">계약 +₩{formatCurrency(promo.contract_bonus)}</span>
                              {promo.target_count && promo.target_bonus && (
                                <span className="text-orange-600">
                                  {promo.target_count}건 달성 시 +₩{formatCurrency(promo.target_bonus)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTogglePromotion(promo)}
                            >
                              {promo.is_active ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPromoDialog(promo)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePromotion(promo.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정책 탭 */}
        <TabsContent value="policy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">정책 설정</CardTitle>
              <CardDescription>운영 정책 및 기한 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    중복 체크 기간
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={campaign.duplicate_check_days}
                      onChange={(e) => setCampaign({ ...campaign, duplicate_check_days: parseInt(e.target.value) || 0 })}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">일</span>
                  </div>
                  <p className="text-xs text-gray-500">동일 연락처가 이 기간 내에 있으면 중복 처리</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    유효 판정 기한
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={campaign.valid_deadline_days}
                      onChange={(e) => setCampaign({ ...campaign, valid_deadline_days: parseInt(e.target.value) || 0 })}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">일</span>
                  </div>
                  <p className="text-xs text-gray-500">유입 후 유효 판단까지의 마감 기한</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    계약 완료 기한
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={campaign.contract_deadline_days}
                      onChange={(e) => setCampaign({ ...campaign, contract_deadline_days: parseInt(e.target.value) || 0 })}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">일</span>
                  </div>
                  <p className="text-xs text-gray-500">유효 후 계약 완료까지의 마감 기한</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    최소 정산 금액
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₩</span>
                    <Input
                      type="number"
                      value={campaign.min_settlement}
                      onChange={(e) => setCampaign({ ...campaign, min_settlement: parseInt(e.target.value) || 0 })}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500">이 금액 이상일 때 정산 진행</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
