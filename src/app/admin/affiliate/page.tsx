'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Building2,
  Link2,
  Plus,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Save,
  BarChart3,
  MousePointerClick,
  UserCheck,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

interface Campaign {
  id: string
  type: 'partner_recruitment' | 'advertiser_recruitment'
  name: string
  description: string
  landing_path: string
  reward_trigger: 'signup' | 'paid_plan'
  reward_type: 'fixed' | 'recurring_percentage'
  reward_amount: number
  is_active: boolean
  link_count: number
  total_clicks: number
  total_conversions: number
}

interface AffiliateLink {
  id: string
  campaign_id: string
  promoter_type: 'partner' | 'advertiser' | 'external'
  promoter_name: string
  promoter_email: string | null
  short_code: string
  note: string | null
  click_count: number
  conversion_count: number
  is_active: boolean
  created_at: string
  referio_campaigns: {
    id: string
    type: string
    name: string
    landing_path: string
  }
}

const CAMPAIGN_ICONS: Record<string, React.ElementType> = {
  partner_recruitment: Users,
  advertiser_recruitment: Building2,
}

const CAMPAIGN_COLORS: Record<string, string> = {
  partner_recruitment: 'bg-blue-50 border-blue-200',
  advertiser_recruitment: 'bg-orange-50 border-orange-200',
}

const TRIGGER_LABELS: Record<string, string> = {
  signup: '가입 완료 시',
  paid_plan: '유료 플랜 시작 시',
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://referio.co.kr'

export default function AffiliatePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // 링크 생성 다이얼로그
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    campaign_id: '',
    promoter_type: 'external' as 'partner' | 'advertiser' | 'external',
    promoter_name: '',
    promoter_email: '',
    note: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [campaignsRes, linksRes] = await Promise.all([
      fetch('/api/admin/affiliate/campaigns'),
      fetch('/api/admin/affiliate/links'),
    ])
    const campaignsData = await campaignsRes.json()
    const linksData = await linksRes.json()
    setCampaigns(campaignsData.campaigns || [])
    setLinks(linksData.links || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveCampaign = async (campaign: Campaign) => {
    setSavingId(campaign.id)
    const res = await fetch('/api/admin/affiliate/campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        reward_trigger: campaign.reward_trigger,
        reward_type: campaign.reward_type,
        reward_amount: campaign.reward_amount,
        is_active: campaign.is_active,
      }),
    })
    if (res.ok) {
      toast.success('캠페인 설정이 저장되었습니다')
    } else {
      toast.error('저장에 실패했습니다')
    }
    setSavingId(null)
  }

  const updateCampaign = (id: string, patch: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  const handleCreateLink = async () => {
    if (!form.campaign_id || !form.promoter_name) {
      toast.error('캠페인과 프로모터명을 입력해주세요')
      return
    }
    setCreating(true)
    const res = await fetch('/api/admin/affiliate/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: form.campaign_id,
        promoter_type: form.promoter_type,
        promoter_name: form.promoter_name,
        promoter_email: form.promoter_email || undefined,
        note: form.note || undefined,
      }),
    })
    if (res.ok) {
      toast.success('링크가 생성되었습니다')
      setIsCreateOpen(false)
      setForm({ campaign_id: '', promoter_type: 'external', promoter_name: '', promoter_email: '', note: '' })
      fetchData()
    } else {
      const data = await res.json()
      toast.error(data.error || '생성에 실패했습니다')
    }
    setCreating(false)
  }

  const handleToggleLink = async (link: AffiliateLink) => {
    const res = await fetch('/api/admin/affiliate/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: link.id, is_active: !link.is_active }),
    })
    if (res.ok) {
      toast.success(link.is_active ? '링크가 비활성화되었습니다' : '링크가 활성화되었습니다')
      fetchData()
    } else {
      toast.error('상태 변경에 실패했습니다')
    }
  }

  const handleDeleteLink = async (id: string) => {
    if (!confirm('이 링크를 삭제하시겠습니까?')) return
    const res = await fetch(`/api/admin/affiliate/links?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('링크가 삭제되었습니다')
      fetchData()
    } else {
      toast.error('삭제에 실패했습니다')
    }
  }

  const copyLink = (link: AffiliateLink) => {
    const url = `${BASE_URL}${link.referio_campaigns.landing_path}?ref=${link.short_code}`
    navigator.clipboard.writeText(url)
    toast.success('링크가 복사되었습니다')
  }

  const getFullUrl = (link: AffiliateLink) => {
    return `${BASE_URL}${link.referio_campaigns.landing_path}?ref=${link.short_code}`
  }

  const totalClicks = links.reduce((s, l) => s + l.click_count, 0)
  const totalConversions = links.reduce((s, l) => s + l.conversion_count, 0)
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">어필리에이트 캠페인</h1>
          <p className="text-gray-500 mt-1">파트너·광고주 모집 링크 생성 및 성과 관리</p>
        </div>
        <Button variant="outline" onClick={fetchData} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Link2 className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{links.length}</p>
                <p className="text-xs text-gray-500">전체 링크</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <MousePointerClick className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-gray-500">총 클릭</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
                <p className="text-xs text-gray-500">총 전환</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-gray-500">전환율</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">캠페인 설정</TabsTrigger>
          <TabsTrigger value="links">링크 관리</TabsTrigger>
          <TabsTrigger value="stats">성과 현황</TabsTrigger>
        </TabsList>

        {/* ─── 캠페인 설정 탭 ─── */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => {
              const Icon = CAMPAIGN_ICONS[campaign.type]
              const colorClass = CAMPAIGN_COLORS[campaign.type]
              return (
                <Card key={campaign.id} className={`border-2 ${colorClass}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <CardTitle className="text-base">
                          {campaign.type === 'partner_recruitment' ? '파트너 모집' : '광고주 모집'}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{campaign.is_active ? '활성' : '비활성'}</span>
                        <Switch
                          checked={campaign.is_active}
                          onCheckedChange={(v) => updateCampaign(campaign.id, { is_active: v })}
                        />
                      </div>
                    </div>
                    <CardDescription>
                      링크 {campaign.link_count}개 · 클릭 {campaign.total_clicks} · 전환 {campaign.total_conversions}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>캠페인명</Label>
                      <Input
                        value={campaign.name}
                        onChange={(e) => updateCampaign(campaign.id, { name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>설명</Label>
                      <Input
                        value={campaign.description}
                        onChange={(e) => updateCampaign(campaign.id, { description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>보상 조건</Label>
                        <Select
                          value={campaign.reward_trigger}
                          onValueChange={(v) => updateCampaign(campaign.id, { reward_trigger: v as Campaign['reward_trigger'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="signup">가입 완료 시</SelectItem>
                            <SelectItem value="paid_plan">유료 플랜 시작 시</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>보상 방식</Label>
                        <Select
                          value={campaign.reward_type}
                          onValueChange={(v) => updateCampaign(campaign.id, { reward_type: v as Campaign['reward_type'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">고정 금액</SelectItem>
                            <SelectItem value="recurring_percentage">매월 수익 %</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        보상 {campaign.reward_type === 'fixed' ? '금액 (₩)' : '비율 (%)'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {campaign.reward_type === 'fixed' ? '₩' : '%'}
                        </span>
                        <Input
                          type="number"
                          value={campaign.reward_amount}
                          onChange={(e) => updateCampaign(campaign.id, { reward_amount: parseFloat(e.target.value) || 0 })}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-gray-500">
                        랜딩 URL: <code className="bg-gray-100 px-1 py-0.5 rounded">{BASE_URL}{campaign.landing_path}</code>
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => handleSaveCampaign(campaign)}
                        disabled={savingId === campaign.id}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {savingId === campaign.id ? '저장 중...' : '저장'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── 링크 관리 탭 ─── */}
        <TabsContent value="links" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">프로모터별 고유 추적 링크를 생성합니다</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              링크 생성
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>캠페인</TableHead>
                    <TableHead>프로모터</TableHead>
                    <TableHead>링크</TableHead>
                    <TableHead className="text-right">클릭</TableHead>
                    <TableHead className="text-right">전환</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>생성된 링크가 없습니다</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsCreateOpen(true)}>
                          첫 링크 만들기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    links.map((link) => (
                      <TableRow key={link.id} className={!link.is_active ? 'opacity-50' : ''}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {link.referio_campaigns?.type === 'partner_recruitment' ? '파트너' : '광고주'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{link.promoter_name}</p>
                            {link.promoter_email && (
                              <p className="text-xs text-gray-500">{link.promoter_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-[200px] truncate block">
                              {getFullUrl(link)}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => copyLink(link)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{link.click_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{link.conversion_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={link.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {link.is_active ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleLink(link)}
                              title={link.is_active ? '비활성화' : '활성화'}
                            >
                              {link.is_active
                                ? <ToggleRight className="w-4 h-4 text-green-500" />
                                : <ToggleLeft className="w-4 h-4 text-gray-400" />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 성과 현황 탭 ─── */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => {
              const Icon = CAMPAIGN_ICONS[campaign.type]
              const campaignLinks = links.filter(l => l.campaign_id === campaign.id)
              const clicks = campaignLinks.reduce((s, l) => s + l.click_count, 0)
              const conversions = campaignLinks.reduce((s, l) => s + l.conversion_count, 0)
              const rate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0'

              return (
                <Card key={campaign.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="w-5 h-5" />
                      {campaign.name}
                    </CardTitle>
                    <CardDescription>
                      보상: {TRIGGER_LABELS[campaign.reward_trigger]} ₩{campaign.reward_amount.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xl font-bold">{campaignLinks.length}</p>
                        <p className="text-xs text-gray-500">링크 수</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xl font-bold">{clicks.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">클릭</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xl font-bold">{conversions}</p>
                        <p className="text-xs text-gray-500">전환 ({rate}%)</p>
                      </div>
                    </div>

                    {campaignLinks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">프로모터별 성과</p>
                        {campaignLinks
                          .sort((a, b) => b.conversion_count - a.conversion_count)
                          .slice(0, 5)
                          .map((link) => (
                            <div key={link.id} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div>
                                <p className="text-sm font-medium">{link.promoter_name}</p>
                                <p className="text-xs text-gray-500">{link.short_code}</p>
                              </div>
                              <div className="text-right text-sm">
                                <span className="text-gray-600">{link.click_count} 클릭</span>
                                <span className="mx-2 text-gray-300">·</span>
                                <span className="text-green-600 font-medium">{link.conversion_count} 전환</span>
                              </div>
                            </div>
                          ))}
                        {campaignLinks.length > 5 && (
                          <p className="text-xs text-gray-500 text-center">+{campaignLinks.length - 5}개 더</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── 링크 생성 다이얼로그 ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 어필리에이트 링크 생성</DialogTitle>
            <DialogDescription>
              프로모터에게 배포할 고유 추적 링크를 만듭니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>캠페인 선택 *</Label>
              <Select
                value={form.campaign_id}
                onValueChange={(v) => setForm({ ...form, campaign_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="캠페인을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.type === 'partner_recruitment' ? '👥 파트너 모집' : '🏢 광고주 모집'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>프로모터 유형</Label>
              <Select
                value={form.promoter_type}
                onValueChange={(v) => setForm({ ...form, promoter_type: v as typeof form.promoter_type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">외부인 (영업인, 지인 등)</SelectItem>
                  <SelectItem value="partner">기존 파트너</SelectItem>
                  <SelectItem value="advertiser">기존 광고주</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>프로모터 이름 *</Label>
              <Input
                value={form.promoter_name}
                onChange={(e) => setForm({ ...form, promoter_name: e.target.value })}
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-2">
              <Label>이메일 (보상 수령용)</Label>
              <Input
                type="email"
                value={form.promoter_email}
                onChange={(e) => setForm({ ...form, promoter_email: e.target.value })}
                placeholder="hong@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>메모 (내부용)</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="2026 상반기 지인 추천"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreateLink} disabled={creating}>
              {creating ? '생성 중...' : '링크 생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
