'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Building2,
  Users,
  FileCheck,
  Wallet,
  Settings,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'

interface AdvertiserRow {
  id: string
  advertiser_id: string
  company_name: string
  logo_url: string | null
  primary_color: string | null
  inquiry_form_enabled: boolean | null
  program_name: string | null
  program_description: string | null
  contact_phone: string | null
  contact_email: string | null
  created_at: string
  // 집계
  partner_count: number
  referral_count: number
  valid_count: number
  contract_count: number
  pending_settlement: number
  completed_settlement: number
  // 캠페인
  campaign_name: string | null
  valid_amount: number | null
  contract_amount: number | null
  campaign_active: boolean | null
}

export default function AdminAdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<AdvertiserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<AdvertiserRow | null>(null)

  useEffect(() => {
    fetchAdvertisers()
  }, [])

  const fetchAdvertisers = async () => {
    const supabase = createClient()

    // 광고주 목록
    const { data: adList } = await supabase
      .from('advertisers')
      .select('*')
      .order('created_at', { ascending: false })

    if (!adList) {
      setLoading(false)
      return
    }

    // 각 광고주별 집계
    const rows: AdvertiserRow[] = await Promise.all(
      adList.map(async (ad) => {
        // 파트너 참여 수
        const { count: partnerCount } = await supabase
          .from('partner_programs')
          .select('*', { count: 'exact', head: true })
          .eq('advertiser_id', ad.id)

        // 리드 집계
        const { data: referrals } = await supabase
          .from('referrals')
          .select('id, is_valid, contract_status')
          .eq('advertiser_id', ad.id)

        const referral_count = referrals?.length || 0
        const valid_count = referrals?.filter(r => r.is_valid === true).length || 0
        const contract_count = referrals?.filter(r => r.contract_status === 'completed').length || 0

        // 정산 집계
        const { data: settlements } = await supabase
          .from('settlements')
          .select('status, amount')
          .eq('advertiser_id', ad.id)

        const pending_settlement = settlements
          ?.filter(s => s.status === 'pending')
          .reduce((sum, s) => sum + (s.amount || 0), 0) || 0
        const completed_settlement = settlements
          ?.filter(s => s.status === 'completed')
          .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

        // 캠페인 정보
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('name, valid_amount, contract_amount, is_active')
          .eq('advertiser_id', ad.id)
          .eq('is_active', true)
          .maybeSingle()

        return {
          id: ad.id,
          advertiser_id: ad.advertiser_id,
          company_name: ad.company_name,
          logo_url: ad.logo_url,
          primary_color: ad.primary_color,
          inquiry_form_enabled: ad.inquiry_form_enabled,
          program_name: ad.program_name,
          program_description: ad.program_description,
          contact_phone: ad.contact_phone,
          contact_email: ad.contact_email,
          created_at: ad.created_at,
          partner_count: partnerCount || 0,
          referral_count,
          valid_count,
          contract_count,
          pending_settlement,
          completed_settlement,
          campaign_name: campaign?.name || null,
          valid_amount: campaign?.valid_amount || null,
          contract_amount: campaign?.contract_amount || null,
          campaign_active: campaign?.is_active || null,
        }
      })
    )

    setAdvertisers(rows)
    setLoading(false)
  }

  const filtered = searchTerm
    ? advertisers.filter(a =>
        a.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.advertiser_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : advertisers

  const formatCurrency = (n: number) => `₩${n.toLocaleString('ko-KR')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">광고주 관리</h1>
        <p className="text-gray-500 mt-1">전체 {advertisers.length}개 광고주 현황</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">전체 광고주</p>
            <p className="text-2xl font-bold text-blue-600">{advertisers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">총 파트너 참여</p>
            <p className="text-2xl font-bold text-green-600">
              {advertisers.reduce((s, a) => s + a.partner_count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">총 리드</p>
            <p className="text-2xl font-bold text-purple-600">
              {advertisers.reduce((s, a) => s + a.referral_count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">완료 정산 합계</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(advertisers.reduce((s, a) => s + a.completed_settlement, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="광고주명 또는 ID로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 광고주 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">광고주 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>광고주</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>캠페인</TableHead>
                  <TableHead className="text-center">파트너</TableHead>
                  <TableHead className="text-center">리드</TableHead>
                  <TableHead className="text-center">유효</TableHead>
                  <TableHead className="text-center">계약</TableHead>
                  <TableHead>대기 정산</TableHead>
                  <TableHead>완료 정산</TableHead>
                  <TableHead>문의폼</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                      광고주가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ad) => (
                    <TableRow
                      key={ad.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelected(ad)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ad.logo_url ? (
                            <img src={ad.logo_url} alt="" className="w-7 h-7 rounded object-contain border" />
                          ) : (
                            <div
                              className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: ad.primary_color || '#6366f1' }}
                            >
                              {ad.company_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{ad.company_name}</p>
                            {ad.program_name && (
                              <p className="text-xs text-gray-400">{ad.program_name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{ad.advertiser_id}</code>
                      </TableCell>
                      <TableCell>
                        {ad.campaign_name ? (
                          <div>
                            <p className="text-sm">{ad.campaign_name}</p>
                            <p className="text-xs text-gray-400">
                              유효 {formatCurrency(ad.valid_amount || 0)} / 계약 {formatCurrency(ad.contract_amount || 0)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">미설정</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">{ad.partner_count}</TableCell>
                      <TableCell className="text-center font-medium">{ad.referral_count}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{ad.valid_count}</TableCell>
                      <TableCell className="text-center text-purple-600 font-medium">{ad.contract_count}</TableCell>
                      <TableCell className="text-orange-600 text-sm">{formatCurrency(ad.pending_settlement)}</TableCell>
                      <TableCell className="text-green-600 text-sm">{formatCurrency(ad.completed_settlement)}</TableCell>
                      <TableCell>
                        {ad.inquiry_form_enabled === false ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 광고주 상세 다이얼로그 */}
      {selected && (
        <AdvertiserDetailDialog
          advertiser={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function AdvertiserDetailDialog({
  advertiser,
  onClose,
}: {
  advertiser: AdvertiserRow
  onClose: () => void
}) {
  const [partners, setPartners] = useState<{ id: string; name: string; email: string; status: string; tier: string; referral_code: string }[]>([])
  const [referrals, setReferrals] = useState<{ id: string; name: string; phone: string; contract_status: string; is_valid: boolean; created_at: string; partner_name: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      // 참여 파트너
      const { data: pp } = await supabase
        .from('partner_programs')
        .select(`
          partner_id,
          referral_code,
          status,
          partners (id, name, email, status, tier)
        `)
        .eq('advertiser_id', advertiser.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPartners(
        (pp || []).map((p: any) => {
          const partner = Array.isArray(p.partners) ? p.partners[0] : p.partners
          return {
            id: p.partner_id,
            name: partner?.name || '-',
            email: partner?.email || '-',
            status: p.status || partner?.status || '-',
            tier: partner?.tier || '-',
            referral_code: p.referral_code,
          }
        })
      )

      // 리드
      const { data: refs } = await supabase
        .from('referrals')
        .select(`
          id, name, phone, contract_status, is_valid, created_at,
          partners (name)
        `)
        .eq('advertiser_id', advertiser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setReferrals(
        (refs || []).map((r: any) => {
          const partner = Array.isArray(r.partners) ? r.partners[0] : r.partners
          return {
            id: r.id,
            name: r.name,
            phone: r.phone,
            contract_status: r.contract_status,
            is_valid: r.is_valid,
            created_at: r.created_at,
            partner_name: partner?.name || null,
          }
        })
      )

      setLoading(false)
    }
    load()
  }, [advertiser.id])

  const statusLabel: Record<string, string> = {
    pending: '대기', new_contact: '신규', first_call: '1차통화',
    second_call: '2차통화', third_call: '3차통화', completed: '계약완료',
    invalid: '무효', duplicate: '중복',
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {advertiser.logo_url ? (
              <img src={advertiser.logo_url} alt="" className="w-8 h-8 rounded object-contain border" />
            ) : (
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: advertiser.primary_color || '#6366f1' }}
              >
                {advertiser.company_name.charAt(0)}
              </div>
            )}
            {advertiser.company_name}
            <code className="text-sm font-normal bg-gray-100 px-2 py-0.5 rounded">{advertiser.advertiser_id}</code>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">기본 정보</TabsTrigger>
            <TabsTrigger value="partners">
              참여 파트너 ({advertiser.partner_count})
            </TabsTrigger>
            <TabsTrigger value="referrals">
              리드 ({advertiser.referral_count})
            </TabsTrigger>
          </TabsList>

          {/* 기본 정보 탭 */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">설정</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">프로그램명</span>
                      <span className="font-medium">{advertiser.program_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">연락처</span>
                      <span className="font-medium">{advertiser.contact_phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">문의 이메일</span>
                      <span className="font-medium">{advertiser.contact_email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">문의폼 활성</span>
                      <span className={advertiser.inquiry_form_enabled === false ? 'text-red-500' : 'text-green-500'}>
                        {advertiser.inquiry_form_enabled === false ? '비활성' : '활성'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">가입일</span>
                      <span className="font-medium">{formatDate(advertiser.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">캠페인</h3>
                  {advertiser.campaign_name ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">캠페인명</span>
                        <span className="font-medium">{advertiser.campaign_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">유효 단가</span>
                        <span className="font-medium text-green-600">₩{(advertiser.valid_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">계약 단가</span>
                        <span className="font-medium text-purple-600">₩{(advertiser.contract_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">활성 캠페인 없음</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 실적 요약 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '참여 파트너', value: advertiser.partner_count, color: 'text-blue-600' },
                { label: '전체 리드', value: advertiser.referral_count, color: 'text-gray-700' },
                { label: '유효 DB', value: advertiser.valid_count, color: 'text-green-600' },
                { label: '계약 완료', value: advertiser.contract_count, color: 'text-purple-600' },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 문의 폼 링크 */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">문의 폼 URL</p>
                <p className="text-sm font-mono text-blue-700 truncate">
                  /inquiry/{advertiser.advertiser_id}
                </p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/inquiry/${advertiser.advertiser_id}`)}
                className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0"
              >
                복사
              </button>
            </div>

            {advertiser.program_description && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">프로그램 설명</p>
                <p className="text-sm text-gray-700">{advertiser.program_description}</p>
              </div>
            )}
          </TabsContent>

          {/* 참여 파트너 탭 */}
          <TabsContent value="partners" className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8 text-gray-400">참여 파트너가 없습니다</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>파트너</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>티어</TableHead>
                    <TableHead>추천코드</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{p.email}</TableCell>
                      <TableCell>
                        <Badge className={
                          p.status === 'approved' ? 'bg-green-100 text-green-700' :
                          p.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {p.status === 'approved' ? '승인' : p.status === 'pending' ? '대기' : '반려'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-700">{p.tier}</Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.referral_code}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* 리드 탭 */}
          <TabsContent value="referrals" className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">리드가 없습니다</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>유입일</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>추천 파트너</TableHead>
                    <TableHead>계약 상태</TableHead>
                    <TableHead>유효</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-gray-500">{formatDate(r.created_at)}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{r.phone}</TableCell>
                      <TableCell className="text-sm">{r.partner_name || '직접유입'}</TableCell>
                      <TableCell>
                        <Badge className={
                          r.contract_status === 'completed' ? 'bg-purple-100 text-purple-700' :
                          r.contract_status === 'invalid' || r.contract_status === 'duplicate' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {statusLabel[r.contract_status] || r.contract_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.is_valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
