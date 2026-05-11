'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat } from './charts'
import type { AllPayEntry } from '@/lib/types'

export default function Exp6Results() {
  const [rows, setRows] = useState<AllPayEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [numBidders, setNumBidders] = useState<2 | 5 | 10>(2)

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
  const bids = submitted.map((r) => Number(r.bid!))
  const avgBid = bids.length > 0 ? bids.reduce((s, v) => s + v, 0) / bids.length : null


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
      <div className="grid grid-cols-3 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Joined" value={rows.length} />
        <Stat label="Bids Submitted" value={submitted.length} />
        <Stat label="Avg Bid" value={avgBid !== null ? `$${avgBid.toFixed(2)}` : '—'} />
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-6">
        <button onClick={fetchRows} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No entries yet. Students join at <strong>/exp6/{numBidders}</strong>.
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['#', 'Student ID', 'Bid'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                  <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '7px 12px', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>{r.student_id}</td>
                  <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: r.bid !== null ? 600 : 400 }}>
                    {r.bid !== null ? `$${Number(r.bid).toFixed(2)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
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
