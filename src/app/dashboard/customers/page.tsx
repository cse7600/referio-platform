'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Users, CheckCircle, FileCheck, Tag } from 'lucide-react'
import type { Partner, Referral } from '@/types/database'

interface EnrolledProgram {
  advertiser_id: string
  label: string
}

export default function CustomersPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [enrolledPrograms, setEnrolledPrograms] = useState<EnrolledProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterField, setFilterField] = useState<'name' | 'phone'>('name')
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!partnerData) { setLoading(false); return }
      setPartner(partnerData)

      // Fetch enrolled programs via API (admin client bypasses advertisers RLS)
      try {
        const res = await fetch('/api/partner/programs')
        if (res.ok) {
          const { programs } = await res.json()
          const enrolled = (programs || [])
            .filter((p: { enrollment?: { status: string } | null }) => p.enrollment?.status === 'approved')
            .map((p: { id: string; program_name?: string | null; company_name?: string }) => ({
              advertiser_id: p.id,
              label: p.program_name || p.company_name || p.id,
            }))
          setEnrolledPrograms(enrolled)
        }
      } catch {
        // Fallback: programs will be empty
      }

      // 전체 referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false })

      if (referralsData) setReferrals(referralsData)
      setLoading(false)
    }
    init()
  }, [])

  const displayedReferrals = referrals.filter((r) => {
    const matchAdv = !selectedAdvertiserId || r.advertiser_id === selectedAdvertiserId
    if (!matchAdv) return false
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    if (filterField === 'name') {
      return (r.name_masked || r.name || '').toLowerCase().includes(s)
    }
    return (r.phone || '').toLowerCase().includes(s)
  })

  const baseReferrals = selectedAdvertiserId
    ? referrals.filter(r => r.advertiser_id === selectedAdvertiserId)
    : referrals

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const maskName = (name: string | null | undefined) => {
    if (!name) return '-'
    return name[0] + '**'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">로딩 중...</div></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">고객</h1>
        <p className="text-gray-500 mt-1">내 추천으로 유입된 고객 목록입니다</p>
      </div>

      {/* 광고주별 탭 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedAdvertiserId === null ? 'default' : 'outline'}
          size="sm"
          className={selectedAdvertiserId === null ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
          onClick={() => setSelectedAdvertiserId(null)}
        >
          전체
          <span className="ml-1.5 text-xs opacity-70">({referrals.length})</span>
        </Button>
        {enrolledPrograms.map((p) => {
          const count = referrals.filter(r => r.advertiser_id === p.advertiser_id).length
          const isActive = selectedAdvertiserId === p.advertiser_id
          return (
            <Button
              key={p.advertiser_id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={isActive ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              onClick={() => setSelectedAdvertiserId(p.advertiser_id)}
            >
              {p.label}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </Button>
          )
        })}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">전체 고객</p>
                <p className="text-xl font-bold">{baseReferrals.length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">유효 고객</p>
                <p className="text-xl font-bold text-green-600">
                  {baseReferrals.filter(r => r.is_valid).length}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">계약 완료</p>
                <p className="text-xl font-bold text-purple-600">
                  {baseReferrals.filter(r => r.contract_status === 'completed').length}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 테이블 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="검색어를 입력하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterField}
              onValueChange={(value: 'name' | 'phone') => setFilterField(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="검색 필드" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">고객 이름</SelectItem>
                <SelectItem value="phone">연락처</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {displayedReferrals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {baseReferrals.length === 0
                ? '아직 유입된 고객이 없습니다'
                : '검색 결과가 없습니다'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>유입일시</TableHead>
                    <TableHead>고객명</TableHead>
                    {!selectedAdvertiserId && <TableHead>프로그램</TableHead>}
                    <TableHead>채널</TableHead>
                    <TableHead>유효여부</TableHead>
                    <TableHead>계약상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(referral.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {maskName(referral.name)}
                      </TableCell>
                      {!selectedAdvertiserId && (
                        <TableCell className="text-sm text-gray-500">
                          {enrolledPrograms.find(p => p.advertiser_id === referral.advertiser_id)?.label || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        {referral.channel ? (
                          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 font-normal">
                            {referral.channel}
                          </Badge>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.is_valid ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">유효</Badge>
                        ) : (
                          <Badge variant="secondary">대기</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ContractStatusBadge status={referral.contract_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ContractStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: '대기', className: 'bg-gray-100 text-gray-700' },
    call_1: { label: '1차 콜', className: 'bg-blue-100 text-blue-700' },
    call_2: { label: '2차 콜', className: 'bg-blue-100 text-blue-700' },
    call_3: { label: '3차 콜', className: 'bg-blue-100 text-blue-700' },
    completed: { label: '계약완료', className: 'bg-purple-100 text-purple-700' },
    invalid: { label: '무효', className: 'bg-red-100 text-red-700' },
    duplicate: { label: '중복', className: 'bg-yellow-100 text-yellow-700' },
  }
  const config = statusConfig[status] || statusConfig.pending
  return <Badge className={`${config.className} hover:${config.className}`}>{config.label}</Badge>
}
