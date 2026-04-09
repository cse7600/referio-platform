'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProgram } from '../ProgramContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Target, Search, MessageSquare, Download } from 'lucide-react'

interface Keyword {
  id: string
  keyword: string
  is_featured: boolean
  memo: string | null
  memo_public: boolean
  naver_pc_volume: number | null
  naver_mobile_volume: number | null
  naver_competition: string | null
  naver_cached_at: string | null
  display_order: number
}

const COMPETITION_CONFIG: Record<string, { label: string; color: string }> = {
  '낮음': { label: '낮음', color: 'bg-green-100 text-green-700' },
  '중간': { label: '중간', color: 'bg-yellow-100 text-yellow-700' },
  '높음': { label: '높음', color: 'bg-red-100 text-red-700' },
}

function getHint(competition: string | null, cachedAt: string | null): string | null {
  if (!cachedAt) return null
  if (competition === '낮음') return '광고주 추천! 검색량 높고 경쟁 적은 키워드예요.'
  if (competition === '중간') return '꾸준히 쓰면 효과 있는 키워드예요.'
  if (competition === '높음') return '경쟁이 치열해요. 롱테일 키워드로 차별화하세요.'
  return null
}

function formatVolume(n: number | null): string {
  if (n === null) return '-'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  return n.toLocaleString()
}

function KeywordCard({ kw, featured = false }: { kw: Keyword; featured?: boolean }) {
  const compCfg = kw.naver_competition ? COMPETITION_CONFIG[kw.naver_competition] : null
  const totalVolume =
    kw.naver_cached_at
      ? (kw.naver_pc_volume ?? 0) + (kw.naver_mobile_volume ?? 0)
      : null
  const hint = featured ? getHint(kw.naver_competition, kw.naver_cached_at) : null

  return (
    <Card className="flex-shrink-0 w-52 snap-start">
      <CardContent className="p-4 space-y-2">
        {featured && (
          <Badge className="text-xs bg-amber-100 text-amber-700">추천</Badge>
        )}
        <p className="font-semibold text-slate-900 text-[15px] leading-snug break-all">{kw.keyword}</p>

        {kw.naver_cached_at ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-bold text-indigo-600">{formatVolume(totalVolume)}</span>
              {compCfg && (
                <Badge className={`text-xs ${compCfg.color}`}>{compCfg.label}</Badge>
              )}
            </div>
            <div className="text-xs text-slate-400 space-y-0.5">
              <div>PC {formatVolume(kw.naver_pc_volume)}</div>
              <div>모바일 {formatVolume(kw.naver_mobile_volume)}</div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">검색량 준비 중</p>
        )}

        {kw.memo_public && kw.memo && (
          <div className="flex items-start gap-1.5 bg-slate-50 rounded-lg p-2">
            <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-snug">{kw.memo}</p>
          </div>
        )}

        {hint && (
          <p className="text-xs text-slate-500 leading-snug border-t pt-2">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}

function KeywordTableRow({ kw }: { kw: Keyword }) {
  const compCfg = kw.naver_competition ? COMPETITION_CONFIG[kw.naver_competition] : null
  const totalVolume = kw.naver_cached_at
    ? (kw.naver_pc_volume ?? 0) + (kw.naver_mobile_volume ?? 0)
    : null

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* 키워드 */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2">
          {kw.is_featured && (
            <span className="text-amber-400 text-xs">⭐</span>
          )}
          <span className="text-sm font-medium text-slate-900">{kw.keyword}</span>
          {kw.memo_public && kw.memo && (
            <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-[120px]" title={kw.memo}>
              · {kw.memo}
            </span>
          )}
        </div>
      </td>
      {/* 총 검색량 */}
      <td className="py-3 px-2 text-right">
        {kw.naver_cached_at ? (
          <span className="text-sm font-semibold text-indigo-600">{formatVolume(totalVolume)}</span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        )}
      </td>
      {/* PC */}
      <td className="py-3 px-2 text-right hidden sm:table-cell">
        <span className="text-xs text-slate-500">{kw.naver_cached_at ? formatVolume(kw.naver_pc_volume) : '-'}</span>
      </td>
      {/* 모바일 */}
      <td className="py-3 px-2 text-right hidden sm:table-cell">
        <span className="text-xs text-slate-500">{kw.naver_cached_at ? formatVolume(kw.naver_mobile_volume) : '-'}</span>
      </td>
      {/* 경쟁도 */}
      <td className="py-3 pl-2 pr-4 text-center">
        {compCfg ? (
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${compCfg.color}`}>
            {compCfg.label}
          </span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        )}
      </td>
    </tr>
  )
}

export default function KeywordsPage() {
  const { programs, selectedProgram, selectProgram, loading: programLoading } = useProgram()
  const router = useRouter()

  const [featuredKeywords, setFeaturedKeywords] = useState<Keyword[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'featured' | 'volume' | 'abc'>('featured')

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const approvedPrograms = programs.filter(p => p.status === 'approved')
  const activeProgramId = selectedProgram?.id ?? approvedPrograms[0]?.id ?? null

  // Check auth
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    check()
  }, [router])

  // Fetch featured keywords whenever program changes
  useEffect(() => {
    if (programLoading || !activeProgramId) return
    fetchFeatured()
  }, [activeProgramId, programLoading])

  // Fetch all keywords (reset) whenever program/sort changes
  useEffect(() => {
    if (programLoading || !activeProgramId) return
    fetchKeywords(true)
  }, [activeProgramId, sort, programLoading])

  const fetchFeatured = async () => {
    if (!activeProgramId) return
    try {
      const res = await fetch(
        `/api/partner/keywords?program_id=${activeProgramId}&featured_only=1&limit=10`
      )
      if (!res.ok) return
      const data = await res.json()
      setFeaturedKeywords(data.keywords ?? [])
    } catch { /* ignore */ }
  }

  const fetchKeywords = async (reset: boolean, cursorOverride?: string | null, searchOverride?: string) => {
    if (!activeProgramId) return
    if (reset) setLoading(true)
    else setLoadingMore(true)

    const cursor = reset ? null : (cursorOverride ?? nextCursor)
    const q = searchOverride !== undefined ? searchOverride : search

    try {
      const params = new URLSearchParams({
        program_id: activeProgramId,
        limit: '50',
        sort,
        ...(cursor ? { cursor } : {}),
        ...(q ? { search: q } : {}),
      })
      const res = await fetch(`/api/partner/keywords?${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (reset) {
        setKeywords(data.keywords ?? [])
      } else {
        setKeywords(prev => [...prev, ...(data.keywords ?? [])])
      }
      setNextCursor(data.nextCursor ?? null)
      setTotal(data.total ?? 0)
    } catch { /* ignore */ }

    if (reset) setLoading(false)
    else setLoadingMore(false)
  }

  // CSV download — fetches all pages then triggers browser download
  const handleDownload = async () => {
    if (!activeProgramId || downloading) return
    setDownloading(true)

    const allKeywords: Keyword[] = []
    let cursor: string | null = null

    try {
      while (true) {
        const qp: Record<string, string> = {
          program_id: activeProgramId,
          limit: '100',
          sort,
        }
        if (cursor) qp.cursor = cursor
        if (search) qp.search = search
        const params = new URLSearchParams(qp)
        const res = await fetch(`/api/partner/keywords?${params}`)
        if (!res.ok) break
        const data = await res.json()
        allKeywords.push(...(data.keywords ?? []))
        if (!data.has_more || !data.next_cursor) break
        cursor = data.next_cursor
      }

      // Build CSV rows
      const headers = ['키워드', '추천', '마케터메모', '총검색량', 'PC검색량', '모바일검색량', '경쟁도']
      const rows = allKeywords.map(kw => {
        const total = kw.naver_cached_at
          ? (kw.naver_pc_volume ?? 0) + (kw.naver_mobile_volume ?? 0)
          : ''
        return [
          kw.keyword,
          kw.is_featured ? 'O' : '',
          kw.memo_public && kw.memo ? kw.memo : '',
          total,
          kw.naver_cached_at ? (kw.naver_pc_volume ?? '') : '',
          kw.naver_cached_at ? (kw.naver_mobile_volume ?? '') : '',
          kw.naver_competition ?? '',
        ]
      })

      const csvContent = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `keywords_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }

    setDownloading(false)
  }

  // Debounced search
  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      fetchKeywords(true, null, value)
    }, 400)
  }

  // IntersectionObserver for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && nextCursor && !loadingMore) {
        fetchKeywords(false)
      }
    },
    [nextCursor, loadingMore]
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  if (programLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (approvedPrograms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="py-20">
          <CardContent className="text-center text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium">승인된 파트너 프로그램이 없습니다</p>
            <p className="text-sm mt-1">프로그램에 가입하면 키워드를 확인할 수 있어요.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">키워드</h1>
        <p className="text-sm text-slate-500 mt-1">
          광고주가 추천하는 포스팅 키워드와 네이버 검색량을 확인하세요
        </p>
      </div>

      {/* Program selector */}
      {approvedPrograms.length > 1 && (
        <Select
          value={activeProgramId ?? ''}
          onValueChange={selectProgram}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="프로그램 선택" />
          </SelectTrigger>
          <SelectContent>
            {approvedPrograms.map(p => {
              const adv = p.advertisers as unknown as { company_name: string; program_name: string | null }
              return (
                <SelectItem key={p.id} value={p.id}>
                  {adv.program_name || adv.company_name}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}

      {/* Section 1: Featured keywords */}
      {featuredKeywords.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">오늘의 추천 키워드</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {featuredKeywords.map(kw => (
              <KeywordCard key={kw.id} kw={kw} featured />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: All keywords */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800">
            전체 키워드
            {total > 0 && <span className="text-sm font-normal text-slate-500 ml-2">{total.toLocaleString()}개</span>}
          </h2>
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={v => setSort(v as 'featured' | 'volume' | 'abc')}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">추천순</SelectItem>
                <SelectItem value="volume">검색량순</SelectItem>
                <SelectItem value="abc">가나다순</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleDownload}
              disabled={downloading || keywords.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? '준비 중...' : 'CSV'}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="키워드 검색..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Keyword table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse h-10 bg-slate-100 rounded" />
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-slate-100 rounded-xl">
            <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">
              {search ? '검색 결과가 없습니다' : '아직 등록된 키워드가 없어요'}
            </p>
            {!search && (
              <p className="text-sm mt-1">광고주가 키워드를 등록하면 여기에 표시됩니다.</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 pl-4 pr-2 text-xs font-medium text-slate-500">키워드</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-right">총 검색량</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-right hidden sm:table-cell">PC</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-right hidden sm:table-cell">모바일</th>
                  <th className="py-2.5 pl-2 pr-4 text-xs font-medium text-slate-500 text-center">경쟁도</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map(kw => (
                  <KeywordTableRow key={kw.id} kw={kw} />
                ))}
              </tbody>
            </table>
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="text-center py-3 text-sm text-slate-400">불러오는 중...</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
