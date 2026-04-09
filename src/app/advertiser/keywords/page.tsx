'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Star, Trash2, Search, Upload, Download, Target, X, Plus } from 'lucide-react'

interface Program {
  id: string        // partner_programs.id (used as keyword program_id)
  program_id: string | null
  name: string
}

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

function formatVolume(n: number | null): string {
  if (n === null) return '-'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  return n.toLocaleString()
}

// Download CSV helper
function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdvertiserKeywordsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [featuredCount, setFeaturedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'featured' | 'volume' | 'abc'>('featured')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Tag input state
  const [tagInput, setTagInput] = useState('')
  const [addingTags, setAddingTags] = useState(false)

  // CSV upload state
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)

  // Inline memo edit
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoDraft, setMemoDraft] = useState('')

  // Bulk delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load programs on mount
  useEffect(() => {
    fetchPrograms()
  }, [])

  // Load keywords when program or sort changes
  useEffect(() => {
    if (!selectedProgramId) return
    fetchKeywords(true)
  }, [selectedProgramId, sort])

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/advertiser/partner-programs')
      if (!res.ok) return
      const data = await res.json()
      const list: Program[] = (data.programs ?? []).map((p: { id: string; program_id: string | null; name: string }) => ({
        id: p.id,
        program_id: p.program_id,
        name: p.name,
      }))
      setPrograms(list)
      if (list.length > 0) setSelectedProgramId(list[0].id)
    } catch { /* ignore */ }
  }

  const fetchKeywords = async (reset: boolean, cursorOverride?: string | null, searchOverride?: string) => {
    if (!selectedProgramId) return
    if (reset) setLoading(true)
    else setLoadingMore(true)

    const cursor = reset ? null : (cursorOverride ?? nextCursor)
    const q = searchOverride !== undefined ? searchOverride : search

    try {
      const params = new URLSearchParams({
        program_id: selectedProgramId,
        limit: '50',
        sort,
        ...(cursor ? { cursor } : {}),
        ...(q ? { search: q } : {}),
      })
      const res = await fetch(`/api/advertiser/keywords?${params}`)
      if (!res.ok) return
      const data = await res.json()
      const rows: Keyword[] = data.keywords ?? []
      if (reset) {
        setKeywords(rows)
        // Recalculate featured count from full count query
        const featured = rows.filter((k: Keyword) => k.is_featured).length
        setFeaturedCount(featured)
      } else {
        setKeywords(prev => {
          const merged = [...prev, ...rows]
          setFeaturedCount(merged.filter(k => k.is_featured).length)
          return merged
        })
      }
      setNextCursor(data.nextCursor ?? null)
      setTotal(data.total ?? 0)
    } catch { /* ignore */ }

    if (reset) setLoading(false)
    else setLoadingMore(false)
  }

  // Debounced search
  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      fetchKeywords(true, null, value)
    }, 400)
  }

  // Infinite scroll
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

  // Toggle featured
  const toggleFeatured = async (id: string, current: boolean) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, is_featured: !current } : k))
    try {
      const res = await fetch(`/api/advertiser/keywords/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !current }),
      })
      if (!res.ok) {
        setKeywords(prev => prev.map(k => k.id === id ? { ...k, is_featured: current } : k))
        toast.error('변경에 실패했습니다')
      } else {
        setFeaturedCount(prev => !current ? prev + 1 : prev - 1)
      }
    } catch {
      setKeywords(prev => prev.map(k => k.id === id ? { ...k, is_featured: current } : k))
      toast.error('서버 오류가 발생했습니다')
    }
  }

  // Toggle memo_public
  const toggleMemoPublic = async (id: string, current: boolean) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, memo_public: !current } : k))
    try {
      const res = await fetch(`/api/advertiser/keywords/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo_public: !current }),
      })
      if (!res.ok) {
        setKeywords(prev => prev.map(k => k.id === id ? { ...k, memo_public: current } : k))
        toast.error('변경에 실패했습니다')
      }
    } catch {
      setKeywords(prev => prev.map(k => k.id === id ? { ...k, memo_public: current } : k))
      toast.error('서버 오류가 발생했습니다')
    }
  }

  // Memo save on blur
  const saveMemo = async (id: string) => {
    const kw = keywords.find(k => k.id === id)
    if (!kw || kw.memo === memoDraft) { setEditingMemoId(null); return }
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, memo: memoDraft } : k))
    setEditingMemoId(null)
    try {
      const res = await fetch(`/api/advertiser/keywords/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoDraft }),
      })
      if (!res.ok) {
        setKeywords(prev => prev.map(k => k.id === id ? { ...k, memo: kw.memo } : k))
        toast.error('메모 저장에 실패했습니다')
      }
    } catch {
      setKeywords(prev => prev.map(k => k.id === id ? { ...k, memo: kw.memo } : k))
      toast.error('서버 오류가 발생했습니다')
    }
  }

  // Add tags via Enter or comma
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const kws = tagInput.split(',').map(s => s.trim()).filter(Boolean)
      if (kws.length > 0) addKeywords(kws)
    }
  }

  const addKeywords = async (kwList: string[]) => {
    if (!selectedProgramId || kwList.length === 0) return
    setAddingTags(true)
    try {
      const res = await fetch('/api/advertiser/keywords/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: selectedProgramId,
          keywords: kwList,
          mode: 'append',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.inserted}개 추가됨${data.skipped > 0 ? ` (${data.skipped}개 중복 건너뜀)` : ''}`)
        setTagInput('')
        fetchKeywords(true)
      } else {
        toast.error(data.error || '추가에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
    setAddingTags(false)
  }

  // CSV upload
  const handleFileUpload = async (file: File) => {
    if (!selectedProgramId) return
    setUploading(true)
    setUploadProgress('파일 분석 중...')

    try {
      const csvText = await file.text()
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
      })

      const rows = parsed.data.map(row => ({
        keyword: row.keyword?.trim() ?? '',
        is_featured: row.is_featured === 'true' || row.is_featured === '1',
        memo: row.memo?.trim() || null,
        memo_public: row.memo_public === 'true' || row.memo_public === '1',
        display_order: parseInt(row.display_order ?? '0', 10) || 0,
      })).filter(r => r.keyword)

      if (rows.length === 0) {
        toast.error('유효한 키워드가 없습니다')
        setUploading(false)
        setUploadProgress('')
        return
      }

      const BATCH = 1000
      let totalInserted = 0
      let totalSkipped = 0
      const batchCount = Math.ceil(rows.length / BATCH)

      for (let i = 0; i < rows.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1
        setUploadProgress(`${batchNum}/${batchCount} 배치 처리 중...`)
        const batch = rows.slice(i, i + BATCH)

        const res = await fetch('/api/advertiser/keywords/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            program_id: selectedProgramId,
            keywords: batch,
            mode: i === 0 ? uploadMode : 'append',
          }),
        })
        const data = await res.json()
        if (res.ok) {
          totalInserted += data.inserted ?? 0
          totalSkipped += data.skipped ?? 0
        }
      }

      toast.success(`${totalInserted}개 추가됨${totalSkipped > 0 ? ` (${totalSkipped}개 중복 건너뜀)` : ''}`)
      fetchKeywords(true)
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다')
    }

    setUploading(false)
    setUploadProgress('')
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!selectedProgramId || selectedIds.size === 0) return
    try {
      const res = await fetch('/api/advertiser/keywords/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: selectedProgramId,
          keyword_ids: Array.from(selectedIds),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.deleted}개 삭제됨`)
        setSelectedIds(new Set())
        setShowDeleteConfirm(false)
        fetchKeywords(true)
      } else {
        toast.error(data.error || '삭제에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    }
  }

  // Template download
  const downloadTemplate = () => {
    const content = 'keyword,is_featured,memo,memo_public\n네이버 블로그 마케팅,true,네이버 광고 관련 키워드,true'
    downloadCsv(content, 'keyword-template.csv')
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === keywords.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(keywords.map(k => k.id)))
    }
  }

  if (programs.length === 0 && !loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="py-20">
          <CardContent className="text-center text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium">등록된 파트너 프로그램이 없습니다</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">키워드 관리</h1>
          <p className="text-sm text-slate-500 mt-1">파트너에게 제공할 포스팅 키워드를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>개
          <span className="text-slate-400">·</span>
          <span className="text-amber-600 font-semibold">{featuredCount}</span>개 추천
        </div>
      </div>

      {/* Program selector */}
      {programs.length > 1 && (
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="프로그램 선택" />
          </SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Tag input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">키워드 직접 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="키워드 입력 후 Enter 또는 쉼표로 추가"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagInput}
              disabled={addingTags || !selectedProgramId}
            />
            <Button
              size="sm"
              disabled={!tagInput.trim() || addingTags || !selectedProgramId}
              onClick={() => {
                const kws = tagInput.split(',').map(s => s.trim()).filter(Boolean)
                if (kws.length > 0) addKeywords(kws)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </div>
          <p className="text-xs text-slate-400">여러 개는 쉼표로 구분하거나 Enter를 누르세요</p>
        </CardContent>
      </Card>

      {/* CSV upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">CSV 대량 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode selection */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="uploadMode"
                value="append"
                checked={uploadMode === 'append'}
                onChange={() => setUploadMode('append')}
                className="accent-indigo-600"
              />
              <span>추가 모드 (기존 유지)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="uploadMode"
                value="replace"
                checked={uploadMode === 'replace'}
                onChange={() => setUploadMode('replace')}
                className="accent-indigo-600"
              />
              <span>교체 모드 (기존 삭제 후 교체)</span>
            </label>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
            } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFileUpload(file)
            }}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            {uploading ? (
              <p className="text-sm text-indigo-600 font-medium">{uploadProgress}</p>
            ) : (
              <>
                <p className="text-sm text-slate-600">CSV 파일을 드래그하거나 클릭해서 업로드</p>
                <p className="text-xs text-slate-400 mt-1">헤더: keyword, is_featured, memo, memo_public</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
          />

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              템플릿 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyword list */}
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="키워드 검색..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={v => setSort(v as 'featured' | 'volume' | 'abc')}>
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">추천순</SelectItem>
              <SelectItem value="volume">검색량순</SelectItem>
              <SelectItem value="abc">가나다순</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {selectedIds.size}개 삭제
            </Button>
          )}
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
              {search ? '검색 결과가 없습니다' : '등록된 키워드가 없습니다'}
            </p>
            {!search && (
              <p className="text-sm mt-1">위에서 키워드를 입력하거나 CSV를 업로드하세요.</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 pl-3 pr-1 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === keywords.length && keywords.length > 0}
                      onChange={toggleSelectAll}
                      className="accent-indigo-600"
                    />
                  </th>
                  <th className="py-2.5 px-1 w-7" />
                  <th className="py-2.5 pl-1 pr-2 text-xs font-medium text-slate-500">키워드 / 메모</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-right">총 검색량</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-right hidden md:table-cell">PC</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-right hidden md:table-cell">모바일</th>
                  <th className="py-2.5 px-2 text-xs font-medium text-slate-500 text-center hidden sm:table-cell">경쟁도</th>
                  <th className="py-2.5 pl-2 pr-3 w-6" />
                </tr>
              </thead>
              <tbody>
                {keywords.map(kw => {
                  const compCfg = kw.naver_competition ? COMPETITION_CONFIG[kw.naver_competition] : null
                  const totalVol = kw.naver_cached_at
                    ? (kw.naver_pc_volume ?? 0) + (kw.naver_mobile_volume ?? 0)
                    : null
                  const isEditing = editingMemoId === kw.id
                  const isSelected = selectedIds.has(kw.id)

                  return (
                    <tr
                      key={kw.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 pl-3 pr-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(kw.id)}
                          className="accent-indigo-600"
                        />
                      </td>

                      {/* Featured star */}
                      <td className="py-2.5 px-1">
                        <button
                          onClick={() => toggleFeatured(kw.id, kw.is_featured)}
                          className={`transition-colors ${kw.is_featured ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
                          title={kw.is_featured ? '추천 해제' : '추천으로 설정'}
                        >
                          <Star className="w-3.5 h-3.5" fill={kw.is_featured ? 'currentColor' : 'none'} />
                        </button>
                      </td>

                      {/* Keyword + memo */}
                      <td className="py-2.5 pl-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-900">{kw.keyword}</span>
                          {kw.is_featured && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">추천</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isEditing ? (
                            <input
                              autoFocus
                              className="text-xs border border-slate-300 rounded px-2 py-0.5 w-48 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              value={memoDraft}
                              onChange={e => setMemoDraft(e.target.value)}
                              onBlur={() => saveMemo(kw.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveMemo(kw.id)
                                if (e.key === 'Escape') setEditingMemoId(null)
                              }}
                              placeholder="메모 입력..."
                            />
                          ) : (
                            <button
                              className="text-xs text-slate-400 hover:text-slate-600 transition-colors text-left truncate max-w-[180px]"
                              onClick={() => { setEditingMemoId(kw.id); setMemoDraft(kw.memo ?? '') }}
                            >
                              {kw.memo || '메모 추가...'}
                            </button>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400">공개</span>
                            <Switch
                              checked={kw.memo_public}
                              onCheckedChange={() => toggleMemoPublic(kw.id, kw.memo_public)}
                              className="scale-[0.65] origin-left"
                            />
                          </div>
                        </div>
                      </td>

                      {/* 총 검색량 */}
                      <td className="py-2.5 px-2 text-right">
                        {kw.naver_cached_at ? (
                          <span className="text-sm font-semibold text-indigo-600">{formatVolume(totalVol)}</span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>

                      {/* PC */}
                      <td className="py-2.5 px-2 text-right hidden md:table-cell">
                        <span className="text-xs text-slate-500">{kw.naver_cached_at ? formatVolume(kw.naver_pc_volume) : '-'}</span>
                      </td>

                      {/* 모바일 */}
                      <td className="py-2.5 px-2 text-right hidden md:table-cell">
                        <span className="text-xs text-slate-500">{kw.naver_cached_at ? formatVolume(kw.naver_mobile_volume) : '-'}</span>
                      </td>

                      {/* 경쟁도 */}
                      <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                        {compCfg ? (
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${compCfg.color}`}>
                            {compCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 pl-2 pr-3">
                        <button
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/advertiser/keywords/${kw.id}`, { method: 'DELETE' })
                              if (res.ok) {
                                setKeywords(prev => prev.filter(k => k.id !== kw.id))
                                setTotal(prev => prev - 1)
                                if (kw.is_featured) setFeaturedCount(prev => prev - 1)
                                toast.success('삭제되었습니다')
                              } else {
                                toast.error('삭제에 실패했습니다')
                              }
                            } catch {
                              toast.error('서버 오류가 발생했습니다')
                            }
                          }}
                          title="삭제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
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

      {/* Bulk delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>키워드 삭제</DialogTitle>
            <DialogDescription>
              선택한 <strong>{selectedIds.size}개</strong> 키워드를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>삭제</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
