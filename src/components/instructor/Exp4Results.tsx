'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat, Exp4ScatterChart, filterExp4Outliers } from './charts'
import type { Experiment4Response } from '@/lib/types'

const EXP4_TABS = [
  { key: 'bid_2' as const, label: '2 Bidders' },
  { key: 'bid_10' as const, label: '10 Bidders' },
  { key: 'bid_100' as const, label: '100 Bidders' },
]

function Experiment4Charts({ rows }: { rows: Experiment4Response[] }) {
  const [activeTab, setActiveTab] = useState<'bid_2' | 'bid_10' | 'bid_100'>('bid_2')
  const [noOutliers, setNoOutliers] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (rows.length === 0) return null

  const rawData = rows.map((r) => ({ id: r.student_id, x: Number(r.estimate), y: Number(r[activeTab]) }))
  const data = noOutliers ? filterExp4Outliers(rawData) : rawData
  const hiddenCount = rawData.length - data.length

  const headerActions = (
    <div className="flex items-center gap-1">
      <button onClick={() => setNoOutliers((v) => !v)}
        className="rounded transition-colors"
        style={{ color: noOutliers ? 'var(--navy)' : 'var(--text-muted)', padding: '2px 6px', fontSize: '10px', lineHeight: 1.4, background: 'transparent', border: `1px solid ${noOutliers ? 'var(--navy)' : 'var(--border)'}` }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)' }}
        onMouseLeave={(e) => { if (!noOutliers) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >
        {noOutliers ? `Outliers hidden (${hiddenCount})` : 'Remove outliers'}
      </button>
      <button onClick={() => setFullscreen(true)} title="Fullscreen"
        className="rounded transition-colors"
        style={{ color: 'var(--text-muted)', padding: '2px 4px', fontSize: '11px', lineHeight: 1, background: 'transparent', border: '1px solid transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--navy)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >⛶</button>
    </div>
  )

  const chartBody = (
    <>
      <div className="flex gap-1 mb-3">
        {EXP4_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ background: activeTab === tab.key ? 'var(--navy)' : 'var(--surface2)', color: activeTab === tab.key ? '#fff' : 'var(--text-muted)', border: `1px solid ${activeTab === tab.key ? 'var(--navy)' : 'var(--border)'}` }}>
            {tab.label}
          </button>
        ))}
      </div>
      <Exp4ScatterChart data={data} />
    </>
  )

  return (
    <div className="mb-6">
      <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Charts</p>
      <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Estimate vs Bid</p>
          {headerActions}
        </div>
        {chartBody}
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setFullscreen(false)}>
          <div className="rounded-2xl p-6"
            style={{ background: '#fff', width: '90vw', maxWidth: '1100px', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>Estimate vs Bid</p>
              <div className="flex items-center gap-2">
                {headerActions}
                <button onClick={() => setFullscreen(false)}
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  ✕ Close
                </button>
              </div>
            </div>
            {chartBody}
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>Press Esc or click outside to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Exp4Results() {
  const [rows, setRows] = useState<Experiment4Response[]>([])
  const [loading, setLoading] = useState(false)
  const [grouping, setGrouping] = useState(false)
  const [groupMsg, setGroupMsg] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/experiment4')
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this submission?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/experiment4?id=${id}`, { method: 'DELETE' })
      await fetchRows()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleGroupAll() {
    setGrouping(true); setGroupMsg('')
    try {
      const res = await fetch('/api/experiment4/group', { method: 'POST' })
      const json = await res.json()
      setGroupMsg(`Grouped ${json.grouped} students. ${json.ungrouped} left without a group.`)
      await fetchRows()
    } catch {
      setGroupMsg('Error grouping. Please try again.')
    } finally {
      setGrouping(false)
    }
  }

  useEffect(() => { fetchRows() }, [fetchRows])

  // Stable group-number map: first appearance order
  const groupNumMap = new Map<string, number>()
  let nextGroupNum = 1
  for (const r of rows) {
    if (r.group_id && !groupNumMap.has(r.group_id)) {
      groupNumMap.set(r.group_id, nextGroupNum++)
    }
  }

  const avg = (fn: (r: Experiment4Response) => number) =>
    rows.length > 0 ? rows.reduce((s, r) => s + fn(r), 0) / rows.length : null

  const avgEstimate = avg((r) => Number(r.estimate))
  const avgBid2 = avg((r) => Number(r.bid_2))
  const avgBid10 = avg((r) => Number(r.bid_10))
  const avgBid100 = avg((r) => Number(r.bid_100))
  const fmt = (v: number | null) => (v == null ? '—' : v.toFixed(1))

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const sheet = rows.map((r, i) => ({
      '#': i + 1,
      'Student ID': r.student_id,
      'Estimate (kernels)': Number(r.estimate),
      'Bid — 1 Bidder ($)': Number(r.bid_2),
      'Bid — 10 Bidders ($)': Number(r.bid_10),
      'Bid — 100 Bidders ($)': Number(r.bid_100),
      'Submitted': new Date(r.created_at).toLocaleString(),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Responses')
    XLSX.writeFile(wb, 'experiment4-jar-of-kernels.xlsx')
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Submissions" value={rows.length} />
        <Stat label="Avg Estimate" value={fmt(avgEstimate)} />
        <Stat label="Avg Bid · 1 Bidder" value={avgBid2 != null ? `$${fmt(avgBid2)}` : '—'} />
        <Stat label="Avg Bid · 10 Bidders" value={avgBid10 != null ? `$${fmt(avgBid10)}` : '—'} />
        <Stat label="Avg Bid · 100 Bidders" value={avgBid100 != null ? `$${fmt(avgBid100)}` : '—'} />
      </div>

      <Experiment4Charts rows={rows} />

      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,54,96,0.08)', color: 'var(--navy)', fontWeight: 500 }}>
            Auto-grouping on · groups of 10
          </span>
          <button onClick={handleGroupAll} className="btn-ghost text-xs px-3 py-1.5 rounded"
            disabled={grouping || rows.filter((r) => !r.group_id).length === 0}>
            {grouping ? 'Grouping…' : `Group Remainder (${rows.filter((r) => !r.group_id).length} unassigned)`}
          </button>
          {groupMsg && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{groupMsg}</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRows} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button onClick={handleExport} className="btn-gold text-xs px-3 py-1.5 rounded" disabled={rows.length === 0}>
            ⬇ Excel
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading…' : 'No submissions yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Group', 'Student ID', 'Estimate', 'Bid · 1 Bidder', 'Bid · 10 Bidders', 'Bid · 100 Bidders', 'Submitted', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: row.group_id ? 'var(--navy)' : 'var(--text-muted)' }}>
                    {row.group_id ? `G${groupNumMap.get(row.group_id)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{row.student_id}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{Number(row.estimate).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>${Number(row.bid_2).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>${Number(row.bid_10).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>${Number(row.bid_100).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(row.id)} disabled={deletingId === row.id}
                      className="text-[10px] px-1.5 py-0.5 rounded" title="Delete"
                      style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent', opacity: deletingId === row.id ? 0.5 : 1 }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
