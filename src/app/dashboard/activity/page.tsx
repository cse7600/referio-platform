'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Megaphone, LayoutList, Mail, Building } from 'lucide-react'
import dynamic from 'next/dynamic'

const TiptapViewer = dynamic(
  () => import('@/components/editor/TiptapViewer'),
  { ssr: false }
)

interface Advertiser {
  id: string
  company_name: string
  program_name: string | null
}

interface Program {
  id: string
  advertiser_id: string
  status: string
  advertisers: Advertiser
}

interface FeedItem {
  id: string
  type: 'message' | 'post'
  post_type?: 'announcement' | 'board'
  title: string
  body?: string
  content?: string
  is_read?: boolean
  created_at: string
}

export default function PartnerActivityPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [feedLoading, setFeedLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch approved programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch('/api/partner/programs')
        if (res.ok) {
          const data = await res.json()
          const allPrograms = data.programs || []
          // Only show programs where partner is enrolled and approved
          const approved = allPrograms
            .filter((p: { enrollment?: { status: string } }) =>
              p.enrollment?.status === 'approved'
            )
            .map((p: { id: string; enrollment: { id: string; advertiser_id: string; status: string }; company_name: string; program_name: string | null }) => ({
              id: p.enrollment.id,
              advertiser_id: p.id,
              status: p.enrollment.status,
              advertisers: {
                id: p.id,
                company_name: p.company_name,
                program_name: p.program_name,
              },
            }))

          setPrograms(approved)

          // Auto-select first
          if (approved.length > 0) {
            setSelectedAdvertiserId(approved[0].advertiser_id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch programs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPrograms()
  }, [])

  // Fetch feed when advertiser changes
  const fetchFeed = useCallback(async (advId: string) => {
    setFeedLoading(true)
    setExpandedId(null)
    try {
      const res = await fetch(`/api/partner/activity?advertiser_id=${advId}`)
      if (res.ok) {
        const data = await res.json()
        setFeed(data.feed || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch activity feed:', error)
    } finally {
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAdvertiserId) {
      fetchFeed(selectedAdvertiserId)
    }
  }, [selectedAdvertiserId, fetchFeed])

  const handleExpand = async (item: FeedItem) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(item.id)

    // Mark message as read
    if (item.type === 'message' && !item.is_read) {
      try {
        await fetch('/api/partner/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: item.id }),
        })
        setFeed(prev =>
          prev.map(f => f.id === item.id ? { ...f, is_read: true } : f)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch {
        // silent
      }
    }
  }

  const getItemIcon = (item: FeedItem) => {
    if (item.type === 'message') return <Mail className="w-4 h-4 text-indigo-500" />
    if (item.post_type === 'announcement') return <Megaphone className="w-4 h-4 text-amber-500" />
    return <LayoutList className="w-4 h-4 text-emerald-500" />
  }

  const getItemLabel = (item: FeedItem) => {
    if (item.type === 'message') return '공지'
    if (item.post_type === 'announcement') return '공지사항'
    return '게시판'
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    })

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">활동 지원</h1>
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    )
  }

  // No approved programs
  if (programs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">활동 지원</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">참여 중인 프로그램이 없습니다</p>
            <p className="text-sm text-slate-400 mt-1">프로그램에 참가 신청 후 승인되면 활동 지원 정보를 볼 수 있습니다</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">활동 지원</h1>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount}개 안읽음</Badge>
          )}
        </div>
      </div>

      {/* Advertiser selector */}
      <div className="mb-6">
        <Select
          value={selectedAdvertiserId || ''}
          onValueChange={setSelectedAdvertiserId}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="광고주 선택" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.advertiser_id} value={p.advertiser_id}>
                {p.advertisers.program_name || p.advertisers.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      {feedLoading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : feed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">아직 등록된 활동 지원 정보가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => {
            const isExpanded = expandedId === item.id
            const isUnread = item.type === 'message' && !item.is_read

            return (
              <Card
                key={`${item.type}-${item.id}`}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  isUnread ? 'border-l-4 border-l-indigo-500' : ''
                }`}
                onClick={() => handleExpand(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getItemIcon(item)}
                        <span className="text-xs text-slate-500 font-medium">
                          {getItemLabel(item)}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                        )}
                      </div>
                      <h3 className={`font-semibold truncate ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>
                        {item.title}
                      </h3>
                      {!isExpanded && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {item.body || tryExtractPlainText(item.content || '')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      {item.type === 'message' ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {item.body}
                        </p>
                      ) : (
                        <TiptapViewer content={item.content || ''} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Extract plain text from Tiptap JSON for preview
function tryExtractPlainText(content: string): string {
  try {
    const json = JSON.parse(content)
    const texts: string[] = []
    const walk = (node: { text?: string; content?: unknown[] }) => {
      if (node.text) texts.push(node.text)
      if (node.content) (node.content as typeof node[]).forEach(walk)
    }
    walk(json)
    return texts.join(' ').slice(0, 100)
  } catch {
    return content.slice(0, 100)
  }
}
