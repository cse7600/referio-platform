'use client'

// DEMO[sales-demo]
import { useDemoMode } from '@/contexts/demo-mode-context'
import { getDemoConfig } from '@/lib/demo-data/demo-config'
import { DEMO_PARTNERS as CHABYULHWA_PARTNERS } from '@/lib/demo-data/chabyulhwa-demo'
import { DEMO_PARTNERS as MILLIE_PARTNERS } from '@/lib/demo-data/millie-demo'

import { useEffect, useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, ExternalLink, X, Save, Link, ChevronUp, ChevronDown, ChevronsUpDown, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PartnerActivityLink } from '@/types/database'

interface Partner {
  id: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  tier: 'authorized' | 'silver' | 'gold' | 'platinum'
  referral_code: string
  channels: string[] | null
  main_channel_link: string | null
  is_active_partner: boolean | null
  activity_link: string | null
  memo: string | null
  created_at: string
  program_created_at: string
  monthly_lead_count: number
  monthly_contract_count: number
  total_lead_count: number
  total_contract_count: number
  bank_name: string | null
  bank_account: string | null
  account_holder: string | null
  ssn_encrypted: string | null
  phone: string | null
  email: string | null
  lead_commission: number
  contract_commission: number
  program_id: string
  applied_at: string
  approved_at: string | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${h}:${min}`
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-green-100 text-green-800' },
  rejected: { label: '거절', color: 'bg-red-100 text-red-800' },
}

const tierLabels: Record<string, { label: string; color: string }> = {
  authorized: { label: 'Authorized', color: 'bg-slate-100 text-slate-800' },
  silver: { label: 'Silver', color: 'bg-gray-200 text-gray-800' },
  gold: { label: 'Gold', color: 'bg-yellow-200 text-yellow-800' },
  platinum: { label: 'Platinum', color: 'bg-purple-200 text-purple-800' },
}

const hasSettlementInfo = (p: Partner) =>
  !!(p.bank_name && p.bank_account && p.account_holder)

type SortKey = 'program_created_at' | 'created_at' | 'name' | 'monthly_lead_count' | 'monthly_contract_count' | 'total_lead_count' | 'total_contract_count'

export default function AdvertiserPartnersPage() {
  // DEMO[sales-demo]
  const { advertiserId: demoAdvertiserId, isDemoMode } = useDemoMode()
  const isDemo = isDemoMode && (demoAdvertiserId === 'chabyulhwa' || demoAdvertiserId === 'millie')
  const demoConfig = isDemo ? getDemoConfig(demoAdvertiserId) : undefined
  const leadLabel = demoConfig?.leadLabel ?? '리드'
  const contractLabel = demoConfig?.contractLabel ?? '계약'

  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [settlementFilter, setSettlementFilter] = useState(false)
  const [advertiserId, setAdvertiserId] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('program_created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Side panel state
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [panelActive, setPanelActive] = useState(false)
  const [editIsActive, setEditIsActive] = useState(false)
  const [editMainChannelLink, setEditMainChannelLink] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [saving, setSaving] = useState(false)

  // Activity links (plural)
  const [activityLinks, setActivityLinks] = useState<PartnerActivityLink[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [addingLink, setAddingLink] = useState(false)

  useEffect(() => {
    // DEMO[sales-demo]
    if (isDemo) {
      const demoPartners = demoAdvertiserId === 'millie' ? MILLIE_PARTNERS : CHABYULHWA_PARTNERS
      setPartners(demoPartners as Partner[])
      setLoading(false)
      return
    }
    fetchPartners()
    fetch('/api/auth/advertiser/me')
      .then(r => r.json())
      .then(d => { if (d.advertiser?.advertiserId) setAdvertiserId(d.advertiser.advertiserId) })
      .catch(() => {})
  }, [isDemo])

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/advertiser/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Partners fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityLinks = async (partnerId: string) => {
    try {
      const res = await fetch(`/api/advertiser/partners/${partnerId}/activity-links`)
      if (res.ok) {
        const data = await res.json()
        setActivityLinks(data.links ?? [])
      }
    } catch {
      // ignore
    }
  }

  const openPanel = (partner: Partner) => {
    setSelectedPartner(partner)
    setEditIsActive(partner.is_active_partner ?? false)
    setEditMainChannelLink(partner.main_channel_link ?? '')
    setEditMemo(partner.memo ?? '')
    setActivityLinks([])
    setNewLinkUrl('')
    setPanelActive(true)
    fetchActivityLinks(partner.id)
  }

  const closePanel = () => {
    setPanelActive(false)
    setTimeout(() => { setSelectedPartner(null); setActivityLinks([]) }, 300)
  }

  const handleAddLink = async () => {
    if (!selectedPartner || !newLinkUrl.trim()) return
    setAddingLink(true)
    try {
      const res = await fetch(`/api/advertiser/partners/${selectedPartner.id}/activity-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newLinkUrl.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setActivityLinks(prev => [data.link, ...prev])
        setNewLinkUrl('')
        toast.success('링크가 추가됐습니다')
      } else {
        toast.error('링크 추가에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setAddingLink(false)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!selectedPartner) return
    try {
      const res = await fetch(`/api/advertiser/partners/${selectedPartner.id}/activity-links/${linkId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setActivityLinks(prev => prev.filter(l => l.id !== linkId))
        toast.success('링크가 삭제됐습니다')
      } else {
        toast.error('링크 삭제에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
  }

  const handleSave = async () => {
    if (!selectedPartner) return
    setSaving(true)
    try {
      const res = await fetch(`/api/advertiser/partners/${selectedPartner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active_partner: editIsActive,
          main_channel_link: editMainChannelLink || null,
          memo: editMemo || null,
        }),
      })
      if (res.ok) {
        setPartners(prev => prev.map(p =>
          p.id === selectedPartner.id
            ? { ...p, is_active_partner: editIsActive, main_channel_link: editMainChannelLink || null, memo: editMemo || null }
            : p
        ))
        setSelectedPartner(prev => prev ? { ...prev, is_active_partner: editIsActive, main_channel_link: editMainChannelLink || null, memo: editMemo || null } : null)
        toast.success('저장됐습니다')
      } else {
        toast.error('저장에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (partnerId: string, newValue: boolean) => {
    setEditIsActive(newValue)
    try {
      const res = await fetch(`/api/advertiser/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active_partner: newValue }),
      })
      if (res.ok) {
        setPartners(prev => prev.map(p =>
          p.id === partnerId ? { ...p, is_active_partner: newValue } : p
        ))
        setSelectedPartner(prev => prev ? { ...prev, is_active_partner: newValue } : null)
        toast.success(newValue ? '활동 중으로 변경됐습니다' : '비활동으로 변경됐습니다')
      } else {
        setEditIsActive(!newValue) // rollback
        toast.error('저장에 실패했습니다')
      }
    } catch {
      setEditIsActive(!newValue) // rollback
      toast.error('서버 오류가 발생했습니다')
    }
  }

  const handleStatusChange = async (partnerId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/advertiser/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        setPartners(prev =>
          prev.map(p => p.id === partnerId ? { ...p, status: newStatus } : p)
        )
      }
    } catch (error) {
      console.error('Status change error:', error)
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filteredPartners = useMemo(() => {
    let list = partners.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.channels || []).some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      const matchesSettlement = !settlementFilter || !hasSettlementInfo(p)
      return matchesSearch && matchesStatus && matchesSettlement
    })
    list = [...list].sort((a, b) => {
      let va: string | number = (a[sortKey] as string | number) || ''
      let vb: string | number = (b[sortKey] as string | number) || ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [partners, searchTerm, statusFilter, settlementFilter, sortKey, sortDir])

  const approvedPartners = filteredPartners.filter(p => p.status === 'approved')

  const SortableHead = ({ label, sortK }: { label: string; sortK: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-slate-50 whitespace-nowrap"
      onClick={() => toggleSort(sortK)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortK ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-slate-300" />
        )}
      </div>
    </TableHead>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const handleCopyInviteLink = () => {
    if (!advertiserId) return
    const link = `${window.location.origin}/signup/${advertiserId}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedInvite(true)
      toast.success('파트너 초대 링크가 복사되었습니다')
      setTimeout(() => setCopiedInvite(false), 2000)
    })
  }

  return (
    <div className="flex gap-0 relative">
      {/* Main content */}
      <div className={`flex-1 space-y-6 transition-all duration-300 ${panelActive ? 'mr-[380px]' : ''}`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">파트너 관리</h1>
            <p className="text-slate-500 mt-1">파트너 목록 및 승인 관리</p>
          </div>
          {advertiserId && (
            <Button variant="outline" onClick={handleCopyInviteLink}>
              {copiedInvite ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
              파트너 초대 링크 복사
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="파트너 이름으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? '전체' : s === 'pending' ? '대기' : s === 'approved' ? '승인' : '거절'}
              </Button>
            ))}
            <Button
              variant={settlementFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSettlementFilter(v => !v)}
            >
              정산정보 미입력
            </Button>
          </div>
        </div>

        {/* Partners Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">순위</TableHead>
                <SortableHead label="이름" sortK="name" />
                <TableHead>채널</TableHead>
                <TableHead>활동</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>티어</TableHead>
                <SortableHead label={`이번달 ${leadLabel}`} sortK="monthly_lead_count" />
                <SortableHead label={`이번달 ${contractLabel}`} sortK="monthly_contract_count" />
                <SortableHead label={`누적 ${leadLabel}`} sortK="total_lead_count" />
                <SortableHead label={`누적 ${contractLabel}`} sortK="total_contract_count" />
                <TableHead>정산정보</TableHead>
                <SortableHead label="참여일" sortK="program_created_at" />
                <SortableHead label="가입일" sortK="created_at" />
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-12 text-slate-500">
                    {partners.length === 0 ? '등록된 파트너가 없습니다' : '검색 결과가 없습니다'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => {
                  const rank = partner.status === 'approved'
                    ? approvedPartners.findIndex(p => p.id === partner.id) + 1
                    : null
                  const isSelected = selectedPartner?.id === partner.id

                  return (
                    <TableRow
                      key={partner.id}
                      onClick={() => openPanel(partner)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <TableCell className="text-center">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `${rank}위` : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {partner.name}
                          {partner.memo && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="메모 있음" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {partner.channels && partner.channels.length > 0 ? (
                            <div className="flex flex-wrap gap-1 items-center">
                              {partner.channels.slice(0, 2).map((ch, i) => {
                                const link = partner.main_channel_link
                                return link ? (
                                  <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}>
                                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-slate-200 flex items-center gap-0.5">
                                      {ch}<ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                                    </Badge>
                                  </a>
                                ) : (
                                  <Badge key={i} variant="secondary" className="text-xs">{ch}</Badge>
                                )
                              })}
                              {partner.channels.length > 2 && (
                                <span className="text-xs text-slate-400">+{partner.channels.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${partner.is_active_partner ? 'text-green-600' : 'text-slate-400'}`}>
                          {partner.is_active_partner ? '활동 중' : '비활동'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusLabels[partner.status]?.color}>
                          {statusLabels[partner.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={tierLabels[partner.tier]?.color}>
                          {tierLabels[partner.tier]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${(partner.monthly_lead_count || 0) > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {partner.monthly_lead_count || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${(partner.monthly_contract_count || 0) > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          {partner.monthly_contract_count || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${(partner.total_lead_count || 0) > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {partner.total_lead_count || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${(partner.total_contract_count || 0) > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          {partner.total_contract_count || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasSettlementInfo(partner) ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">입력완료</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-xs">미입력</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(partner.program_created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(partner.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {partner.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => handleStatusChange(partner.id, 'approved')}>승인</Button>
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(partner.id, 'rejected')}>거절</Button>
                          </div>
                        )}
                        {partner.status === 'rejected' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(partner.id, 'approved')}>재승인</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-white border-l border-slate-200 shadow-xl z-40 flex flex-col transition-transform duration-300 ${panelActive ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedPartner && (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-slate-900 text-base">{selectedPartner.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">{selectedPartner.referral_code}</code>
                  <span className="ml-2">{statusLabels[selectedPartner.status]?.label}</span>
                </p>
              </div>
              <button onClick={closePanel} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedPartner.monthly_lead_count || 0}</div>
                  <div className="text-xs text-blue-500 mt-0.5">이번 달 {leadLabel}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedPartner.monthly_contract_count || 0}</div>
                  <div className="text-xs text-green-500 mt-0.5">이번 달 {contractLabel}</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{selectedPartner.total_lead_count || 0}</div>
                  <div className="text-xs text-indigo-500 mt-0.5">누적 {leadLabel}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{selectedPartner.total_contract_count || 0}</div>
                  <div className="text-xs text-emerald-500 mt-0.5">누적 {contractLabel}</div>
                </div>
              </div>

              {/* 수수료 단가 */}
              {(selectedPartner.lead_commission > 0 || selectedPartner.contract_commission > 0) && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">수수료 단가</label>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">유효 DB 단가</span>
                      <span className="text-slate-800 font-medium">
                        {selectedPartner.lead_commission > 0 ? `${selectedPartner.lead_commission.toLocaleString()}원` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">{contractLabel} 단가</span>
                      <span className="text-slate-800 font-medium">
                        {selectedPartner.contract_commission > 0 ? `${selectedPartner.contract_commission.toLocaleString()}원` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 주활동채널 */}
              {selectedPartner.channels && selectedPartner.channels.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">주활동채널</label>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedPartner.channels.map((ch, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{ch}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 연락처 */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">연락처</label>
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">이메일</span>
                    <span className="text-slate-800">{selectedPartner.email || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">전화번호</span>
                    <span className="text-slate-800">{selectedPartner.phone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 활동 여부 체크박스 */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">활동 여부</label>
                <div className="mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => selectedPartner && handleToggleActive(selectedPartner.id, !editIsActive)}
                      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${editIsActive ? 'bg-green-500' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${editIsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className={`text-sm font-medium ${editIsActive ? 'text-green-600' : 'text-slate-400'}`}>
                      {editIsActive ? '활동 중' : '비활동'}
                    </span>
                  </label>
                </div>
              </div>

              {/* 주채널 링크 */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Link className="w-3 h-3" />주채널 링크
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    value={editMainChannelLink}
                    onChange={e => setEditMainChannelLink(e.target.value)}
                    placeholder="https://..."
                    className="text-sm h-8"
                  />
                  {editMainChannelLink && (
                    <a href={editMainChannelLink} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-8 px-2"><ExternalLink className="w-3.5 h-3.5" /></Button>
                    </a>
                  )}
                </div>
              </div>

              {/* 활동 링크 (복수) */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Link className="w-3 h-3" />활동 링크
                </label>
                <div className="mt-1.5 space-y-1.5">
                  {activityLinks.map(link => (
                    <div key={link.id} className="flex items-center gap-1.5">
                      <span className="flex-1 text-xs text-slate-700 truncate bg-slate-50 border border-slate-200 rounded px-2 py-1.5" title={link.url}>
                        {link.title || link.url}
                      </span>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {activityLinks.length === 0 && (
                    <p className="text-xs text-slate-400 italic">등록된 링크가 없습니다</p>
                  )}
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={newLinkUrl}
                      onChange={e => setNewLinkUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }}
                      placeholder="https://..."
                      className="text-sm h-8 flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={handleAddLink}
                      disabled={addingLink || !newLinkUrl.trim()}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 정산 정보 */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">정산 정보</label>
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">은행명</span>
                    <span className={selectedPartner.bank_name ? 'text-slate-800 font-medium' : 'text-red-400'}>
                      {selectedPartner.bank_name || '미입력'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">계좌번호</span>
                    <span className={selectedPartner.bank_account ? 'text-slate-800 font-medium' : 'text-red-400'}>
                      {selectedPartner.bank_account || '미입력'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">예금주</span>
                    <span className={selectedPartner.account_holder ? 'text-slate-800 font-medium' : 'text-red-400'}>
                      {selectedPartner.account_holder || '미입력'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">주민번호</span>
                    <span className={selectedPartner.ssn_encrypted ? 'text-slate-800 font-medium' : 'text-red-400'}>
                      {selectedPartner.ssn_encrypted ? '입력됨' : '미입력'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 메모 */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">메모</label>
                <Textarea
                  value={editMemo}
                  onChange={e => setEditMemo(e.target.value)}
                  placeholder="파트너 관련 메모를 입력하세요..."
                  className="mt-1.5 text-sm resize-none"
                  rows={5}
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-5 py-4 border-t border-slate-100">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Backdrop for mobile */}
      {panelActive && (
        <div
          className="fixed inset-0 bg-black/10 z-30 lg:hidden"
          onClick={closePanel}
        />
      )}
    </div>
  )
}
