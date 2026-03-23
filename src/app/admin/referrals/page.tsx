'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import {
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  FileText,
  Phone,
  Calendar,
  User,
  LayoutGrid,
  List,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Referral } from '@/types/database'

interface ReferralWithPartner extends Referral {
  partners?: {
    name: string
    email: string
  }
}

const CONTRACT_STAGES = [
  { id: 'pending', label: '대기', color: 'bg-gray-100 border-gray-300', textColor: 'text-gray-700', hoverColor: 'hover:bg-gray-200' },
  { id: 'call_1', label: '1차 콜', color: 'bg-blue-50 border-blue-300', textColor: 'text-blue-700', hoverColor: 'hover:bg-blue-100' },
  { id: 'call_2', label: '2차 콜', color: 'bg-blue-100 border-blue-400', textColor: 'text-blue-800', hoverColor: 'hover:bg-blue-200' },
  { id: 'call_3', label: '3차 콜', color: 'bg-blue-200 border-blue-500', textColor: 'text-blue-900', hoverColor: 'hover:bg-blue-300' },
  { id: 'completed', label: '계약완료', color: 'bg-green-50 border-green-300', textColor: 'text-green-700', hoverColor: 'hover:bg-green-100' },
  { id: 'invalid', label: '무효', color: 'bg-red-50 border-red-300', textColor: 'text-red-700', hoverColor: 'hover:bg-red-100' },
  { id: 'duplicate', label: '중복', color: 'bg-yellow-50 border-yellow-300', textColor: 'text-yellow-700', hoverColor: 'hover:bg-yellow-100' },
]

const VALID_COLORS: Record<string, string> = {
  true: 'bg-green-100 text-green-700',
  false: 'bg-red-100 text-red-700',
  null: 'bg-gray-100 text-gray-700',
}

// 필터 카드 정의
const FILTER_CARDS = [
  { id: 'all', label: '전체', color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-700', activeColor: 'ring-2 ring-gray-400' },
  { id: 'valid', label: '유효', color: 'bg-green-50 border-green-200', textColor: 'text-green-700', activeColor: 'ring-2 ring-green-400' },
  { id: 'completed', label: '계약', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700', activeColor: 'ring-2 ring-purple-400' },
  { id: 'duplicate', label: '중복', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700', activeColor: 'ring-2 ring-yellow-400' },
  { id: 'invalid', label: '무효', color: 'bg-red-50 border-red-200', textColor: 'text-red-700', activeColor: 'ring-2 ring-red-400' },
]

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralWithPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [draggedItem, setDraggedItem] = useState<ReferralWithPartner | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/admin/referrals')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setReferrals(data.referrals || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferrals()
  }, [])

  const handleValidChange = async (referralId: string, isValid: boolean | null) => {
    const res = await fetch('/api/admin/referrals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralId, updates: { is_valid: isValid } }),
    })

    if (!res.ok) {
      toast.error('상태 변경에 실패했습니다')
      return
    }

    toast.success('유효성이 변경되었습니다')
    fetchReferrals()
  }

  const handleContractChange = async (referralId: string, status: string) => {
    const res = await fetch('/api/admin/referrals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralId, updates: { contract_status: status } }),
    })

    if (!res.ok) {
      toast.error('계약 상태 변경에 실패했습니다')
      return
    }

    toast.success('계약 상태가 변경되었습니다')
    fetchReferrals()
  }

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, referral: ReferralWithPartner) => {
    setDraggedItem(referral)
    e.dataTransfer.effectAllowed = 'move'
    // 드래그 이미지 설정
    const target = e.target as HTMLElement
    target.style.opacity = '0.5'
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDragOverStage(null)

    if (!draggedItem || draggedItem.contract_status === targetStatus) {
      setDraggedItem(null)
      return
    }

    // 즉시 UI 업데이트 (낙관적 업데이트)
    setReferrals(prev => prev.map(r =>
      r.id === draggedItem.id ? { ...r, contract_status: targetStatus as Referral['contract_status'] } : r
    ))

    await handleContractChange(draggedItem.id, targetStatus)
    setDraggedItem(null)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    setDraggedItem(null)
    setDragOverStage(null)
  }

  // 필터 적용
  const getFilteredReferrals = () => {
    let filtered = referrals

    // 검색 필터
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(referral =>
        referral.name?.toLowerCase().includes(search) ||
        referral.phone?.includes(search) ||
        referral.partners?.name?.toLowerCase().includes(search)
      )
    }

    // 상태 필터
    switch (activeFilter) {
      case 'valid':
        filtered = filtered.filter(r => r.is_valid === true)
        break
      case 'completed':
        filtered = filtered.filter(r => r.contract_status === 'completed')
        break
      case 'duplicate':
        filtered = filtered.filter(r => r.contract_status === 'duplicate')
        break
      case 'invalid':
        filtered = filtered.filter(r => r.contract_status === 'invalid' || r.is_valid === false)
        break
    }

    return filtered
  }

  const filteredReferrals = getFilteredReferrals()

  const getReferralsByStatus = (status: string) => {
    return filteredReferrals.filter(r => r.contract_status === status)
  }

  // 카드별 카운트 계산
  const getFilterCount = (filterId: string) => {
    switch (filterId) {
      case 'all':
        return referrals.length
      case 'valid':
        return referrals.filter(r => r.is_valid === true).length
      case 'completed':
        return referrals.filter(r => r.contract_status === 'completed').length
      case 'duplicate':
        return referrals.filter(r => r.contract_status === 'duplicate').length
      case 'invalid':
        return referrals.filter(r => r.contract_status === 'invalid' || r.is_valid === false).length
      default:
        return 0
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
  }

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
          <h1 className="text-2xl font-bold">피추천인 관리</h1>
          <p className="text-gray-500 mt-1">유입된 고객 DB 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            칸반
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4 mr-1" />
            테이블
          </Button>
        </div>
      </div>

      {/* 필터 카드 - 클릭 가능 */}
      <div className="grid grid-cols-5 gap-3">
        {FILTER_CARDS.map((filter) => (
          <Card
            key={filter.id}
            className={`border-2 cursor-pointer transition-all ${filter.color} ${
              activeFilter === filter.id ? filter.activeColor : ''
            } hover:shadow-md`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${filter.textColor}`}>{filter.label}</span>
                <span className={`text-2xl font-bold ${filter.textColor}`}>
                  {getFilterCount(filter.id)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="고객명, 연락처, 파트너명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 칸반 뷰 */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {CONTRACT_STAGES.map((stage) => (
              <div
                key={stage.id}
                className={`w-72 flex-shrink-0 rounded-lg border-2 ${stage.color} p-4 transition-all ${
                  dragOverStage === stage.id ? 'ring-2 ring-blue-500 scale-[1.02]' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${stage.textColor}`}>{stage.label}</h3>
                  <Badge variant="secondary" className={stage.textColor}>
                    {getReferralsByStatus(stage.id).length}
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {getReferralsByStatus(stage.id).map((referral) => (
                    <Card
                      key={referral.id}
                      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-lg ${
                        draggedItem?.id === referral.id ? 'opacity-50 scale-95' : ''
                      } ${stage.hoverColor}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, referral)}
                      onDragEnd={handleDragEnd}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="cursor-grab">
                              <GripVertical className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{referral.name}</p>
                              {referral.partners?.name && (
                                <p className="text-xs text-gray-500">
                                  via {referral.partners.name}
                                </p>
                              )}
                            </div>
                          </div>
                          {mounted && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleValidChange(referral.id, true)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  유효 처리
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleValidChange(referral.id, false)}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  무효 처리
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {CONTRACT_STAGES.filter(s => s.id !== referral.contract_status).map((s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => handleContractChange(referral.id, s.id)}
                                  >
                                    → {s.label}로 이동
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-gray-500">
                          {referral.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {referral.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(referral.created_at)}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            className={`text-xs ${VALID_COLORS[String(referral.is_valid)]}`}
                          >
                            {referral.is_valid === true
                              ? '유효'
                              : referral.is_valid === false
                              ? '무효'
                              : '미확인'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {getReferralsByStatus(stage.id).length === 0 && (
                    <div className={`text-center py-8 text-sm ${stage.textColor} opacity-60 border-2 border-dashed rounded-lg ${
                      dragOverStage === stage.id ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}>
                      {dragOverStage === stage.id ? '여기에 놓으세요' : '항목이 없습니다'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 테이블 뷰 */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              피추천인 목록 ({filteredReferrals.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>유입일시</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>파트너</TableHead>
                    <TableHead>유효</TableHead>
                    <TableHead>계약상태</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        피추천인이 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReferrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(referral.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {referral.name}
                        </TableCell>
                        <TableCell>{referral.phone || '-'}</TableCell>
                        <TableCell>
                          {referral.partners?.name || (
                            <span className="text-gray-400">미연결</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={VALID_COLORS[String(referral.is_valid)]}
                          >
                            {referral.is_valid === true
                              ? '유효'
                              : referral.is_valid === false
                              ? '무효'
                              : '미확인'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${CONTRACT_STAGES.find(s => s.id === referral.contract_status)?.color || ''} ${CONTRACT_STAGES.find(s => s.id === referral.contract_status)?.textColor || ''}`}
                          >
                            {CONTRACT_STAGES.find(s => s.id === referral.contract_status)?.label || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mounted && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleValidChange(referral.id, true)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  유효 처리
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleValidChange(referral.id, false)}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  무효 처리
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleValidChange(referral.id, null)}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  미확인으로
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {CONTRACT_STAGES.map((stage) => (
                                  <DropdownMenuItem
                                    key={stage.id}
                                    onClick={() => handleContractChange(referral.id, stage.id)}
                                    className={referral.contract_status === stage.id ? 'bg-gray-100' : ''}
                                  >
                                    {stage.label}
                                  </DropdownMenuItem>
                                ))}
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
      )}
    </div>
  )
}
