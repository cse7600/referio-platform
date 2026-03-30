'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/dialog'
import { PlusCircle, Loader2, Download } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface Referral {
  id: string
  name: string
  phone: string | null
  referral_code_input: string | null
  partner_id: string | null
  partner_name?: string
  sales_rep: string | null
  contract_status: string
  is_valid: boolean | null
  contracted_at: string | null
  inquiry: string | null
  memo: string | null
  labels: string[] | null
  priority: string | null
  next_action: string | null
  next_action_at: string | null
  channel: string | null
  created_at: string
}

const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
  pending: { label: '신규', color: 'bg-yellow-100 text-yellow-800', emoji: '🆕' },
  call_1: { label: '1차 통화', color: 'bg-blue-100 text-blue-800', emoji: '📞' },
  call_2: { label: '2차 통화', color: 'bg-blue-200 text-blue-900', emoji: '📞' },
  call_3: { label: '3차 통화', color: 'bg-indigo-100 text-indigo-800', emoji: '📞' },
  completed: { label: '계약완료', color: 'bg-green-100 text-green-800', emoji: '✅' },
  invalid: { label: '무효', color: 'bg-red-100 text-red-800', emoji: '❌' },
  duplicate: { label: '중복', color: 'bg-gray-100 text-gray-800', emoji: '🔄' },
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: '낮음', color: 'text-slate-400' },
  normal: { label: '보통', color: 'text-slate-600' },
  high: { label: '높음', color: 'text-orange-500' },
  urgent: { label: '긴급', color: 'text-red-500' },
}

const FUNNEL_STAGES = ['pending', 'call_1', 'call_2', 'call_3', 'completed']

export default function AdvertiserReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [memoText, setMemoText] = useState('')
  const [labelInput, setLabelInput] = useState('')

  // 리드 수동 등록
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', inquiry: '', referral_code: '' })

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/advertiser/referrals')
      if (response.ok) {
        const data = await response.json()
        setReferrals(data.referrals || [])
      }
    } catch (error) {
      console.error('Referrals fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddReferral = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast.error('이름과 연락처는 필수입니다')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/advertiser/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          phone: addForm.phone.trim(),
          inquiry: addForm.inquiry.trim() || null,
          partner_referral_code: addForm.referral_code.trim() || null,
        }),
      })
      if (res.ok) {
        toast.success('리드가 등록되었습니다')
        setAddOpen(false)
        setAddForm({ name: '', phone: '', inquiry: '', referral_code: '' })
        await fetchReferrals()
      } else {
        const data = await res.json()
        toast.error(data.error || '등록에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setAdding(false)
  }

  const handleStatusChange = async (referralId: string, newStatus: string) => {
    const prev = referrals.find(r => r.id === referralId)
    // 낙관적 업데이트
    setReferrals(rs => rs.map(r => r.id === referralId ? { ...r, contract_status: newStatus } : r))

    try {
      const response = await fetch(`/api/advertiser/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_status: newStatus }),
      })

      if (response.ok) {
        toast.success(`${statusLabels[newStatus]?.label || newStatus}(으)로 변경됨`)
        if (newStatus === 'completed') {
          toast.info('계약 완료 — 정산이 자동 생성됩니다')
        }
      } else {
        // 롤백
        if (prev) setReferrals(rs => rs.map(r => r.id === referralId ? prev : r))
        const data = await response.json()
        toast.error(data.error || '상태 변경 실패')
      }
    } catch {
      if (prev) setReferrals(rs => rs.map(r => r.id === referralId ? prev : r))
      toast.error('서버 오류')
    }
  }

  const handleValidChange = async (referralId: string, isValid: boolean | null) => {
    const prev = referrals.find(r => r.id === referralId)
    setReferrals(rs => rs.map(r => r.id === referralId ? { ...r, is_valid: isValid } : r))

    try {
      const response = await fetch(`/api/advertiser/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_valid: isValid }),
      })

      if (response.ok) {
        toast.success(isValid === true ? '유효 처리됨 — 정산 생성' : isValid === false ? '무효 처리됨' : '미정으로 변경')
      } else {
        if (prev) setReferrals(rs => rs.map(r => r.id === referralId ? prev : r))
        toast.error('상태 변경 실패')
      }
    } catch {
      if (prev) setReferrals(rs => rs.map(r => r.id === referralId ? prev : r))
    }
  }

  const handleSaveMemo = async () => {
    if (!selectedReferral) return
    try {
      const res = await fetch(`/api/advertiser/referrals/${selectedReferral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoText }),
      })
      if (res.ok) {
        setReferrals(rs => rs.map(r => r.id === selectedReferral.id ? { ...r, memo: memoText } : r))
        setSelectedReferral(prev => prev ? { ...prev, memo: memoText } : null)
        toast.success('메모 저장됨')
      }
    } catch {
      toast.error('메모 저장 실패')
    }
  }

  const handleAddLabel = async () => {
    if (!selectedReferral || !labelInput.trim()) return
    const newLabels = [...(selectedReferral.labels || []), labelInput.trim()]
    try {
      const res = await fetch(`/api/advertiser/referrals/${selectedReferral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: newLabels }),
      })
      if (res.ok) {
        setReferrals(rs => rs.map(r => r.id === selectedReferral.id ? { ...r, labels: newLabels } : r))
        setSelectedReferral(prev => prev ? { ...prev, labels: newLabels } : null)
        setLabelInput('')
        toast.success('라벨 추가됨')
      }
    } catch {
      toast.error('라벨 추가 실패')
    }
  }

  const handleRemoveLabel = async (label: string) => {
    if (!selectedReferral) return
    const newLabels = (selectedReferral.labels || []).filter(l => l !== label)
    try {
      const res = await fetch(`/api/advertiser/referrals/${selectedReferral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: newLabels }),
      })
      if (res.ok) {
        setReferrals(rs => rs.map(r => r.id === selectedReferral.id ? { ...r, labels: newLabels } : r))
        setSelectedReferral(prev => prev ? { ...prev, labels: newLabels } : null)
      }
    } catch {
      toast.error('라벨 삭제 실패')
    }
  }

  const handlePriorityChange = async (priority: string) => {
    if (!selectedReferral) return
    try {
      const res = await fetch(`/api/advertiser/referrals/${selectedReferral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
      if (res.ok) {
        setReferrals(rs => rs.map(r => r.id === selectedReferral.id ? { ...r, priority } : r))
        setSelectedReferral(prev => prev ? { ...prev, priority } : null)
        toast.success('우선순위 변경됨')
      }
    } catch {
      toast.error('우선순위 변경 실패')
    }
  }

  const handleExportCsv = () => {
    const headers = ['유입일', '고객명', '연락처', '추천파트너', '유입채널', '계약상태', '유효여부', '우선순위', '메모', '문의내용']
    const rows = filteredReferrals.map(r => [
      new Date(r.created_at).toLocaleDateString('ko-KR'),
      r.name,
      r.phone || '',
      r.partner_name || r.referral_code_input || '직접유입',
      r.channel || '',
      statusLabels[r.contract_status]?.label || r.contract_status,
      r.is_valid === true ? '유효' : r.is_valid === false ? '무효' : '미정',
      r.priority || 'normal',
      (r.memo || '').replace(/,/g, ' ').replace(/\n/g, ' '),
      (r.inquiry || '').replace(/,/g, ' ').replace(/\n/g, ' '),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `고객목록_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openDetail = (referral: Referral) => {
    setSelectedReferral(referral)
    setMemoText(referral.memo || '')
    setDetailOpen(true)
  }

  const filteredReferrals = referrals.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.phone?.includes(searchTerm) ?? false) ||
      (r.referral_code_input?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesStatus = statusFilter === 'all' || r.contract_status === statusFilter
    return matchesSearch && matchesStatus
  })

  // 퍼널 통계
  const funnelCounts = FUNNEL_STAGES.map(stage => ({
    stage,
    ...statusLabels[stage],
    count: referrals.filter(r => r.contract_status === stage).length,
  }))
  const invalidCount = referrals.filter(r => r.contract_status === 'invalid' || r.contract_status === 'duplicate').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">고객 관리</h1>
          <p className="text-slate-500 mt-1">영업 파이프라인 & CRM</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="text-slate-500">총 {referrals.length}건</p>
            <p className="text-green-600 font-medium">
              유효 {referrals.filter(r => r.is_valid === true).length} &middot;
              계약 {referrals.filter(r => r.contract_status === 'completed').length}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredReferrals.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV 내보내기
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setAddOpen(true)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            리드 직접 등록
          </Button>
        </div>
      </div>

      {/* 리드 수동 등록 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>리드 직접 등록</DialogTitle>
            <DialogDescription>
              파트너 추천 링크를 통하지 않고 수집한 고객 정보를 직접 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="add-name">이름 <span className="text-red-500">*</span></Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="홍길동"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="add-phone">연락처 <span className="text-red-500">*</span></Label>
              <Input
                id="add-phone"
                type="tel"
                value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="010-1234-5678"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-referral">파트너 추천 코드 <span className="text-slate-400 font-normal">(선택)</span></Label>
              <Input
                id="add-referral"
                value={addForm.referral_code}
                onChange={e => setAddForm(f => ({ ...f, referral_code: e.target.value }))}
                placeholder="파트너 코드 입력 시 해당 파트너에 연결됩니다"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-inquiry">메모 <span className="text-slate-400 font-normal">(선택)</span></Label>
              <Textarea
                id="add-inquiry"
                value={addForm.inquiry}
                onChange={e => setAddForm(f => ({ ...f, inquiry: e.target.value }))}
                placeholder="통화 내용, 관심 서비스 등..."
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              취소
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleAddReferral}
              disabled={adding || !addForm.name.trim() || !addForm.phone.trim()}
            >
              {adding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />등록 중...</>
              ) : (
                '등록하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 영업 퍼널 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {funnelCounts.map(f => (
          <Card
            key={f.stage}
            className={`cursor-pointer transition-all ${statusFilter === f.stage ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setStatusFilter(statusFilter === f.stage ? 'all' : f.stage)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{f.count}</p>
              <p className="text-xs text-slate-500">{f.emoji} {f.label}</p>
            </CardContent>
          </Card>
        ))}
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'invalid' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}
          onClick={() => setStatusFilter(statusFilter === 'invalid' ? 'all' : 'invalid')}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{invalidCount}</p>
            <p className="text-xs text-slate-500">❌ 무효/중복</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="이름, 연락처, 추천코드로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="계약 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">신규</SelectItem>
            <SelectItem value="call_1">1차 통화</SelectItem>
            <SelectItem value="call_2">2차 통화</SelectItem>
            <SelectItem value="call_3">3차 통화</SelectItem>
            <SelectItem value="completed">계약완료</SelectItem>
            <SelectItem value="invalid">무효</SelectItem>
            <SelectItem value="duplicate">중복</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 고객 테이블 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유입일</TableHead>
              <TableHead>고객명</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>추천 파트너</TableHead>
              <TableHead>유입채널</TableHead>
              <TableHead>계약 상태</TableHead>
              <TableHead>유효 여부</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReferrals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  {referrals.length === 0 ? '등록된 고객이 없습니다' : '검색 결과가 없습니다'}
                </TableCell>
              </TableRow>
            ) : (
              filteredReferrals.map((referral) => (
                <TableRow key={referral.id} className="group">
                  <TableCell className="text-sm text-slate-500">
                    {new Date(referral.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-medium text-left hover:text-blue-600 transition-colors"
                      onClick={() => openDetail(referral)}
                    >
                      {referral.name}
                      {referral.priority === 'high' && <span className="ml-1 text-orange-500">!</span>}
                      {referral.priority === 'urgent' && <span className="ml-1 text-red-500">!!</span>}
                    </button>
                    {referral.labels && referral.labels.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {referral.labels.slice(0, 2).map(l => (
                          <span key={l} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{l}</span>
                        ))}
                        {referral.labels.length > 2 && (
                          <span className="text-[10px] text-slate-400">+{referral.labels.length - 2}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {referral.phone || '-'}
                  </TableCell>
                  <TableCell>
                    {referral.partner_name ? (
                      <span className="text-sm">{referral.partner_name}</span>
                    ) : referral.referral_code_input ? (
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {referral.referral_code_input}
                      </code>
                    ) : (
                      <span className="text-slate-400">직접유입</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {referral.channel ? (
                      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 font-normal text-xs">
                        {referral.channel}
                      </Badge>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={referral.contract_status}
                      onValueChange={(value) => handleStatusChange(referral.id, value)}
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <Badge className={statusLabels[referral.contract_status]?.color || 'bg-gray-100'}>
                          {statusLabels[referral.contract_status]?.label || referral.contract_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">🆕 신규</SelectItem>
                        <SelectItem value="call_1">📞 1차 통화</SelectItem>
                        <SelectItem value="call_2">📞 2차 통화</SelectItem>
                        <SelectItem value="call_3">📞 3차 통화</SelectItem>
                        <SelectItem value="completed">✅ 계약완료</SelectItem>
                        <SelectItem value="invalid">❌ 무효</SelectItem>
                        <SelectItem value="duplicate">🔄 중복</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={referral.is_valid === true ? 'default' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => handleValidChange(referral.id, referral.is_valid === true ? null : true)}
                      >
                        유효
                      </Button>
                      <Button
                        size="sm"
                        variant={referral.is_valid === false ? 'destructive' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => handleValidChange(referral.id, referral.is_valid === false ? null : false)}
                      >
                        무효
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[120px]">
                    <p className="text-xs text-slate-400 truncate">{referral.memo || '-'}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openDetail(referral)}>
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 고객 상세 다이얼로그 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReferral && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedReferral.name}
                  <Badge className={statusLabels[selectedReferral.contract_status]?.color}>
                    {statusLabels[selectedReferral.contract_status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">연락처</p>
                    <p className="font-medium">{selectedReferral.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">유입일</p>
                    <p className="font-medium">{new Date(selectedReferral.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">추천 파트너</p>
                    <p className="font-medium">{selectedReferral.partner_name || '직접유입'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">담당자</p>
                    <p className="font-medium">{selectedReferral.sales_rep || '미배정'}</p>
                  </div>
                </div>

                {selectedReferral.inquiry && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">문의 내용</p>
                    <p className="text-sm">{selectedReferral.inquiry}</p>
                  </div>
                )}

                {/* 상태 변경 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">계약 상태</Label>
                    <Select
                      value={selectedReferral.contract_status}
                      onValueChange={(v) => {
                        handleStatusChange(selectedReferral.id, v)
                        setSelectedReferral(prev => prev ? { ...prev, contract_status: v } : null)
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">신규</SelectItem>
                        <SelectItem value="call_1">1차 통화</SelectItem>
                        <SelectItem value="call_2">2차 통화</SelectItem>
                        <SelectItem value="call_3">3차 통화</SelectItem>
                        <SelectItem value="completed">계약완료</SelectItem>
                        <SelectItem value="invalid">무효</SelectItem>
                        <SelectItem value="duplicate">중복</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">우선순위</Label>
                    <Select
                      value={selectedReferral.priority || 'normal'}
                      onValueChange={handlePriorityChange}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">낮음</SelectItem>
                        <SelectItem value="normal">보통</SelectItem>
                        <SelectItem value="high">높음</SelectItem>
                        <SelectItem value="urgent">긴급</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 유효 여부 */}
                <div>
                  <Label className="text-xs">유효 여부</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      variant={selectedReferral.is_valid === true ? 'default' : 'outline'}
                      onClick={() => {
                        const newVal = selectedReferral.is_valid === true ? null : true
                        handleValidChange(selectedReferral.id, newVal)
                        setSelectedReferral(prev => prev ? { ...prev, is_valid: newVal } : null)
                      }}
                    >
                      유효
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedReferral.is_valid === false ? 'destructive' : 'outline'}
                      onClick={() => {
                        const newVal = selectedReferral.is_valid === false ? null : false
                        handleValidChange(selectedReferral.id, newVal)
                        setSelectedReferral(prev => prev ? { ...prev, is_valid: newVal } : null)
                      }}
                    >
                      무효
                    </Button>
                  </div>
                </div>

                {/* 라벨 */}
                <div>
                  <Label className="text-xs">라벨</Label>
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {(selectedReferral.labels || []).map(label => (
                      <Badge key={label} variant="secondary" className="text-xs gap-1">
                        {label}
                        <button onClick={() => handleRemoveLabel(label)} className="hover:text-red-500">&times;</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={labelInput}
                      onChange={e => setLabelInput(e.target.value)}
                      placeholder="라벨 추가..."
                      className="h-8 text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddLabel()}
                    />
                    <Button size="sm" variant="outline" onClick={handleAddLabel}>추가</Button>
                  </div>
                </div>

                {/* 메모 */}
                <div>
                  <Label className="text-xs">메모</Label>
                  <Textarea
                    value={memoText}
                    onChange={e => setMemoText(e.target.value)}
                    rows={3}
                    placeholder="고객에 대한 메모를 남겨주세요..."
                    className="mt-1"
                  />
                  <Button size="sm" className="mt-2" onClick={handleSaveMemo}>메모 저장</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
