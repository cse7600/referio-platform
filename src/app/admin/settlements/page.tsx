'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  MoreVertical,
  CheckCircle,
  Clock,
  Plus,
  Wallet,
  Download,
  Mail,
  ChevronDown,
  ChevronUp,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Partner, Referral } from '@/types/database'

// --- Types ---

interface SettlementRow {
  id: string
  referral_id: string | null
  referral_name: string | null
  amount: number
  type: string | null
  status: string
  settled_at: string | null
  created_at: string
}

interface PartnerGroup {
  partner_id: string
  partner_name: string
  partner_email: string
  bank_name: string | null
  bank_account: string | null
  account_holder: string | null
  has_ssn: boolean
  total_amount: number
  pending_amount: number
  settlement_count: number
  settlements: SettlementRow[]
}

interface TotalStats {
  partner_count: number
  total_settlements: number
  total_amount: number
  total_pending: number
  pending_count: number
}

// --- Constants ---

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  completed: '완료',
}

const TYPE_LABELS: Record<string, string> = {
  contract: '계약',
  valid: '유효',
}

// --- Helper ---

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ko-KR')
}

// --- Component ---

export default function AdminSettlementsPage() {
  const [partnerGroups, setPartnerGroups] = useState<PartnerGroup[]>([])
  const [approvedPartners, setApprovedPartners] = useState<Partner[]>([])
  const [totalStats, setTotalStats] = useState<TotalStats>({
    partner_count: 0,
    total_settlements: 0,
    total_amount: 0,
    total_pending: 0,
    pending_count: 0,
  })
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mounted, setMounted] = useState(false)

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Create settlement dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSettlement, setNewSettlement] = useState({
    partner_id: '',
    referral_id: '',
    amount: '',
  })

  // Email sending states
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null)
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/settlements?status=${statusFilter}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPartnerGroups(data.partners || [])
      setApprovedPartners(data.approved_partners || [])
      setTotalStats(data.total_stats || {
        partner_count: 0,
        total_settlements: 0,
        total_amount: 0,
        total_pending: 0,
        pending_count: 0,
      })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchReferrals = async (partnerId: string) => {
    try {
      const res = await fetch(`/api/admin/settlements/referrals?partner_id=${partnerId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setReferrals(data.referrals || [])
    } catch {
      setReferrals([])
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (newSettlement.partner_id) {
      fetchReferrals(newSettlement.partner_id)
    } else {
      setReferrals([])
    }
  }, [newSettlement.partner_id])

  // Toggle card expand/collapse
  const toggleCard = (partnerId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(partnerId)) {
        next.delete(partnerId)
      } else {
        next.add(partnerId)
      }
      return next
    })
  }

  // Status change for individual settlement
  const handleStatusChange = async (settlementId: string, newStatus: 'pending' | 'completed') => {
    const updateData: { status: string; settled_at?: string | null } = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.settled_at = new Date().toISOString()
    } else {
      updateData.settled_at = null
    }

    const res = await fetch('/api/admin/settlements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId, updates: updateData }),
    })

    if (!res.ok) {
      toast.error('상태 변경에 실패했습니다')
      return
    }

    toast.success(newStatus === 'completed' ? '정산 완료 처리되었습니다' : '대기 상태로 변경되었습니다')
    fetchData()
  }

  // Create settlement
  const handleCreateSettlement = async () => {
    if (!newSettlement.partner_id || !newSettlement.amount) {
      toast.error('파트너와 금액은 필수입니다')
      return
    }

    const amount = parseInt(newSettlement.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('금액은 0보다 큰 숫자여야 합니다')
      return
    }

    if (amount > 100000000) {
      toast.error('금액이 너무 큽니다 (1억원 이하)')
      return
    }

    const res = await fetch('/api/admin/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: newSettlement.partner_id,
        referral_id: newSettlement.referral_id || null,
        amount,
      }),
    })

    if (!res.ok) {
      toast.error('정산 생성에 실패했습니다')
      return
    }

    toast.success('정산이 생성되었습니다')
    setIsDialogOpen(false)
    setNewSettlement({ partner_id: '', referral_id: '', amount: '' })
    fetchData()
  }

  // Send info request email for a single partner
  const handleSendInfoRequest = async (partnerId: string, partnerName: string) => {
    setSendingEmailFor(partnerId)
    try {
      const res = await fetch('/api/admin/settlements/request-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_ids: [partnerId] }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      if (data.sent > 0) {
        toast.success(`${partnerName}님께 정산 정보 요청 메일을 발송했습니다`)
      } else {
        toast.error(`${partnerName}님 메일 발송 실패`)
      }
    } catch {
      toast.error('메일 발송에 실패했습니다')
    } finally {
      setSendingEmailFor(null)
    }
  }

  // Bulk send info request to all partners missing account/SSN
  const handleBulkInfoRequest = async () => {
    const missingPartners = filteredGroups.filter(
      p => !p.has_ssn || !p.bank_name || !p.bank_account
    )

    if (missingPartners.length === 0) {
      toast.info('계좌/주민번호 미입력 파트너가 없습니다')
      return
    }

    const partnerIds = missingPartners
      .filter(p => p.partner_email)
      .map(p => p.partner_id)

    if (partnerIds.length === 0) {
      toast.error('이메일이 있는 대상 파트너가 없습니다')
      return
    }

    setSendingBulkEmail(true)
    try {
      const res = await fetch('/api/admin/settlements/request-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_ids: partnerIds }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      toast.success(`${data.sent}명 발송 성공, ${data.failed}명 실패`)
    } catch {
      toast.error('일괄 메일 발송에 실패했습니다')
    } finally {
      setSendingBulkEmail(false)
    }
  }

  // CSV download via server API
  const handleCsvDownload = async () => {
    try {
      const url = `/api/admin/settlements/export?status=${statusFilter}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed')

      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `정산내역_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      toast.success('CSV 다운로드 완료')
    } catch {
      toast.error('CSV 다운로드에 실패했습니다')
    }
  }

  // Filter partner groups by search
  const filteredGroups = partnerGroups.filter(group => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return group.partner_name.toLowerCase().includes(search)
  })

  // Check if partner has missing info
  const hasMissingInfo = (group: PartnerGroup) =>
    !group.bank_name || !group.bank_account || !group.account_holder || !group.has_ssn

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">정산 관리</h1>
          <p className="text-gray-500 mt-1">파트너별 정산 그룹 관리</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mounted && (
            <>
              {/* Bulk email button */}
              <Button
                variant="outline"
                onClick={handleBulkInfoRequest}
                disabled={sendingBulkEmail}
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendingBulkEmail ? '발송 중...' : '전체 이메일 발송'}
              </Button>

              {/* CSV download */}
              <Button variant="outline" onClick={handleCsvDownload}>
                <Download className="w-4 h-4 mr-2" />
                CSV 다운로드
              </Button>

              {/* Create settlement dialog */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    정산 생성
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 정산 생성</DialogTitle>
                    <DialogDescription>
                      파트너에게 정산할 금액을 입력하세요
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>파트너 *</Label>
                      <Select
                        value={newSettlement.partner_id}
                        onValueChange={(value) =>
                          setNewSettlement({ ...newSettlement, partner_id: value, referral_id: '' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="파트너 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedPartners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name} ({partner.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>연결 피추천인 (선택)</Label>
                      <Select
                        value={newSettlement.referral_id}
                        onValueChange={(value) =>
                          setNewSettlement({ ...newSettlement, referral_id: value })
                        }
                        disabled={!newSettlement.partner_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="피추천인 선택 (선택사항)" />
                        </SelectTrigger>
                        <SelectContent>
                          {referrals.map((referral) => (
                            <SelectItem key={referral.id} value={referral.id}>
                              {referral.name} ({formatDate(referral.created_at)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>정산 금액 *</Label>
                      <Input
                        type="number"
                        placeholder="100000"
                        value={newSettlement.amount}
                        onChange={(e) =>
                          setNewSettlement({ ...newSettlement, amount: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleCreateSettlement}>
                      생성
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">파트너 수</p>
                <p className="text-xl font-bold">{totalStats.partner_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">총 정산 건수</p>
                <p className="text-xl font-bold">{totalStats.total_settlements}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">총 정산 금액</p>
                <p className="text-xl font-bold">₩{totalStats.total_amount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">대기 건수</p>
                <p className="text-xl font-bold text-orange-600">{totalStats.pending_count}건</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="파트너명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partner card list */}
      <div className="space-y-3">
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              정산 내역이 없습니다
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = expandedCards.has(group.partner_id)
            const hasPendingSettlements = group.pending_amount > 0
            const needsInfo = hasMissingInfo(group)

            return (
              <Card key={group.partner_id} className={needsInfo ? 'border-orange-200' : ''}>
                {/* Card header - clickable */}
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCard(group.partner_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      {/* Partner name */}
                      <span className="font-semibold text-base">{group.partner_name}</span>

                      {/* Settlement count */}
                      <Badge variant="secondary" className="text-xs">
                        {group.settlement_count}건
                      </Badge>

                      {/* Total amount */}
                      <span className="font-medium text-sm">
                        ₩{group.total_amount.toLocaleString()}
                      </span>

                      {/* Bank badge */}
                      {group.bank_name ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                          {group.bank_name}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                          계좌미입력
                        </Badge>
                      )}

                      {/* Status badge */}
                      {hasPendingSettlements ? (
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">
                          대기
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          완료
                        </Badge>
                      )}

                      {/* SSN badge */}
                      {group.has_ssn ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          주민번호 ✓
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">
                          주민번호 미입력
                        </Badge>
                      )}

                      {/* No email warning */}
                      {!group.partner_email && (
                        <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">
                          이메일없음
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {/* Info request button - shown when missing info */}
                      {mounted && needsInfo && group.partner_email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSendInfoRequest(group.partner_id, group.partner_name)
                          }}
                          disabled={sendingEmailFor === group.partner_id}
                        >
                          <Mail className="w-3.5 h-3.5 mr-1.5" />
                          {sendingEmailFor === group.partner_id ? '발송중...' : '계좌요청'}
                        </Button>
                      )}

                      {/* Expand/collapse icon */}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-6 pb-5 border-t">
                    {/* Account info */}
                    {group.bank_name && (
                      <div className="mt-4 mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-500">계좌:</span>{' '}
                        <span className="font-medium">{group.bank_name}</span>
                        {' · '}
                        <span>{group.bank_account}</span>
                        {' · '}
                        <span>예금주 {group.account_holder}</span>
                      </div>
                    )}

                    {!group.bank_name && (
                      <div className="mt-4 mb-3 p-3 bg-orange-50 rounded-lg text-sm text-orange-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        계좌 정보가 입력되지 않았습니다
                      </div>
                    )}

                    {/* Settlements table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">정산ID</TableHead>
                            <TableHead className="text-xs">고객명</TableHead>
                            <TableHead className="text-xs">정산유형</TableHead>
                            <TableHead className="text-xs text-right">금액</TableHead>
                            <TableHead className="text-xs">상태</TableHead>
                            <TableHead className="text-xs">생성일</TableHead>
                            <TableHead className="text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.settlements.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="text-xs text-gray-500 font-mono">
                                #{s.id}
                              </TableCell>
                              <TableCell className="text-sm">
                                {s.referral_name || <span className="text-gray-400">-</span>}
                              </TableCell>
                              <TableCell className="text-xs">
                                {TYPE_LABELS[s.type || ''] || s.type || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                ₩{s.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${STATUS_COLORS[s.status]} text-xs`}>
                                  {STATUS_LABELS[s.status]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {formatDate(s.created_at)}
                              </TableCell>
                              <TableCell>
                                {mounted && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {s.status === 'pending' ? (
                                        <DropdownMenuItem
                                          onClick={() => handleStatusChange(s.id, 'completed')}
                                          className="text-green-600"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          완료 처리
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => handleStatusChange(s.id, 'pending')}
                                          className="text-orange-600"
                                        >
                                          <Clock className="w-4 h-4 mr-2" />
                                          대기로 변경
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
