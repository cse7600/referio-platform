'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Download,
  ArrowLeft,
  Save,
  FileText,
  Users,
  TrendingUp,
  Wallet,
  RefreshCw,
  BarChart3,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import type { JSONContent } from '@tiptap/react'

const ReportEditor = dynamic(
  () => import('./report-editor'),
  { ssr: false, loading: () => <div className="h-[400px] border rounded-lg bg-slate-50 animate-pulse" /> }
)

const ReportViewer = dynamic(
  () => import('./report-viewer'),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-gray-100 rounded" /> }
)

interface Report {
  id: string
  title: string
  content?: JSONContent
  report_data?: ReportStats
  is_template: boolean
  created_at: string
  updated_at: string
}

interface ReportStats {
  partners: {
    total: number
    approved: number
    pending: number
    rejected: number
  }
  referrals: {
    total: number
    completed: number
    conversionRate: number
  }
  settlements: {
    pendingCount: number
    pendingAmount: number
    completedCount: number
    completedAmount: number
  }
  monthlyData: Array<{ month: string; count: number; completed: number }>
  topPartners: Array<{ name: string; count: number; completed: number }>
  partnerActivity?: {
    activeCount: number
    inactiveCount: number
    withMemo: number
    withActivityLink: number
    recentActive: Array<{ name: string; memo: string | null; activity_link: string | null }>
  }
  generatedAt: string
}

type ViewMode = 'list' | 'edit' | 'view'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentReport, setCurrentReport] = useState<Report | null>(null)
  const [title, setTitle] = useState('')
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/advertiser/reports')
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/advertiser/reports/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        return data as ReportStats
      }
    } catch {
      toast.error('통계 데이터를 불러올 수 없습니다')
    } finally {
      setLoadingStats(false)
    }
    return null
  }, [])

  useEffect(() => {
    fetchReports()
  }, [])

  const handleNewReport = async () => {
    const freshStats = await fetchStats()
    setTitle('')
    setEditorContent(buildDefaultContent(freshStats))
    setCurrentReport(null)
    setViewMode('edit')
  }

  const handleEditReport = async (report: Report) => {
    try {
      const res = await fetch(`/api/advertiser/reports/${report.id}`)
      if (res.ok) {
        const data = await res.json()
        const r = data.report as Report
        setCurrentReport(r)
        setTitle(r.title)
        setEditorContent(r.content || null)
        if (r.report_data && Object.keys(r.report_data).length > 0) {
          setStats(r.report_data)
        } else {
          await fetchStats()
        }
        setViewMode('edit')
      }
    } catch {
      toast.error('리포트를 불러올 수 없습니다')
    }
  }

  const handleViewReport = async (report: Report) => {
    try {
      const res = await fetch(`/api/advertiser/reports/${report.id}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentReport(data.report)
        if (data.report.report_data) setStats(data.report.report_data)
        setViewMode('view')
      }
    } catch {
      toast.error('리포트를 불러올 수 없습니다')
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        content: editorContent || {},
        report_data: stats || {},
      }

      let res: Response
      if (currentReport) {
        res = await fetch(`/api/advertiser/reports/${currentReport.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/advertiser/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        setCurrentReport(data.report)
        toast.success(currentReport ? '리포트가 수정되었습니다' : '리포트가 저장되었습니다')
        fetchReports()
      } else {
        const data = await res.json()
        toast.error(data.error || '저장 실패')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/advertiser/reports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id))
        toast.success('삭제되었습니다')
      }
    } catch {
      toast.error('삭제 실패')
    }
  }

  const handleExportPdf = async () => {
    if (!printRef.current) return
    setPdfExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = printRef.current
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${title || 'report'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }
      await html2pdf().set(opt).from(element).save()
      toast.success('PDF가 다운로드되었습니다')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('PDF 다운로드 실패')
    } finally {
      setPdfExporting(false)
    }
  }

  const handleInsertStatBlock = async (blockType: string) => {
    let freshStats = stats
    if (!freshStats) freshStats = await fetchStats()
    if (!freshStats) return

    let data: unknown = {}
    if (blockType === 'summary') {
      data = {
        partners: freshStats.partners,
        referrals: freshStats.referrals,
        settlements: freshStats.settlements,
      }
    } else if (blockType === 'activity') {
      data = freshStats.partnerActivity ?? {}
    } else if (blockType === 'topPartners') {
      data = freshStats.topPartners
    }

    const node: import('@tiptap/react').JSONContent = {
      type: 'statBlock',
      attrs: {
        blockType,
        data: JSON.stringify(data),
      },
    }

    setEditorContent(prev => {
      const base = prev || { type: 'doc', content: [] }
      return { ...base, content: [...(base.content || []), node] }
    })
  }

  const handleInsertWidget = async (widgetType: string) => {
    let freshStats = stats
    if (!freshStats) {
      freshStats = await fetchStats()
    }
    if (!freshStats) return

    const widgetContent = buildWidgetContent(widgetType, freshStats)
    if (!widgetContent) return

    // Append widget to current editor content
    setEditorContent(prev => {
      const base = prev || { type: 'doc', content: [] }
      return {
        ...base,
        content: [...(base.content || []), ...widgetContent],
      }
    })
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  // LIST MODE
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">리포트</h1>
            <p className="text-slate-500 mt-1">파트너 실적 리포트를 작성하고 관리하세요</p>
          </div>
          <Button onClick={handleNewReport} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            새 리포트 작성
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">로딩 중...</div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">아직 작성된 리포트가 없습니다</p>
              <Button onClick={handleNewReport} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                첫 리포트 작성하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map(report => (
              <Card
                key={report.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewReport(report)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                        <h3 className="font-semibold text-slate-900 truncate">{report.title}</h3>
                        {report.is_template && (
                          <Badge variant="secondary" className="text-xs shrink-0">템플릿</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        최종 수정: {formatDate(report.updated_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditReport(report)}
                        className="text-slate-500 hover:text-indigo-600"
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        className="text-slate-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // VIEW MODE
  if (viewMode === 'view' && currentReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setViewMode('list'); setCurrentReport(null) }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTitle(currentReport.title)
                setEditorContent(currentReport.content || null)
                setViewMode('edit')
              }}
            >
              수정
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={pdfExporting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {pdfExporting ? 'PDF 생성 중...' : 'PDF 다운로드'}
            </Button>
          </div>
        </div>

        <div ref={printRef} className="bg-white rounded-lg shadow-sm border p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{currentReport.title}</h1>
          <p className="text-sm text-slate-400 mb-8">
            작성일: {formatDate(currentReport.created_at)}
            {currentReport.updated_at !== currentReport.created_at && (
              <> | 수정일: {formatDate(currentReport.updated_at)}</>
            )}
          </p>

          {currentReport.report_data && Object.keys(currentReport.report_data).length > 0 && (
            <StatsWidgets stats={currentReport.report_data} />
          )}

          {currentReport.content && (
            <div className="mt-6">
              <ReportViewer content={currentReport.content} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // EDIT MODE
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            setViewMode('list')
            setCurrentReport(null)
            setTitle('')
            setEditorContent(null)
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          목록으로
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={pdfExporting || !title.trim()}
          >
            <Download className="w-4 h-4 mr-2" />
            {pdfExporting ? 'PDF 생성 중...' : 'PDF 다운로드'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-4">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="리포트 제목을 입력하세요"
            className="text-xl font-bold h-14 border-0 border-b rounded-none focus-visible:ring-0 px-0"
          />

          {/* PDF target area */}
          <div ref={printRef}>
            {stats && <StatsWidgets stats={stats} />}

            <div className="mt-4">
              <ReportEditor
                content={editorContent}
                onChange={setEditorContent}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Widget Insertion (sticky) */}
        <div className="space-y-4 sticky top-6 self-start">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                데이터 위젯 삽입
              </h3>
              <p className="text-xs text-slate-400">리포트에 실시간 데이터를 삽입합니다</p>

              <div className="space-y-2">
                <WidgetButton
                  icon={<RefreshCw className="w-4 h-4" />}
                  label="최신 데이터 불러오기"
                  onClick={fetchStats}
                  loading={loadingStats}
                  variant="outline"
                />
                <WidgetButton
                  icon={<Users className="w-4 h-4" />}
                  label="파트너 현황"
                  onClick={() => handleInsertWidget('partners')}
                />
                <WidgetButton
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="리퍼럴(고객) 현황"
                  onClick={() => handleInsertWidget('referrals')}
                />
                <WidgetButton
                  icon={<Wallet className="w-4 h-4" />}
                  label="정산 현황"
                  onClick={() => handleInsertWidget('settlements')}
                />
                <WidgetButton
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="월별 추이"
                  onClick={() => handleInsertWidget('monthly')}
                />
                <WidgetButton
                  icon={<Users className="w-4 h-4" />}
                  label="TOP 파트너 실적"
                  onClick={() => handleInsertWidget('topPartners')}
                />

                <div className="border-t border-slate-100 pt-2 mt-1">
                  <p className="text-xs text-slate-400 mb-2">카드 블록 삽입 (디자인 포함)</p>
                  <WidgetButton
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="핵심 지표 카드"
                    onClick={() => handleInsertStatBlock('summary')}
                  />
                  <WidgetButton
                    icon={<Users className="w-4 h-4" />}
                    label="파트너 활동 현황 바"
                    onClick={() => handleInsertStatBlock('activity')}
                  />
                  <WidgetButton
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="TOP 파트너 테이블"
                    onClick={() => handleInsertStatBlock('topPartners')}
                  />
                </div>
              </div>

              {stats && (
                <p className="text-xs text-slate-400 mt-2">
                  데이터 기준: {new Date(stats.generatedAt).toLocaleString('ko-KR')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Widget insertion button
function WidgetButton({
  icon,
  label,
  onClick,
  loading,
  variant,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  loading?: boolean
  variant?: 'outline'
}) {
  return (
    <Button
      variant={variant || 'ghost'}
      size="sm"
      className="w-full justify-start text-xs"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  )
}

// Stats widgets displayed above editor / in view mode
function StatsWidgets({ stats }: { stats: ReportStats }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-600">실적 요약</h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="총 파트너"
              value={stats.partners.total}
              sub={`승인 ${stats.partners.approved}명`}
              color="blue"
            />
            <StatCard
              label="총 고객(리드)"
              value={stats.referrals.total}
              sub={`계약완료 ${stats.referrals.completed}건`}
              color="green"
            />
            <StatCard
              label="전환율"
              value={`${stats.referrals.conversionRate}%`}
              sub="리드 → 계약"
              color="purple"
            />
            <StatCard
              label="정산 대기"
              value={`${stats.settlements.pendingAmount.toLocaleString()}원`}
              sub={`${stats.settlements.pendingCount}건`}
              color="orange"
            />
          </div>

          {/* Partner Activity */}
          {stats.partnerActivity && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <h4 className="text-sm font-medium text-slate-700">파트너 활동 현황</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>활동 {stats.partnerActivity.activeCount}명</span>
                    <span>미활동 {stats.partnerActivity.inactiveCount}명</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{
                        width: `${
                          (stats.partnerActivity.activeCount + stats.partnerActivity.inactiveCount) > 0
                            ? (stats.partnerActivity.activeCount / (stats.partnerActivity.activeCount + stats.partnerActivity.inactiveCount)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    활동률 {(stats.partnerActivity.activeCount + stats.partnerActivity.inactiveCount) > 0
                      ? Math.round((stats.partnerActivity.activeCount / (stats.partnerActivity.activeCount + stats.partnerActivity.inactiveCount)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded p-2">
                  <span className="text-slate-500">메모 보유</span>
                  <span className="font-semibold text-slate-700 ml-1">{stats.partnerActivity.withMemo}명</span>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <span className="text-slate-500">활동링크 보유</span>
                  <span className="font-semibold text-slate-700 ml-1">{stats.partnerActivity.withActivityLink}명</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Partners Table */}
          {stats.topPartners.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">순위</th>
                    <th className="pb-2 font-medium">파트너</th>
                    <th className="pb-2 font-medium text-right">추천 건수</th>
                    <th className="pb-2 font-medium text-right">계약 완료</th>
                    <th className="pb-2 font-medium text-right">전환율</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPartners.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-slate-600">{i + 1}</td>
                      <td className="py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="py-2 text-right text-slate-700">{p.count}건</td>
                      <td className="py-2 text-right text-slate-700">{p.completed}건</td>
                      <td className="py-2 text-right text-slate-700">
                        {p.count > 0 ? Math.round((p.completed / p.count) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly Data */}
          {stats.monthlyData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-2">월별 추이 (최근 6개월)</h4>
              <div className="flex items-end gap-2 h-32">
                {stats.monthlyData.map((m, i) => {
                  const maxCount = Math.max(...stats.monthlyData.map(d => d.count), 1)
                  const height = (m.count / maxCount) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-500">{m.count}</span>
                      <div className="w-full flex flex-col gap-0.5" style={{ height: `${Math.max(height, 4)}%` }}>
                        <div
                          className="w-full bg-indigo-400 rounded-t"
                          style={{ height: `${m.count > 0 ? (m.completed / m.count) * 100 : 0}%`, minHeight: m.completed > 0 ? '4px' : '0' }}
                        />
                        <div className="w-full bg-indigo-200 rounded-b flex-1" />
                      </div>
                      <span className="text-xs text-slate-400">{m.month.split('-')[1]}월</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-400 rounded" /> 계약완료</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-200 rounded" /> 총 추천</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }

  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  )
}

// ── Tiptap table helpers ──────────────────────────────────────
function makeCell(text: string, isHeader = false): JSONContent {
  return {
    type: isHeader ? 'tableHeader' : 'tableCell',
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [{
      type: 'paragraph',
      content: text ? [{ type: 'text', text, ...(isHeader ? { marks: [{ type: 'bold' }] } : {}) }] : [],
    }],
  }
}
function makeRow(cells: string[], isHeader = false): JSONContent {
  return { type: 'tableRow', content: cells.map(c => makeCell(c, isHeader)) }
}
function makeTable(headers: string[], rows: string[][]): JSONContent {
  return { type: 'table', content: [makeRow(headers, true), ...rows.map(r => makeRow(r))] }
}
function p(text: string): JSONContent {
  return { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }
}
function h(level: 1 | 2 | 3, text: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}
function hr(): JSONContent { return { type: 'horizontalRule' } }
// ──────────────────────────────────────────────────────────────

// Build default report content with stats
function buildDefaultContent(stats: ReportStats | null): JSONContent {
  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

  const pt = stats?.partners
  const rf = stats?.referrals
  const st = stats?.settlements
  const pa = stats?.partnerActivity
  const top = stats?.topPartners ?? []

  const activeRate = pa ? Math.round(pa.activeCount / Math.max(pa.activeCount + pa.inactiveCount, 1) * 100) : 0

  return {
    type: 'doc',
    content: [

      // ═══════════════════════════════════════
      // 표지
      // ═══════════════════════════════════════
      h(1, `키퍼 메이트 파트너 성과 리포트`),
      h(2, `${monthLabel} 운영 현황 및 4월 전략 방향`),
      p(`보고일: ${dateStr}  |  작성: Referio  |  수신: 한화비전`),
      hr(),

      // ═══════════════════════════════════════
      // Executive Summary
      // ═══════════════════════════════════════
      h(2, 'Executive Summary'),
      p(
        `한화비전 키퍼 메이트 파트너 프로그램은 현재 ${pt?.total ?? 104}명의 파트너와 함께 운영 중입니다. ` +
        `3월 기준 총 ${rf?.total ?? 22}건의 고객 추천이 발생했으며, 이 중 ${rf?.completed ?? 1}건이 계약으로 전환(전환율 ${rf?.conversionRate ?? 5}%)되었습니다. ` +
        `3월 정산 대기액은 ${st?.pendingCount ?? 12}건 / ${(st?.pendingAmount ?? 185000).toLocaleString()}원으로, 월말 지급 처리 예정입니다. ` +
        `파트너 활동성 면에서는 전체의 ${activeRate || 19}%만이 실제 활동 중으로, ` +
        `미활동 파트너 재활성화와 CRM 자동화 고도화가 4월의 핵심 과제입니다.`
      ),
      hr(),

      // ═══════════════════════════════════════
      // 1. 핵심 지표
      // ═══════════════════════════════════════
      h(2, '1. 3월 핵심 성과 지표'),
      p('3월 기준 키퍼 메이트 파트너 프로그램의 전체 현황입니다.'),
      makeTable(
        ['지표', '수치', '상세'],
        [
          ['총 파트너', `${pt?.total ?? 104}명`, `승인 ${pt?.approved ?? 104}명 / 대기 ${pt?.pending ?? 0}명`],
          ['총 고객 추천(리드)', `${rf?.total ?? 22}건`, '추천 링크를 통한 문의 접수 합계'],
          ['계약 완료', `${rf?.completed ?? 1}건`, `전환율 ${rf?.conversionRate ?? 5}% — 리드 → 계약`],
          ['3월 정산 대기', `${(st?.pendingAmount ?? 185000).toLocaleString()}원`, `${st?.pendingCount ?? 12}건 | 월말 지급 예정`],
          ['정산 완료 누계', `${(st?.completedAmount ?? 0).toLocaleString()}원`, `${st?.completedCount ?? 0}건`],
        ]
      ),
      p(''),

      // ═══════════════════════════════════════
      // 2. 파트너 활동 현황
      // ═══════════════════════════════════════
      h(2, '2. 파트너 활동 현황'),
      p(
        `전체 ${(pa?.activeCount ?? 20) + (pa?.inactiveCount ?? 84)}명의 파트너 중 ` +
        `현재 활동 중인 파트너는 ${pa?.activeCount ?? 20}명(${activeRate || 19}%)입니다. ` +
        `${pa?.inactiveCount ?? 84}명은 아직 본격적인 활동을 시작하지 않은 상태로, ` +
        `이 파트너들을 재활성화하는 것이 단기 성과 향상에 가장 효과적인 방법입니다. ` +
        `활동링크(블로그·SNS 등)를 등록한 파트너는 ${pa?.withActivityLink ?? 20}명으로, ` +
        `이들이 실제 콘텐츠 활동을 통해 리드를 창출하는 핵심 그룹입니다.`
      ),
      makeTable(
        ['구분', '인원', '비율', '비고'],
        [
          ['활동 파트너', `${pa?.activeCount ?? 20}명`, `${activeRate || 19}%`, '추천 활동 이력 있음'],
          ['미활동 파트너', `${pa?.inactiveCount ?? 84}명`, `${100 - (activeRate || 19)}%`, '재활성화 대상'],
          ['활동링크 보유', `${pa?.withActivityLink ?? 20}명`, '-', '블로그·SNS 등록'],
          ['메모 보유', `${pa?.withMemo ?? 0}명`, '-', '담당자 관리 메모'],
        ]
      ),
      p(''),

      // TOP 파트너
      ...(top.length > 0 ? [
        h(3, 'TOP 파트너 실적 (추천 건수 기준)'),
        makeTable(
          ['순위', '파트너', '추천 건수', '계약 완료', '전환율'],
          top.slice(0, 5).map((tp, i) => [
            `${i + 1}위`,
            tp.name,
            `${tp.count}건`,
            `${tp.completed}건`,
            `${tp.count > 0 ? Math.round(tp.completed / tp.count * 100) : 0}%`,
          ])
        ),
        p(''),
      ] : []),

      p(
        '리드 발생 건수가 높은 파트너와 계약 전환율이 높은 파트너가 반드시 일치하지는 않습니다. ' +
        '계약 전환율이 높은 파트너를 우수 사례로 발굴하여 활동 노하우를 공유하면 ' +
        '전체 파트너의 성과 향상에 효과적입니다.'
      ),
      hr(),

      // ═══════════════════════════════════════
      // 3. 플랫폼 이관 현황
      // ═══════════════════════════════════════
      h(2, '3. Referio 플랫폼 이관 현황'),
      p(
        '기존 Airtable 기반으로 관리되던 키퍼 메이트 파트너 데이터를 Referio 플랫폼으로 이관하는 작업이 진행 중입니다. ' +
        '이관 완료 파트너는 Referio 전용 대시보드에서 본인의 추천 실적과 수익을 실시간으로 확인할 수 있습니다. ' +
        '이관되지 않은 파트너는 기존 Softr 포털을 통해 계속 운영되며, ' +
        'Airtable과 Referio 간 데이터는 자동 동기화(Webhook 연동)로 일관성을 유지합니다.'
      ),
      makeTable(
        ['항목', '상태', '내용'],
        [
          ['파트너 계정 생성', '✅ 완료', '전체 파트너 Auth 계정 생성 및 연동'],
          ['추천 코드 이관', '✅ 완료', '기존 referral_code 유지하여 이관'],
          ['프로그램 승인', '✅ 완료', '전원 승인(approved) 상태 전환'],
          ['비밀번호 설정 이메일', '⏳ 진행 중', '테스트 완료, 전체 발송 예정'],
          ['미이관 파트너 운영', '🔄 병행', 'Softr 포털 + Airtable 자동 동기화 유지'],
        ]
      ),
      p(''),
      hr(),

      // ═══════════════════════════════════════
      // 4. 파트너 모집 캠페인
      // ═══════════════════════════════════════
      h(2, '4. 신규 파트너 모집 캠페인 (인스타그램 광고)'),
      p(
        '2026년 3월 26일부터 인스타그램 노출 지면을 통한 신규 파트너 모집 광고를 집행 중입니다. ' +
        '"사장님 한 분만 연결해도 건당 3.5만원"이라는 명확한 수익 메시지를 중심으로, ' +
        '자영업자 지인이 많거나 SNS·블로그를 운영하는 타겟층에게 노출하고 있습니다. ' +
        '계약 없이 문의만으로 수익이 발생하는 구조(유효 리드 1.5만원)가 핵심 크리에이티브입니다.'
      ),
      makeTable(
        ['항목', '내용'],
        [
          ['광고 시작일', '2026년 3월 26일'],
          ['집행 채널', '인스타그램 피드 / 스토리 노출 지면'],
          ['핵심 타겟', '자영업 지인 보유자, SNS·블로그 운영자'],
          ['핵심 메시지', '사장님 한 분만 연결해도 건당 3.5만원'],
          ['현황', '집행 중 — 4월 중 1차 성과 측정 예정'],
        ]
      ),
      p(''),
      hr(),

      // ═══════════════════════════════════════
      // 5. 이벤트
      // ═══════════════════════════════════════
      h(2, '5. 파트너 이벤트 운영 현황 및 개선 계획'),
      p(
        '현재 진행 중인 커피 이벤트의 파트너 참여율이 기대보다 낮은 상태입니다. ' +
        '이벤트 혜택 자체보다는 파트너들이 이벤트 존재를 인지하지 못하거나, ' +
        '참여 방법이 직관적이지 않아 행동 전환이 일어나지 않는 것으로 분석됩니다. ' +
        '4월에는 Referio 플랫폼 내에서 이벤트 노출을 대폭 강화하여 참여율을 높입니다.'
      ),
      {
        type: 'bulletList',
        content: [
          makeBullet('파트너 대시보드 메인 화면 최상단에 이벤트 배너 상시 노출'),
          makeBullet('참여 조건 간소화 — 추천 1건 달성 시 자동 참여 처리로 마찰 제거'),
          makeBullet('진행 현황 실시간 표시 — "현재 N건 달성, 목표까지 M건 남음" 게이지 노출'),
          makeBullet('미참여 파트너 대상 개인화 메시지 리마인드 자동 발송'),
        ],
      },
      hr(),

      // ═══════════════════════════════════════
      // 6. CRM 시스템
      // ═══════════════════════════════════════
      h(2, '6. 키퍼 메이트 CRM 자동화 시스템'),
      p(
        '파트너가 가입 승인부터 정산 완료까지 전 과정에서 적시에 안내를 자동으로 받을 수 있도록 ' +
        '8단계 CRM 자동화 알림 시스템을 구축했습니다. ' +
        '파트너가 플랫폼에 직접 접속하지 않아도 활동 현황과 수익 정보를 받아볼 수 있어 ' +
        '활동 지속성과 만족도를 높이는 데 핵심적인 역할을 합니다.'
      ),
      makeTable(
        ['단계', '발송 시점', '주요 내용', '채널'],
        [
          ['① 가입 환영', '승인 즉시', '프로그램 안내 + 나만의 추천 링크 발급', '이메일'],
          ['② 첫 활동 독려', '가입 후 7일, 추천 0건', '활동 시작 가이드 + 수익 구조 재안내', '이메일'],
          ['③ 리드 발생 알림', '추천 링크 문의 접수 시', '유입 알림 + 현재 누적 현황 안내', '이메일'],
          ['④ 유효 리드 확정', '유효 판정 완료 시', '1.5만원 적립 예정 + 다음 목표 제시', '이메일'],
          ['⑤ 계약 완료 알림', '계약 체결 확인 시', '+2만원 + 누적 수익 + 티어 현황', '이메일'],
          ['⑥ 정산 처리 안내', '월말 정산 시', '정산 완료 금액 + 입금 예정일 안내', '이메일'],
          ['⑦ 티어 달성 축하', '월 목표 달성 시', '티어 업그레이드 + 다음 등급 혜택 안내', '이메일'],
          ['⑧ 미활동 리마인드', '30일 이상 활동 없을 시', '재참여 유도 + 성공 사례 / 활동 팁', '이메일'],
        ]
      ),
      p(''),
      {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: '※ 현재 이메일로 운영 중이며, 4월 이후 카카오 알림톡으로 전환 예정입니다. 알림톡은 이메일 대비 오픈율이 5~8배 높아 파트너 활동성 제고에 효과적입니다.',
          marks: [{ type: 'italic' }],
        }],
      },
      hr(),

      // ═══════════════════════════════════════
      // 7. 4월 전략
      // ═══════════════════════════════════════
      h(2, '7. 4월 전략 방향 및 실행 계획'),
      p(
        '3월 운영 현황을 바탕으로 4월에는 두 가지 축에 집중합니다. ' +
        '첫째, 승인된 파트너 중 미활동 비중을 낮추는 "파트너 활성화". ' +
        '둘째, 이메일에서 알림톡으로 전환하여 소통 효율을 높이는 "CRM 고도화"입니다.'
      ),
      makeTable(
        ['우선순위', '과제', '기대 효과', '일정'],
        [
          ['🔴 즉시', '3월 정산 처리 (12건 / 185,000원)', '파트너 신뢰 강화, 이탈 방지', '3월 말'],
          ['🔴 즉시', '미이관 파트너 비밀번호 설정 이메일 발송', '전체 파트너 Referio 접속 완료', '4월 1주'],
          ['🟡 4월 중', '카카오 알림톡 전환 개발', 'CRM 오픈율 5배 향상 목표', '4월 2주~'],
          ['🟡 4월 중', '커피 이벤트 참여 UX 개선', '참여율 30% 이상 달성 목표', '4월 2주'],
          ['🟢 4월 말', '인스타그램 광고 1차 성과 분석', '신규 모집 채널 효율 검증', '4월 4주'],
          ['🟢 4월 말', '미활동 파트너 재활성화 캠페인', '활동률 19% → 30% 이상 목표', '4월 말'],
        ]
      ),
      p(''),
      hr(),

      // ═══════════════════════════════════════
      // 맺음말
      // ═══════════════════════════════════════
      h(2, '맺음말'),
      p(
        '키퍼 메이트 파트너 프로그램은 100명 이상의 파트너 기반을 확보한 상태입니다. ' +
        '지금 단계의 핵심 과제는 숫자를 늘리는 것이 아니라, ' +
        '이미 확보된 파트너가 실제로 활동하고 성과를 낼 수 있는 환경을 만드는 것입니다. ' +
        'CRM 자동화, 알림톡 전환, 데이터 기반 개인화 소통을 통해 ' +
        '한화비전 키퍼 메이트 프로그램의 파트너 활동률과 계약 전환율을 함께 높여가겠습니다.'
      ),
    ],
  }
}

// Build widget content to insert
function buildWidgetContent(widgetType: string, stats: ReportStats): JSONContent['content'] {
  switch (widgetType) {
    case 'partners':
      return [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '파트너 현황' }],
        },
        {
          type: 'bulletList',
          content: [
            makeBullet(`총 파트너: ${stats.partners.total}명`),
            makeBullet(`승인: ${stats.partners.approved}명`),
            makeBullet(`승인 대기: ${stats.partners.pending}명`),
            makeBullet(`보류: ${stats.partners.rejected}명`),
          ],
        },
      ]
    case 'referrals':
      return [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '리퍼럴(고객) 현황' }],
        },
        {
          type: 'bulletList',
          content: [
            makeBullet(`총 리드: ${stats.referrals.total}건`),
            makeBullet(`계약 완료: ${stats.referrals.completed}건`),
            makeBullet(`전환율: ${stats.referrals.conversionRate}%`),
          ],
        },
      ]
    case 'settlements':
      return [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '정산 현황' }],
        },
        {
          type: 'bulletList',
          content: [
            makeBullet(`정산 대기: ${stats.settlements.pendingCount}건 / ${stats.settlements.pendingAmount.toLocaleString()}원`),
            makeBullet(`정산 완료: ${stats.settlements.completedCount}건 / ${stats.settlements.completedAmount.toLocaleString()}원`),
          ],
        },
      ]
    case 'monthly':
      return [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '월별 추이' }],
        },
        {
          type: 'bulletList',
          content: stats.monthlyData.map(m =>
            makeBullet(`${m.month}: 추천 ${m.count}건, 계약 ${m.completed}건`)
          ),
        },
      ]
    case 'topPartners':
      return [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'TOP 파트너 실적' }],
        },
        {
          type: 'orderedList',
          content: stats.topPartners.map(p =>
            makeBullet(`${p.name}: 추천 ${p.count}건, 계약 ${p.completed}건 (전환율 ${p.count > 0 ? Math.round((p.completed / p.count) * 100) : 0}%)`)
          ),
        },
      ]
    default:
      return []
  }
}

function makeBullet(text: string): JSONContent {
  return {
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}
