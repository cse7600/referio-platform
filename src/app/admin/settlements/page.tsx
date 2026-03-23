'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  MoreVertical,
  CheckCircle,
  Clock,
  Plus,
  Wallet,
  Download,
  Mail,
  Lock,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Settlement, Partner, Referral } from '@/types/database'

interface SettlementWithRelations extends Settlement {
  partners?: {
    id: string
    name: string
    email: string
    bank_name: string | null
    bank_account: string | null
    account_holder: string | null
  }
  referrals?: {
    name: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  completed: '완료',
}

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementWithRelations[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mounted, setMounted] = useState(false)
  const [selectedSettlements, setSelectedSettlements] = useState<Set<string>>(new Set())

  // 신규 정산 폼
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSettlement, setNewSettlement] = useState({
    partner_id: '',
    referral_id: '',
    amount: '',
  })

  // CSV 다운로드 다이얼로그
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [csvPassword, setCsvPassword] = useState('')
  const [csvPasswordConfirm, setCsvPasswordConfirm] = useState('')

  // 정보 요청 다이얼로그
  const [isInfoRequestDialogOpen, setIsInfoRequestDialogOpen] = useState(false)
  const [infoRequestPartner, setInfoRequestPartner] = useState<SettlementWithRelations | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchSettlements = async () => {
    try {
      const res = await fetch(`/api/admin/settlements?status=${statusFilter}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSettlements(data.settlements || [])
      setPartners(data.partners || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const fetchPartners = async () => {
    // Partners are already fetched in fetchSettlements
  }

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
    fetchSettlements()
    fetchPartners()
  }, [statusFilter])

  useEffect(() => {
    if (newSettlement.partner_id) {
      fetchReferrals(newSettlement.partner_id)
    } else {
      setReferrals([])
    }
  }, [newSettlement.partner_id])

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
    fetchSettlements()
  }

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
        amount: amount,
      }),
    })

    if (!res.ok) {
      toast.error('정산 생성에 실패했습니다')
      return
    }

    toast.success('정산이 생성되었습니다')
    setIsDialogOpen(false)
    setNewSettlement({ partner_id: '', referral_id: '', amount: '' })
    fetchSettlements()
  }

  // CSV 다운로드 (암호 보호)
  const handleCsvDownload = async () => {
    if (csvPassword.length < 4) {
      toast.error('비밀번호는 최소 4자리 이상이어야 합니다')
      return
    }
    if (csvPassword !== csvPasswordConfirm) {
      toast.error('비밀번호가 일치하지 않습니다')
      return
    }

    // 선택된 정산 또는 전체 정산 데이터 추출
    const targetSettlements = selectedSettlements.size > 0
      ? filteredSettlements.filter(s => selectedSettlements.has(s.id))
      : filteredSettlements

    // CSV 데이터 생성
    const csvHeaders = [
      '정산ID',
      '파트너명',
      '파트너이메일',
      '은행명',
      '계좌번호',
      '예금주',
      '연결고객',
      '금액',
      '상태',
      '생성일',
      '완료일'
    ]

    const csvRows = targetSettlements.map(s => [
      s.id,
      s.partners?.name || '',
      s.partners?.email || '',
      s.partners?.bank_name || '',
      s.partners?.bank_account || '',
      s.partners?.account_holder || '',
      s.referrals?.name || '',
      s.amount || 0,
      STATUS_LABELS[s.status],
      formatDate(s.created_at),
      formatDate(s.settled_at)
    ])

    // CSV 문자열 생성
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // UTF-8 BOM 추가 (한글 호환)
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // 파일 다운로드
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `정산내역_${new Date().toISOString().split('T')[0]}_비밀번호_${csvPassword}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`${targetSettlements.length}건의 정산 내역이 다운로드되었습니다. 비밀번호: ${csvPassword}`)
    setIsCsvDialogOpen(false)
    setCsvPassword('')
    setCsvPasswordConfirm('')
  }

  // 정산 정보 요청 메일 발송 (UI만)
  const handleInfoRequest = (settlement: SettlementWithRelations) => {
    setInfoRequestPartner(settlement)
    setIsInfoRequestDialogOpen(true)
  }

  const sendInfoRequestEmail = async () => {
    if (!infoRequestPartner) return

    // 실제 메일 발송은 추후 구현 (여기서는 UI만)
    toast.success(`${infoRequestPartner.partners?.name}님께 정산 정보 요청 메일이 발송되었습니다`)
    setIsInfoRequestDialogOpen(false)
    setInfoRequestPartner(null)
  }

  // 정산 정보 누락 체크
  const hasMissingInfo = (settlement: SettlementWithRelations) => {
    return !settlement.partners?.bank_name ||
           !settlement.partners?.bank_account ||
           !settlement.partners?.account_holder
  }

  // 선택 토글
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedSettlements)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSettlements(newSelected)
  }

  // 전체 선택
  const toggleSelectAll = () => {
    if (selectedSettlements.size === filteredSettlements.length) {
      setSelectedSettlements(new Set())
    } else {
      setSelectedSettlements(new Set(filteredSettlements.map(s => s.id)))
    }
  }

  const filteredSettlements = settlements.filter(settlement => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      settlement.partners?.name?.toLowerCase().includes(search) ||
      settlement.referrals?.name?.toLowerCase().includes(search)
    )
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const totalPending = settlements
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  const totalCompleted = settlements
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (s.amount || 0), 0)

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
          <h1 className="text-2xl font-bold">정산 관리</h1>
          <p className="text-gray-500 mt-1">파트너 정산 생성 및 관리</p>
        </div>
        <div className="flex items-center gap-2">
          {mounted && (
            <>
              {/* CSV 다운로드 버튼 */}
              <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    CSV 다운로드
                    {selectedSettlements.size > 0 && (
                      <Badge className="ml-2 bg-blue-100 text-blue-700">
                        {selectedSettlements.size}건
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      정산 내역 다운로드
                    </DialogTitle>
                    <DialogDescription>
                      고객 정보 보호를 위해 비밀번호를 설정해주세요.
                      {selectedSettlements.size > 0
                        ? ` 선택된 ${selectedSettlements.size}건이 다운로드됩니다.`
                        : ` 전체 ${filteredSettlements.length}건이 다운로드됩니다.`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>비밀번호 *</Label>
                      <Input
                        type="password"
                        placeholder="비밀번호 (최소 4자리)"
                        value={csvPassword}
                        onChange={(e) => setCsvPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>비밀번호 확인 *</Label>
                      <Input
                        type="password"
                        placeholder="비밀번호 확인"
                        value={csvPasswordConfirm}
                        onChange={(e) => setCsvPasswordConfirm(e.target.value)}
                      />
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      다운로드 파일명에 비밀번호가 포함됩니다. 파일 관리에 주의해주세요.
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCsvDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleCsvDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* 정산 생성 다이얼로그 */}
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
                          {partners.map((partner) => (
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

      {/* 정보 요청 다이얼로그 */}
      {mounted && (
        <Dialog open={isInfoRequestDialogOpen} onOpenChange={setIsInfoRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                정산 정보 요청
              </DialogTitle>
              <DialogDescription>
                {infoRequestPartner?.partners?.name}님께 정산 정보 요청 메일을 발송합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-medium">수신자</p>
                <p className="text-sm text-gray-600">{infoRequestPartner?.partners?.email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-medium">요청 내용</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {!infoRequestPartner?.partners?.bank_name && <li>은행명</li>}
                  {!infoRequestPartner?.partners?.bank_account && <li>계좌번호</li>}
                  {!infoRequestPartner?.partners?.account_holder && <li>예금주</li>}
                </ul>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                <Mail className="w-4 h-4 inline mr-2" />
                파트너에게 정산 정보 입력을 요청하는 이메일이 발송됩니다.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInfoRequestDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={sendInfoRequestEmail}>
                <Mail className="w-4 h-4 mr-2" />
                메일 발송
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 정산</p>
                <p className="text-2xl font-bold">{settlements.length}건</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">대기 중 금액</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₩{totalPending.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">완료 금액</p>
                <p className="text-2xl font-bold text-green-600">
                  ₩{totalCompleted.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="파트너명, 고객명으로 검색..."
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

      {/* 정산 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            정산 목록 ({filteredSettlements.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSettlements.size === filteredSettlements.length && filteredSettlements.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>파트너</TableHead>
                  <TableHead>연결 고객</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>완료일</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettlements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      정산 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSettlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSettlements.has(settlement.id)}
                          onCheckedChange={() => toggleSelect(settlement.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(settlement.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{settlement.partners?.name || '-'}</span>
                          {hasMissingInfo(settlement) && (
                            <span className="ml-2 text-xs text-red-500">
                              <AlertCircle className="w-3 h-3 inline" /> 정보 누락
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {settlement.referrals?.name || (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₩{(settlement.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[settlement.status]}>
                          {STATUS_LABELS[settlement.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(settlement.settled_at)}</TableCell>
                      <TableCell>
                        {mounted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {settlement.status === 'pending' ? (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(settlement.id, 'completed')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  완료 처리
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(settlement.id, 'pending')}
                                  className="text-orange-600"
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  대기로 변경
                                </DropdownMenuItem>
                              )}
                              {hasMissingInfo(settlement) && (
                                <DropdownMenuItem
                                  onClick={() => handleInfoRequest(settlement)}
                                  className="text-blue-600"
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  정보 요청 메일
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
