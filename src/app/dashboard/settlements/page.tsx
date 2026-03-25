'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Search, Clock, CheckCircle } from 'lucide-react'
import type { Settlement, Referral } from '@/types/database'
import { useProgram } from '../ProgramContext'

interface SettlementWithReferral extends Settlement {
  referral?: Referral
}

export default function SettlementsPage() {
  const { partner, selectedProgram, loading } = useProgram() // ProgramContext 공유 — 중복 fetch 제거
  const [settlements, setSettlements] = useState<SettlementWithReferral[]>([])
  const [settlementsLoading, setSettlementsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterField, setFilterField] = useState<'id' | 'referral'>('id')
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

  // 선택된 프로그램 변경 시 settlements 재조회
  useEffect(() => {
    const fetchSettlements = async () => {
      if (!partner?.id) return

      const supabase = createClient()
      let query = supabase
        .from('settlements')
        .select(`
          *,
          referral:referrals(id, name, name_masked)
        `)
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false })

      if (selectedProgram) {
        query = query.eq('advertiser_id', selectedProgram.advertiser_id)
      }

      const { data: settlementsData } = await query

      if (settlementsData) {
        setSettlements(settlementsData)
      }
      setSettlementsLoading(false)
    }
    if (partner?.id) {
      fetchSettlements()
    } else if (!loading) {
      setSettlementsLoading(false)
    }
  }, [partner?.id, selectedProgram, loading])

  // 탭별 필터링
  const filteredByTab = settlements.filter((settlement) => {
    if (activeTab === 'pending') {
      return settlement.status === 'pending'
    } else {
      return settlement.status === 'completed'
    }
  })

  // 검색 필터링
  const filteredSettlements = filteredByTab.filter((settlement) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    if (filterField === 'id') {
      return settlement.id.toString().includes(searchLower)
    } else {
      const referralName = settlement.referral?.name_masked || settlement.referral?.name || ''
      return referralName.toLowerCase().includes(searchLower)
    }
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 통계 계산
  const pendingAmount = settlements
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0)

  const completedAmount = settlements
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.amount, 0)

  if (loading || settlementsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const programLabel = selectedProgram
    ? (selectedProgram.advertisers as unknown as { program_name: string | null; company_name: string }).program_name ||
      (selectedProgram.advertisers as unknown as { company_name: string }).company_name
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">지급</h1>
        <p className="text-gray-500 mt-1">
          {programLabel
            ? `${programLabel} - 정산 내역`
            : '정산 내역을 확인하세요'}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">정산 대기</p>
                <p className="text-xl font-bold text-orange-600">
                  ₩{pendingAmount.toLocaleString()}
                </p>
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
                <p className="text-xs text-gray-500">정산 완료</p>
                <p className="text-xl font-bold text-green-600">
                  ₩{completedAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 및 테이블 */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-2 max-w-[200px]">
              <TabsTrigger value="pending">대기</TabsTrigger>
              <TabsTrigger value="completed">완료</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            {/* 검색 */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
                onValueChange={(value: 'id' | 'referral') => setFilterField(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="검색 필드" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">정산 ID</SelectItem>
                  <SelectItem value="referral">고객명</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 테이블 */}
            {filteredSettlements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {settlements.length === 0
                  ? '아직 정산 내역이 없습니다'
                  : '검색 결과가 없습니다'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>정산 ID</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead className="text-right">정산금액</TableHead>
                      <TableHead>{activeTab === 'pending' ? '생성일' : '정산완료일'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSettlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium">
                          #{settlement.id}
                        </TableCell>
                        <TableCell>
                          {settlement.referral?.name_masked || settlement.referral?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              settlement.type === 'contract'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }
                          >
                            {settlement.type === 'contract' ? '계약' : '유효'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₩{settlement.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {activeTab === 'pending'
                            ? formatDate(settlement.created_at)
                            : formatDate(settlement.settled_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
