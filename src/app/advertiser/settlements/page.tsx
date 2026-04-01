'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, ChevronDown, ChevronUp, Mail, Check, Send, FileText } from 'lucide-react'

// ── Types ──

interface SettlementItem {
  id: string
  type: string | null
  referral_id: string | null
  referral_name: string | null
  amount: number
  status: 'pending' | 'completed'
  settled_at: string | null
  note: string | null
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
  settlements: SettlementItem[]
}

interface Stats {
  totalPartners: number
  totalPending: number
  totalPendingAmount: number
  totalCompleted: number
  totalCompletedAmount: number
  thisMonthAmount: number
}

// ── Helpers ──

const fmt = (n: number) =>
  new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(n)

// ── Page Component ──

export default function AdvertiserSettlementsPage() {
  const [partners, setPartners] = useState<PartnerGroup[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Track expanded cards and selected settlements per partner
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})

  const [processing, setProcessing] = useState(false)
  const [emailSending, setEmailSending] = useState<string | null>(null) // partner_id or 'all'

  const [showConfirmSheet, setShowConfirmSheet] = useState(false)
  const [sheetProcessing, setSheetProcessing] = useState(false)

  const [previewModal, setPreviewModal] = useState<{
    partnerId: string;
    partnerName: string;
    html: string;
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null) // partnerId
  const [settlementEmailSending, setSettlementEmailSending] = useState<string | null>(null) // partnerId

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/advertiser/settlements')
      if (res.ok) {
        const data = await res.json()
        setPartners(data.partners || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error('Settlements fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Actions ──

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelect = (partnerId: string, settlementId: string) => {
    setSelected(prev => {
      const set = new Set(prev[partnerId] || [])
      if (set.has(settlementId)) set.delete(settlementId)
      else set.add(settlementId)
      return { ...prev, [partnerId]: set }
    })
  }

  const toggleSelectAllPending = (partnerId: string, pendingIds: string[]) => {
    setSelected(prev => {
      const current = prev[partnerId] || new Set()
      const allSelected = pendingIds.every(id => current.has(id))
      return {
        ...prev,
        [partnerId]: allSelected ? new Set() : new Set(pendingIds),
      }
    })
  }

  const handleComplete = async (settlementIds: string[]) => {
    if (settlementIds.length === 0) return
    setProcessing(true)
    try {
      const res = await fetch('/api/advertiser/settlements/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlement_ids: settlementIds }),
      })
      if (res.ok) {
        // Clear selections and refresh
        setSelected({})
        await fetchData()
      }
    } catch (err) {
      console.error('Complete error:', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleRequestInfo = async (partnerIds: string[]) => {
    if (partnerIds.length === 0) return
    const key = partnerIds.length === 1 ? partnerIds[0] : 'all'
    setEmailSending(key)
    try {
      const res = await fetch('/api/advertiser/settlements/request-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_ids: partnerIds }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`발송 완료: ${data.sent}건 성공${data.failed ? `, ${data.failed}건 실패` : ''}`)
      } else {
        alert('이메일 발송에 실패했습니다')
      }
    } catch (err) {
      console.error('Request info error:', err)
      alert('이메일 발송 중 오류가 발생했습니다')
    } finally {
      setEmailSending(null)
    }
  }

  const handlePreviewEmail = async (partnerId: string, partnerName: string) => {
    setPreviewLoading(partnerId)
    try {
      const res = await fetch('/api/advertiser/settlements/preview-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreviewModal({ partnerId, partnerName, html: data.html })
      } else {
        alert('미리보기 로드에 실패했습니다')
      }
    } finally {
      setPreviewLoading(null)
    }
  }

  const handleSendSettlementEmail = async (partnerId: string, partnerName: string) => {
    if (!confirm(`${partnerName}님에게 정산 안내 메일을 발송하시겠습니까?`)) return
    setSettlementEmailSending(partnerId)
    try {
      const res = await fetch('/api/advertiser/settlements/send-settlement-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(data.type === 'confirmed' ? '정산 확정 안내 메일을 발송했습니다' : '정산 정보 입력 요청 메일을 발송했습니다')
      } else {
        alert('이메일 발송에 실패했습니다')
      }
    } finally {
      setSettlementEmailSending(null)
    }
  }

  const handleBulkComplete = async () => {
    const allPendingIds = partners.flatMap(p =>
      p.settlements.filter(s => s.status === 'pending').map(s => s.id)
    )
    if (allPendingIds.length === 0) return

    setSheetProcessing(true)
    try {
      const res = await fetch('/api/advertiser/settlements/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlement_ids: allPendingIds }),
      })
      if (res.ok) {
        setShowConfirmSheet(false)
        setSelected({})
        await fetchData()
      } else {
        alert('정산 처리 중 오류가 발생했습니다')
      }
    } finally {
      setSheetProcessing(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/advertiser/settlements/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `정산목록_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export error:', err)
      alert('CSV 다운로드에 실패했습니다')
    }
  }

  // ── Derived data ──

  const filtered = partners.filter(p =>
    p.partner_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Partners missing account or SSN info
  const missingInfoPartnerIds = partners
    .filter(p => !p.bank_name || !p.bank_account || !p.has_ssn)
    .map(p => p.partner_id)

  // ── Loading skeleton ──

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
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <div className="h-12 bg-slate-200 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">정산 관리</h1>
          <p className="text-slate-500 mt-1">파트너 정산 처리 및 내역 관리</p>
        </div>
        <div className="flex gap-2">
          {missingInfoPartnerIds.length > 0 && (
            <Button
              variant="outline"
              onClick={() => handleRequestInfo(missingInfoPartnerIds)}
              disabled={emailSending === 'all'}
            >
              <Send className="w-4 h-4 mr-2" />
              {emailSending === 'all' ? '발송 중...' : `전체 이메일 발송 (${missingInfoPartnerIds.length}명)`}
            </Button>
          )}
          {(stats?.totalPending ?? 0) > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowConfirmSheet(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              정산 확인서 ({stats?.totalPending ?? 0}건)
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={partners.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV 다운로드
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-sm text-slate-500">파트너 수</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.totalPartners ?? 0}명
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">대기 건수</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {stats?.totalPending ?? 0}건
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">대기 금액</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {fmt(stats?.totalPendingAmount ?? 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">이번 달 정산</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {fmt(stats?.thisMonthAmount ?? 0)}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="파트너명으로 검색..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      {/* Partner Cards */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          {searchTerm ? '검색 결과가 없습니다' : '정산 내역이 없습니다'}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <PartnerCard
              key={p.partner_id}
              partner={p}
              isExpanded={expanded.has(p.partner_id)}
              selectedIds={selected[p.partner_id] || new Set()}
              processing={processing}
              emailSending={emailSending}
              previewLoading={previewLoading}
              settlementEmailSending={settlementEmailSending}
              onToggleExpand={() => toggleExpand(p.partner_id)}
              onToggleSelect={(sid) => toggleSelect(p.partner_id, sid)}
              onToggleSelectAll={(ids) => toggleSelectAllPending(p.partner_id, ids)}
              onComplete={(ids) => handleComplete(ids)}
              onRequestInfo={(pid) => handleRequestInfo([pid])}
              onPreviewEmail={(pid, pname) => handlePreviewEmail(pid, pname)}
              onSendSettlementEmail={(pid, pname) => handleSendSettlementEmail(pid, pname)}
            />
          ))}
        </div>
      )}

      {/* Settlement Confirm Sheet */}
      {showConfirmSheet && (
        <SettlementConfirmSheet
          partners={partners}
          stats={stats}
          onClose={() => setShowConfirmSheet(false)}
          onBulkComplete={handleBulkComplete}
          processing={sheetProcessing}
        />
      )}

      {/* Email Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-900">
                정산 안내 이메일 미리보기 — {previewModal.partnerName}
              </h3>
              <button
                onClick={() => setPreviewModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                srcDoc={previewModal.html}
                className="w-full h-full min-h-[500px] border-0"
                title="이메일 미리보기"
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <Button variant="outline" onClick={() => setPreviewModal(null)}>
                닫기
              </Button>
              <Button
                onClick={() => {
                  handleSendSettlementEmail(previewModal.partnerId, previewModal.partnerName)
                  setPreviewModal(null)
                }}
                disabled={settlementEmailSending === previewModal.partnerId}
              >
                <Send className="w-4 h-4 mr-2" />
                메일 발송
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Settlement Confirm Sheet ──

function SettlementConfirmSheet({
  partners,
  onClose,
  onBulkComplete,
  processing,
}: {
  partners: PartnerGroup[]
  stats: Stats | null
  onClose: () => void
  onBulkComplete: () => void
  processing: boolean
}) {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const pendingPartners = partners.filter(p => p.settlements.some(s => s.status === 'pending'))
  const totalPendingAmount = pendingPartners.reduce((sum, p) => sum + p.pending_amount, 0)
  const totalPendingCount = pendingPartners.reduce(
    (sum, p) => sum + p.settlements.filter(s => s.status === 'pending').length,
    0
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <style>{`@media print { body * { visibility: hidden; } #settlement-confirm-sheet, #settlement-confirm-sheet * { visibility: visible; } #settlement-confirm-sheet { position: absolute; left: 0; top: 0; width: 100%; } .print-hidden { display: none !important; } }`}</style>
      <div className="w-full max-w-3xl">
        {/* Action bar (hidden on print) */}
        <div className="flex justify-between items-center mb-4 print-hidden">
          <h2 className="text-white font-semibold text-lg">정산 확인서 미리보기</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-100"
            >
              인쇄 / PDF 저장
            </button>
            <button
              onClick={onBulkComplete}
              disabled={processing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? '처리 중...' : `전체 정산 완료 (${totalPendingCount}건)`}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600"
            >
              닫기
            </button>
          </div>
        </div>

        {/* Document body */}
        <div id="settlement-confirm-sheet" className="bg-white rounded-xl shadow-2xl p-10 print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">정 산 확 인 서</h1>
            <p className="text-slate-500 text-sm mt-1">Settlement Confirmation</p>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div className="space-y-2">
              <div className="flex">
                <span className="w-24 text-slate-500 shrink-0">작성일</span>
                <span className="font-medium">{today}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500 shrink-0">정산 대상</span>
                <span className="font-medium">{pendingPartners.length}명</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500 shrink-0">정산 건수</span>
                <span className="font-medium">{totalPendingCount}건</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">총 정산 예정 금액</p>
              <p className="text-2xl font-bold text-indigo-700">
                {fmt(totalPendingAmount)}
              </p>
              <p className="text-xs text-slate-400 mt-1">세금 처리 전 금액</p>
            </div>
          </div>

          {/* Partner table */}
          <table className="w-full border-collapse text-sm mb-8">
            <thead>
              <tr className="border-y-2 border-slate-900">
                <th className="py-2 text-left font-semibold text-slate-700 w-6">No.</th>
                <th className="py-2 text-left font-semibold text-slate-700">파트너명</th>
                <th className="py-2 text-left font-semibold text-slate-700">은행 / 계좌</th>
                <th className="py-2 text-right font-semibold text-slate-700">정산 건수</th>
                <th className="py-2 text-right font-semibold text-slate-700">정산 금액</th>
                <th className="py-2 text-center font-semibold text-slate-700">정보 상태</th>
              </tr>
            </thead>
            <tbody>
              {pendingPartners.map((p, idx) => {
                const pendingCount = p.settlements.filter(s => s.status === 'pending').length
                return (
                  <tr key={p.partner_id} className="border-b border-slate-200">
                    <td className="py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="font-medium text-slate-900">{p.partner_name}</div>
                      <div className="text-xs text-slate-400">{p.partner_email}</div>
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {p.bank_name && p.bank_account ? (
                        <>
                          {`${p.bank_name} ${'*'.repeat(Math.max(0, p.bank_account.length - 4))}${p.bank_account.slice(-4)}`}
                          {p.account_holder && (
                            <div className="text-xs text-slate-400">{p.account_holder}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-red-500 text-xs">미등록</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-slate-700">{pendingCount}건</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {fmt(p.pending_amount)}
                    </td>
                    <td className="py-2.5 text-center">
                      {p.bank_name && p.has_ssn ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">완료</span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">미등록</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td></td>
                <td colSpan={3} className="py-3 font-bold text-slate-900">합 계</td>
                <td className="py-3 text-right font-bold text-indigo-700 text-base">
                  {fmt(totalPendingAmount)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Notice */}
          <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 mb-10">
            <p>· 위 금액은 세금 처리 전 금액이며, 최종 입금액은 소득세 원천징수(3.3%) 후 산정됩니다.</p>
            <p className="mt-1">· 계좌 정보가 미등록된 파트너에게는 정보 입력 요청 메일이 자동 발송됩니다.</p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Partner Card ──

function PartnerCard({
  partner: p,
  isExpanded,
  selectedIds,
  processing,
  emailSending,
  previewLoading,
  settlementEmailSending,
  onToggleExpand,
  onToggleSelect,
  onToggleSelectAll,
  onComplete,
  onRequestInfo,
  onPreviewEmail,
  onSendSettlementEmail,
}: {
  partner: PartnerGroup
  isExpanded: boolean
  selectedIds: Set<string>
  processing: boolean
  emailSending: string | null
  previewLoading: string | null
  settlementEmailSending: string | null
  onToggleExpand: () => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (ids: string[]) => void
  onComplete: (ids: string[]) => void
  onRequestInfo: (partnerId: string) => void
  onPreviewEmail: (partnerId: string, partnerName: string) => void
  onSendSettlementEmail: (partnerId: string, partnerName: string) => void
}) {
  const pendingItems = p.settlements.filter(s => s.status === 'pending')
  const pendingIds = pendingItems.map(s => s.id)
  const selectedCount = Array.from(selectedIds).filter(id => pendingIds.includes(id)).length
  const needsInfo = !p.bank_name || !p.bank_account || !p.has_ssn

  return (
    <Card className="overflow-hidden">
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="font-semibold text-slate-900 text-base">{p.partner_name}</span>
          <span className="text-sm text-slate-500">{p.settlement_count}건</span>
          <span className="font-medium text-slate-700">{fmt(p.total_amount)}</span>

          {/* Bank badge */}
          {p.bank_name ? (
            <Badge className="bg-blue-100 text-blue-800 text-xs">{p.bank_name}</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 text-xs">계좌미입력</Badge>
          )}

          {/* Status badge */}
          {pendingItems.length > 0 ? (
            <Badge className="bg-orange-100 text-orange-800 text-xs">대기 {pendingItems.length}건</Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 text-xs">완료</Badge>
          )}

          {/* SSN badge */}
          {p.has_ssn ? (
            <Badge className="bg-green-100 text-green-700 text-xs">주민번호 완료</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 text-xs">주민번호 미입력</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
          {needsInfo && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRequestInfo(p.partner_id)}
              disabled={emailSending === p.partner_id}
            >
              <Mail className="w-3.5 h-3.5 mr-1" />
              {emailSending === p.partner_id ? '발송 중' : '계좌요청'}
            </Button>
          )}
          {/* 정산 안내 이메일 버튼 - pending이 있는 파트너에게만 표시 */}
          {pendingItems.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreviewEmail(p.partner_id, p.partner_name)}
              disabled={previewLoading === p.partner_id}
            >
              <Mail className="w-3.5 h-3.5 mr-1" />
              {previewLoading === p.partner_id ? '로딩...' : '정산 안내'}
            </Button>
          )}
          {selectedCount > 0 && (
            <Button
              size="sm"
              onClick={() => onComplete(Array.from(selectedIds))}
              disabled={processing}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              {processing ? '처리 중...' : `정산 완료 (${selectedCount}건)`}
            </Button>
          )}
          <div className="ml-1 text-slate-400" onClick={onToggleExpand}>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t">
          {/* Settlement table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {pendingIds.length > 0 && (
                      <input
                        type="checkbox"
                        checked={pendingIds.length > 0 && pendingIds.every(id => selectedIds.has(id))}
                        onChange={() => onToggleSelectAll(pendingIds)}
                        className="rounded"
                      />
                    )}
                  </TableHead>
                  <TableHead>정산ID</TableHead>
                  <TableHead>고객명</TableHead>
                  <TableHead>정산유형</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.settlements.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => onToggleSelect(s.id)}
                          className="rounded"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      #{s.id}
                    </TableCell>
                    <TableCell>
                      {s.referral_name ? `${s.referral_name.substring(0, 1)}**` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={s.type === 'valid' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                        {s.type === 'valid' ? '유효' : s.type === 'contract' ? '계약' : (s.type || '-')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(s.amount)}
                    </TableCell>
                    <TableCell>
                      {s.status === 'pending' ? (
                        <Badge className="bg-orange-100 text-orange-800">대기</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">완료</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Account info footer */}
          <div className="px-4 py-3 bg-slate-50 border-t text-sm text-slate-600">
            {p.bank_name && p.bank_account ? (
              <span>
                계좌: {p.bank_name} · {p.bank_account}
                {p.account_holder && ` · 예금주 ${p.account_holder}`}
              </span>
            ) : (
              <span className="text-red-500">계좌 정보가 등록되지 않았습니다</span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
