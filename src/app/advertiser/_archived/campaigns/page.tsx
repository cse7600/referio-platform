'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">캠페인 설정</h1>
          <p className="text-slate-500 mt-1">수수료와 정책을 설정하세요</p>
        </div>
        <Card className="p-6">
          <div className="text-center py-12 text-slate-500">
            <div className="text-5xl mb-4">📢</div>
            <p>캠페인이 없습니다. 새 캠페인을 생성하세요.</p>
            <Button className="mt-4" onClick={() => toast.info('준비 중인 기능입니다')}>캠페인 생성</Button>
          </div>
        </Card>
      </div>
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
          <TabsTrigger value="tier">티어별 단가</TabsTrigger>
          <TabsTrigger value="policy">정책 설정</TabsTrigger>
          <TabsTrigger value="promotions">프로모션</TabsTrigger>
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

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">수수료 설정</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>정산 대행 수수료율 (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={campaign.commission_rate}
                      onChange={(e) =>
                        setCampaign({ ...campaign, commission_rate: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>최소 정산 금액 (원)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₩</span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={campaign.min_settlement}
                      onChange={(e) =>
                        setCampaign({ ...campaign, min_settlement: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 티어별 단가 */}
        <TabsContent value="tier">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">티어별 단가 차등 적용</h3>
                <p className="text-sm text-slate-500">
                  활성화 시 파트너 티어에 따라 다른 단가가 적용됩니다
                </p>
              </div>
              <Switch
                checked={campaign.tier_pricing_enabled}
                onCheckedChange={(checked) =>
                  setCampaign({ ...campaign, tier_pricing_enabled: checked })
                }
              />
            </div>

            {campaign.tier_pricing_enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-slate-500 px-4">
                  <div>티어</div>
                  <div>유효 단가</div>
                  <div>계약 단가</div>
                  <div>최소 계약수</div>
                </div>

                {['authorized', 'silver', 'gold', 'platinum'].map((tier) => {
                  const rule = tierRules.find(r => r.tier === tier)
                  const tierLabels: Record<string, string> = {
                    authorized: 'Authorized',
                    silver: 'Silver',
                    gold: 'Gold',
                    platinum: 'Platinum',
                  }

                  return (
                    <div key={tier} className="grid grid-cols-4 gap-4 items-center p-4 bg-slate-50 rounded-lg">
                      <div>
                        <Badge>{tierLabels[tier]}</Badge>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₩</span>
                        <Input
                          type="number"
                          className="pl-8"
                          value={rule?.valid_amount ?? campaign.valid_amount}
                          onChange={(e) => {
                            const newRules = [...tierRules]
                            const index = newRules.findIndex(r => r.tier === tier)
                            if (index >= 0) {
                              newRules[index] = { ...newRules[index], valid_amount: parseInt(e.target.value) || null }
                            } else {
                              newRules.push({
                                id: '',
                                tier,
                                min_contracts: 0,
                                valid_amount: parseInt(e.target.value) || null,
                                contract_amount: null,
                              })
                            }
                            setTierRules(newRules)
                          }}
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₩</span>
                        <Input
                          type="number"
                          className="pl-8"
                          value={rule?.contract_amount ?? campaign.contract_amount}
                          onChange={(e) => {
                            const newRules = [...tierRules]
                            const index = newRules.findIndex(r => r.tier === tier)
                            if (index >= 0) {
                              newRules[index] = { ...newRules[index], contract_amount: parseInt(e.target.value) || null }
                            } else {
                              newRules.push({
                                id: '',
                                tier,
                                min_contracts: 0,
                                valid_amount: null,
                                contract_amount: parseInt(e.target.value) || null,
                              })
                            }
                            setTierRules(newRules)
                          }}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={rule?.min_contracts ?? 0}
                          onChange={(e) => {
                            const newRules = [...tierRules]
                            const index = newRules.findIndex(r => r.tier === tier)
                            if (index >= 0) {
                              newRules[index] = { ...newRules[index], min_contracts: parseInt(e.target.value) || 0 }
                            } else {
                              newRules.push({
                                id: '',
                                tier,
                                min_contracts: parseInt(e.target.value) || 0,
                                valid_amount: null,
                                contract_amount: null,
                              })
                            }
                            setTierRules(newRules)
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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

        {/* 프로모션 */}
        <TabsContent value="promotions">
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">진행 중인 프로모션</h3>
              <Button variant="outline" size="sm" onClick={() => toast.info('준비 중인 기능입니다')}>
                + 프로모션 추가
              </Button>
            </div>

            {promotions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-4">🎉</div>
                <p>진행 중인 프로모션이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {promotions.map((promo) => (
                  <div key={promo.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{promo.name}</h4>
                        <p className="text-sm text-slate-500">
                          {promo.start_date} ~ {promo.end_date}
                        </p>
                      </div>
                      <Badge className={promo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {promo.is_active ? '진행중' : '종료'}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>유효 +₩{formatCurrency(promo.valid_bonus)}</span>
                      <span>계약 +₩{formatCurrency(promo.contract_bonus)}</span>
                      {promo.target_count && (
                        <span>{promo.target_count}건 이상 시 +₩{formatCurrency(promo.target_bonus || 0)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
