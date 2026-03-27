'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'

// ─── Stat Card (single metric) ───────────────────────────────────
function MiniCard({
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
  const palette = {
    blue:   { bg: '#eff6ff', border: '#bfdbfe', label: '#3b82f6', value: '#1d4ed8', sub: '#60a5fa' },
    green:  { bg: '#ecfdf5', border: '#a7f3d0', label: '#10b981', value: '#065f46', sub: '#34d399' },
    purple: { bg: '#faf5ff', border: '#ddd6fe', label: '#8b5cf6', value: '#5b21b6', sub: '#a78bfa' },
    orange: { bg: '#fff7ed', border: '#fed7aa', label: '#f97316', value: '#c2410c', sub: '#fb923c' },
  }[color]

  return (
    <div style={{
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: palette.label, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: palette.value, margin: '4px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 11, color: palette.sub }}>{sub}</div>
    </div>
  )
}

// ─── Progress bar row ─────────────────────────────────────────────
function ActivityBar({
  active,
  inactive,
  withLink,
  withMemo,
}: {
  active: number
  inactive: number
  withLink: number
  withMemo: number
}) {
  const total = active + inactive
  const pct = total > 0 ? Math.round(active / total * 100) : 0

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '14px 18px',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 10 }}>파트너 활동 현황</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        <span>활동 <strong style={{ color: '#22c55e' }}>{active}명</strong></span>
        <span>미활동 <strong style={{ color: '#94a3b8' }}>{inactive}명</strong></span>
      </div>
      <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#22c55e', borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>활동률 {pct}%</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
        <span>메모 보유 <strong>{withMemo}명</strong></span>
        <span>활동링크 보유 <strong>{withLink}명</strong></span>
      </div>
    </div>
  )
}

// ─── Top Partners table ───────────────────────────────────────────
function TopTable({ rows }: { rows: Array<{ name: string; count: number; completed: number }> }) {
  return (
    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
          {['순위', '파트너', '추천 건수', '계약 완료', '전환율'].map(h => (
            <th key={h} style={{ padding: '8px 6px', fontWeight: 600, textAlign: h === '순위' || h === '파트너' ? 'left' : 'right' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '8px 6px', color: '#94a3b8' }}>{i + 1}</td>
            <td style={{ padding: '8px 6px', fontWeight: 600, color: '#1e293b' }}>{r.name}</td>
            <td style={{ padding: '8px 6px', textAlign: 'right', color: '#475569' }}>{r.count}건</td>
            <td style={{ padding: '8px 6px', textAlign: 'right', color: '#475569' }}>{r.completed}건</td>
            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: r.completed > 0 ? '#10b981' : '#94a3b8' }}>
              {r.count > 0 ? Math.round(r.completed / r.count * 100) : 0}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── NodeView renderer ────────────────────────────────────────────
function StatBlockView({ node }: ReactNodeViewProps) {
  const blockType = node.attrs.blockType as string
  const rawData = node.attrs.data as string
  let parsed: Record<string, unknown> | null = null
  try { parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData } catch { /* empty */ }
  if (!parsed) return <NodeViewWrapper><div style={{ color: '#94a3b8', fontSize: 12, padding: 8 }}>데이터 없음</div></NodeViewWrapper>

  return (
    <NodeViewWrapper contentEditable={false} style={{ userSelect: 'none' }}>
      <div style={{ margin: '16px 0', pageBreakInside: 'avoid' }}>
        {blockType === 'summary' && (() => {
          const d = parsed as { partners?: { total: number; approved: number }; referrals?: { total: number; completed: number; conversionRate: number }; settlements?: { pendingCount: number; pendingAmount: number } }
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MiniCard label="총 파트너" value={d.partners?.total ?? 0} sub={`승인 ${d.partners?.approved ?? 0}명`} color="blue" />
              <MiniCard label="총 고객(리드)" value={d.referrals?.total ?? 0} sub={`계약완료 ${d.referrals?.completed ?? 0}건`} color="green" />
              <MiniCard label="전환율" value={`${d.referrals?.conversionRate ?? 0}%`} sub="리드 → 계약" color="purple" />
              <MiniCard label="정산 대기" value={`${(d.settlements?.pendingAmount ?? 0).toLocaleString()}원`} sub={`${d.settlements?.pendingCount ?? 0}건`} color="orange" />
            </div>
          )
        })()}

        {blockType === 'activity' && (() => {
          const d = parsed as { activeCount?: number; inactiveCount?: number; withActivityLink?: number; withMemo?: number }
          return (
            <ActivityBar
              active={d.activeCount ?? 0}
              inactive={d.inactiveCount ?? 0}
              withLink={d.withActivityLink ?? 0}
              withMemo={d.withMemo ?? 0}
            />
          )
        })()}

        {blockType === 'topPartners' && (() => {
          const d = parsed as unknown as Array<{ name: string; count: number; completed: number }>
          return <TopTable rows={Array.isArray(d) ? d.slice(0, 5) : []} />
        })()}
      </div>
    </NodeViewWrapper>
  )
}

// ─── Tiptap Node definition ───────────────────────────────────────
export const StatBlockNode = Node.create({
  name: 'statBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      blockType: { default: 'summary' },
      data: { default: '{}' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-stat-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-stat-block': '' }, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatBlockView)
  },
})
