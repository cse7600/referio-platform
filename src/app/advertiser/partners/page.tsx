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
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Partner {
  id: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  tier: 'authorized' | 'silver' | 'gold' | 'platinum'
  referral_code: string
  channels: string[] | null
  main_channel_link: string | null
  created_at: string
  monthly_lead_count: number
  monthly_contract_count: number
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

export default function AdvertiserPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [advertiserUuid, setAdvertiserUuid] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    fetchPartners()
    // 광고주 UUID 조회 (파트너 초대 링크용)
    fetch('/api/auth/advertiser/me')
      .then(r => r.json())
      .then(d => { if (d.advertiser?.id) setAdvertiserUuid(d.advertiser.id) })
      .catch(() => {})
  }, [])

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

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.channels || []).some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
    if (!advertiserUuid) return
    // 파트너는 마켓플레이스에서 advertiserUuid로 검색하거나, 직접 프로그램 상세 페이지로 이동
    const link = `${window.location.origin}/dashboard/programs/${advertiserUuid}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedInvite(true)
      toast.success('파트너 초대 링크가 복사되었습니다')
      setTimeout(() => setCopiedInvite(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">파트너 관리</h1>
          <p className="text-slate-500 mt-1">파트너 목록 및 승인 관리</p>
        </div>
        {advertiserUuid && (
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
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            전체
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            대기
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('approved')}
          >
            승인
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('rejected')}
          >
            거절
          </Button>
        </div>
      </div>

      {/* Partners Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">순위</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>채널</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>티어</TableHead>
              <TableHead className="text-center">이번 달 리드</TableHead>
              <TableHead className="text-center">이번 달 계약</TableHead>
              <TableHead>추천 코드</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                  {partners.length === 0 ? '등록된 파트너가 없습니다' : '검색 결과가 없습니다'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPartners.map((partner) => {
                const approvedPartners = filteredPartners.filter(p => p.status === 'approved')
                const rank = partner.status === 'approved'
                  ? approvedPartners.findIndex(p => p.id === partner.id) + 1
                  : null

                return (
                <TableRow key={partner.id}>
                  <TableCell className="text-center">
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `${rank}위` : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>
                    {partner.channels && partner.channels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {partner.channels.slice(0, 2).map((ch, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{ch}</Badge>
                        ))}
                        {partner.channels.length > 2 && (
                          <span className="text-xs text-slate-400">+{partner.channels.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
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
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                      {partner.referral_code}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    {partner.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(partner.id, 'approved')}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(partner.id, 'rejected')}
                        >
                          거절
                        </Button>
                      </div>
                    )}
                    {partner.status === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(partner.id, 'approved')}
                      >
                        재승인
                      </Button>
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
  )
}
