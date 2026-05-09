'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat } from './charts'
import type { AllPayEntry } from '@/lib/types'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function Exp6Results() {
  const [rows, setRows] = useState<AllPayEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [numBidders, setNumBidders] = useState<2 | 5 | 10>(2)
  const [grouping, setGrouping] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/exp6?num_bidders=${numBidders}`)
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [numBidders])

  useEffect(() => { fetchRows() }, [fetchRows])

  const submitted = rows.filter((r) => r.bid !== null)
  const grouped = rows.filter((r) => r.group_id !== null)
  const ungroupedSubmitted = submitted.filter((r) => r.group_id === null)

  const groupMap = new Map<string, AllPayEntry[]>()
  for (const r of grouped) {
    if (!r.group_id) continue
    if (!groupMap.has(r.group_id)) groupMap.set(r.group_id, [])
    groupMap.get(r.group_id)!.push(r)
  }
  const completeGroups = [...groupMap.values()].filter(
    (g) => g.length === numBidders && g.every((m) => m.bid !== null)
  )

  const allBids = completeGroups.flatMap((g) => g.map((m) => Number(m.bid!)))
  const avgBid = allBids.length > 0 ? allBids.reduce((s, v) => s + v, 0) / allBids.length : null

  const winnerPayoffs = completeGroups.map((g) => {
    const sorted = [...g].sort((a, b) => b.bid! - a.bid! || a.role! - b.role!)
    return 100 - Number(sorted[0].bid!)
  })
  const avgWinnerPayoff = winnerPayoffs.length > 0 ? winnerPayoffs.reduce((s, v) => s + v, 0) / winnerPayoffs.length : null

  async function handleGroupAll() {
    setGrouping(true); setActionMsg('')
    try {
      const res = await fetch('/api/exp6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_bidders: numBidders }),
      })
      const json = await res.json()
      setActionMsg(`Grouped ${json.grouped} students into ${json.grouped / numBidders} group(s). ${json.leftover} left over.`)
      await fetchRows()
    } catch {
      setActionMsg('Error grouping. Please try again.')
    } finally {
      setGrouping(false)
    }
  }

  async function handleReset() {
    if (!confirm(`Delete all Exp 6 All-Pay (${numBidders}-bidder) entries? This cannot be undone.`)) return
    setResetting(true); setActionMsg('')
    try {
      await fetch(`/api/exp6?num_bidders=${numBidders}`, { method: 'DELETE' })
      setActionMsg('Session reset.')
      await fetchRows()
    } catch {
      setActionMsg('Error resetting.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      {/* Num-bidders toggle */}
      <div className="flex gap-2 mb-6">
        {([2, 5, 10] as const).map((n) => (
          <button key={n} onClick={() => { setNumBidders(n); setRows([]) }}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ background: numBidders === n ? 'var(--navy)' : 'var(--surface)', color: numBidders === n ? '#fff' : 'var(--text-muted)', border: `1px solid ${numBidders === n ? 'var(--navy)' : 'var(--border)'}` }}>
            {n} Bidders
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Joined" value={rows.length} />
        <Stat label="Bids Submitted" value={submitted.length} />
        <Stat label="In Groups" value={grouped.length} />
        <Stat label="Awaiting Group" value={ungroupedSubmitted.length} />
        <Stat label="Groups Resolved" value={completeGroups.length} />
        <Stat label="Avg Bid" value={avgBid !== null ? `$${avgBid.toFixed(2)}` : '—'} />
        <Stat label="Avg Winner Payoff" value={avgWinnerPayoff !== null ? `$${avgWinnerPayoff.toFixed(2)}` : '—'} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={handleGroupAll} className="btn-gold text-xs px-3 py-1.5 rounded"
            disabled={grouping || ungroupedSubmitted.length < numBidders}>
            {grouping ? 'Grouping…' : `Group All (${ungroupedSubmitted.length} waiting, need ${numBidders})`}
          </button>
          <button onClick={handleReset} className="text-xs px-3 py-1.5 rounded transition-all"
            disabled={resetting || rows.length === 0}
            style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626' }}>
            {resetting ? 'Resetting…' : 'Reset Session'}
          </button>
          {actionMsg && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{actionMsg}</span>}
        </div>
        <button onClick={fetchRows} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {rows.length === 0 ? (
        loading ? <SkeletonTable statCols={7} tableCols={5} tableRows={6} /> : (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No entries yet. Students join at <strong>/exp6/{numBidders}</strong>.
          </p>
        </div>)
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['Student ID', 'Bid', 'Group', 'Role', 'Payoff'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                let payoff: number | null = null
                if (r.group_id && r.bid !== null) {
                  const grp = groupMap.get(r.group_id)
                  if (grp && grp.every((m) => m.bid !== null)) {
                    const sorted = [...grp].sort((a, b) => b.bid! - a.bid! || a.role! - b.role!)
                    const isWinner = sorted[0].id === r.id
                    payoff = isWinner ? 100 - Number(r.bid) : -Number(r.bid)
                  }
                }
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>{r.student_id}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text)' }}>
                      {r.bid !== null ? `$${Number(r.bid).toFixed(2)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                      {r.group_id ? r.group_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--text)' }}>{r.role ?? '—'}</td>
                    <td style={{ padding: '7px 12px', fontWeight: payoff !== null ? 600 : 400, color: payoff !== null ? (payoff >= 0 ? '#16a34a' : '#dc2626') : 'var(--text-muted)' }}>
                      {payoff !== null ? (payoff >= 0 ? `+$${payoff.toFixed(2)}` : `-$${(-payoff).toFixed(2)}`) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
