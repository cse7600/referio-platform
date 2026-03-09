'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download } from 'lucide-react'

interface Settlement {
  id: string
  type: 'valid' | 'contract'
  partner_id: string
  partner_name?: string
  referral_id: string | null
  referral_name?: string
  amount: number
  status: 'pending' | 'completed'
  settled_at: string | null
  note: string | null
  created_at: string
}

interface SettlementStats {
  totalPending: number
  totalPendingAmount: number
  totalCompleted: number
  totalCompletedAmount: number
  thisMonthAmount: number
}

export default function AdvertiserSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [stats, setStats] = useState<SettlementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSettlements()
  }, [])

  const fetchSettlements = async () => {
    try {
      const response = await fetch('/api/advertiser/settlements')
      if (response.ok) {
        const data = await response.json()
        setSettlements(data.settlements || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Settlements fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (settlementIds: string[]) => {
    if (settlementIds.length === 0) return

    setProcessing(true)
    try {
      const response = await fetch('/api/advertiser/settlements/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlement_ids: settlementIds }),
      })

      if (response.ok) {
        setSettlements(prev =>
          prev.map(s =>
            settlementIds.includes(s.id)
              ? { ...s, status: 'completed' as const, settled_at: new Date().toISOString() }
              : s
          )
        )
        setSelectedIds([])
        // 통계 새로고침
        fetchSettlements()
      }
    } catch (error) {
      console.error('Complete error:', error)
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const pendingSettlements = settlements.filter(s => s.status === 'pending')
  const completedSettlements = settlements.filter(s => s.status === 'completed')

  const filteredPending = pendingSettlements.filter(s =>
    (s.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (s.referral_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const filteredCompleted = completedSettlements.filter(s =>
    (s.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (s.referral_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === filteredPending.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredPending.map(s => s.id))
    }
  }

  const selectedAmount = filteredPending
    .filter(s => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0)

  const handleExportCsv = () => {
    const headers = ['생성일', '정산완료일', '파트너', '고객명', '유형', '금액', '상태', '비고']
    const rows = settlements.map(s => [
      new Date(s.created_at).toLocaleDateString('ko-KR'),
      s.settled_at ? new Date(s.settled_at).toLocaleDateString('ko-KR') : '',
      s.partner_name || '',
      s.referral_name || '',
      s.type === 'valid' ? '유효DB' : '계약',
      s.amount.toString(),
      s.status === 'pending' ? '대기' : '완료',
      (s.note || '').replace(/,/g, ' ').replace(/\n/g, ' '),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `정산목록_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6">
              <div className="h-16 bg-slate-200 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">정산 관리</h1>
          <p className="text-slate-500 mt-1">파트너 정산 처리 및 내역 관리</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={settlements.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          CSV 내보내기
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">대기 중</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {stats?.totalPending ?? 0}건
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(stats?.totalPendingAmount ?? 0)}
              </p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">정산 완료</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats?.totalCompleted ?? 0}건
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(stats?.totalCompletedAmount ?? 0)}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">이번 달 정산</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(stats?.thisMonthAmount ?? 0)}
              </p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">선택된 금액</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {formatCurrency(selectedAmount)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedIds.length}건 선택
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Input
          placeholder="파트너명 또는 고객명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {selectedIds.length > 0 && (
          <Button
            onClick={() => handleComplete(selectedIds)}
            disabled={processing}
          >
            {processing ? '처리 중...' : `선택 정산 완료 (${selectedIds.length}건)`}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            대기 ({pendingSettlements.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            완료 ({completedSettlements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPending.length && filteredPending.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>파트너</TableHead>
                  <TableHead>고객</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      대기 중인 정산이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPending.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(settlement.id)}
                          onChange={() => toggleSelect(settlement.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(settlement.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {settlement.partner_name || '-'}
                      </TableCell>
                      <TableCell>
                        {settlement.referral_name ? `${settlement.referral_name.substring(0, 1)}**` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={settlement.type === 'valid' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                          {settlement.type === 'valid' ? '유효' : '계약'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(settlement.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleComplete([settlement.id])}
                          disabled={processing}
                        >
                          완료
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>정산일</TableHead>
                  <TableHead>파트너</TableHead>
                  <TableHead>고객</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompleted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      완료된 정산이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompleted.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="text-sm">
                        {settlement.settled_at
                          ? new Date(settlement.settled_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {settlement.partner_name || '-'}
                      </TableCell>
                      <TableCell>
                        {settlement.referral_name ? `${settlement.referral_name.substring(0, 1)}**` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={settlement.type === 'valid' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                          {settlement.type === 'valid' ? '유효' : '계약'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(settlement.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {settlement.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
