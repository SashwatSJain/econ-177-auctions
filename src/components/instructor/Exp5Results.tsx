'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat } from './charts'
import type { BetaCVEntry } from '@/lib/types'

function fmtBid(n: number, variant: 'integer' | 'continuous') {
  return variant === 'continuous' ? `$${Number(n).toFixed(2)}` : `$${Number(n)}`
}

export default function Exp5Results() {
  const [rows, setRows] = useState<BetaCVEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [variant, setVariant] = useState<'integer' | 'continuous'>('integer')
  const [pairing, setPairing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/beta/cv-auction?variant=${variant}`)
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [variant])

  useEffect(() => { fetchRows() }, [fetchRows])

  const submitted = rows.filter((r) => r.bid !== null)
  const pairedRows = rows.filter((r) => r.pair_id !== null)
  const unpairedSubmitted = submitted.filter((r) => r.pair_id === null)
  const notSubmitted = rows.filter((r) => r.bid === null)

  const pairMap = new Map<string, BetaCVEntry[]>()
  for (const r of pairedRows) {
    if (!r.pair_id) continue
    if (!pairMap.has(r.pair_id)) pairMap.set(r.pair_id, [])
    pairMap.get(r.pair_id)!.push(r)
  }
  const pairs: [BetaCVEntry, BetaCVEntry][] = []
  for (const [, members] of pairMap) {
    const a = members.find((m) => m.role === 'a')
    const b = members.find((m) => m.role === 'b')
    if (a && b) pairs.push([a, b])
  }

  const completedPairs = pairs.filter(([a, b]) => a.bid !== null && b.bid !== null)
  const allBids = completedPairs.flatMap(([a, b]) => [Number(a.bid!), Number(b.bid!)])
  const avgBid = allBids.length > 0 ? allBids.reduce((s, v) => s + v, 0) / allBids.length : null

  const winnerProfits = completedPairs.map(([a, b]) => {
    const V = Number(a.half_value) + Number(b.half_value)
    const bidA = Number(a.bid!), bidB = Number(b.bid!)
    const winnerBid = bidA > bidB ? bidA : bidB
    return V - winnerBid
  })
  const avgProfit = winnerProfits.length > 0 ? winnerProfits.reduce((s, v) => s + v, 0) / winnerProfits.length : null

  async function handlePairAll() {
    setPairing(true); setActionMsg('')
    try {
      const res = await fetch('/api/beta/cv-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      })
      const json = await res.json()
      setActionMsg(`Paired ${json.paired} students. ${json.unpaired} left without a pair.`)
      await fetchRows()
    } catch {
      setActionMsg('Error pairing. Please try again.')
    } finally {
      setPairing(false)
    }
  }

  async function handleDeleteRow(id: string, isPaired: boolean) {
    const msg = isPaired
      ? 'Delete this entry? Their partner will be un-paired and returned to the waiting pool.'
      : 'Delete this entry?'
    if (!confirm(msg)) return
    setDeletingId(id)
    try {
      await fetch(`/api/beta/cv-auction?id=${id}`, { method: 'DELETE' })
      await fetchRows()
    } catch {
      setActionMsg('Error deleting entry.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReset() {
    if (!confirm(`Delete all Oil Well (${variant}) entries? This cannot be undone.`)) return
    setResetting(true); setActionMsg('')
    try {
      await fetch(`/api/beta/cv-auction?variant=${variant}`, { method: 'DELETE' })
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
      {/* Variant toggle */}
      <div className="flex gap-2 mb-6">
        {(['integer', 'continuous'] as const).map((v) => (
          <button key={v} onClick={() => { setVariant(v); setRows([]) }}
            className="text-xs px-3 py-1.5 rounded transition-all capitalize"
            style={{ background: variant === v ? 'var(--navy)' : 'var(--surface)', color: variant === v ? '#fff' : 'var(--text-muted)', border: `1px solid ${variant === v ? 'var(--navy)' : 'var(--border)'}` }}>
            {v === 'integer' ? 'Integer Bids' : 'Continuous Bids'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Joined" value={rows.length} />
        <Stat label="Bids Submitted" value={submitted.length} />
        <Stat label="Paired" value={pairedRows.length} />
        <Stat label="Awaiting Pair" value={unpairedSubmitted.length} />
        <Stat label="Pairs Resolved" value={completedPairs.length} />
        <Stat label="Avg Bid" value={avgBid !== null ? fmtBid(avgBid, variant) : '—'} />
        <Stat label="Avg Winner Profit" value={avgProfit !== null ? fmtBid(avgProfit, variant) : '—'} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={handlePairAll} className="btn-gold text-xs px-3 py-1.5 rounded"
            disabled={pairing || unpairedSubmitted.length === 0}>
            {pairing ? 'Pairing…' : `Pair All (${unpairedSubmitted.length} waiting)`}
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
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading…' : `No students have joined yet. Share /exp5/${variant} with your class.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pairs.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Paired Results ({pairs.length} pair{pairs.length !== 1 ? 's' : ''})
              </p>
              <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ minWidth: '680px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Pair', 'Student', 'Half Value', 'Bid', 'V', 'Outcome', 'Profit', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map(([a, b], pairIdx) => {
                      const V = Number(a.half_value) + Number(b.half_value)
                      const bidA = a.bid !== null ? Number(a.bid) : null
                      const bidB = b.bid !== null ? Number(b.bid) : null
                      const bothBid = bidA !== null && bidB !== null
                      const winnerIsA = bothBid && (bidA > bidB! || (bidA === bidB && a.role === 'a'))
                      const bothBg = pairIdx % 2 === 0 ? '#fff' : 'rgba(248,249,252,0.8)'
                      return [
                        <tr key={a.id}
                          style={{ background: bothBid && winnerIsA ? 'rgba(0,54,96,0.05)' : bothBg, borderBottom: '1px solid var(--border)' }}>
                          <td className="px-4 py-2.5 text-xs font-mono" rowSpan={2}
                            style={{ color: 'var(--text-muted)', fontSize: '10px', borderRight: '3px solid var(--navy)', verticalAlign: 'middle' }}>
                            {pairIdx + 1}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)', fontWeight: winnerIsA ? 600 : 400 }}>
                            {a.student_id}{bothBid && winnerIsA && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>★ winner</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>{fmtBid(Number(a.half_value), variant)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: bidA !== null ? 'var(--text)' : 'var(--text-muted)', fontWeight: bothBid && winnerIsA ? 600 : 400 }}>
                            {bidA !== null ? fmtBid(bidA, variant) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" rowSpan={2} style={{ color: 'var(--navy)', fontWeight: 600, verticalAlign: 'middle' }}>
                            {fmtBid(V, variant)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: bothBid && winnerIsA ? 'var(--navy)' : 'var(--text-muted)' }}>
                            {bothBid ? (winnerIsA ? 'Won' : 'Lost') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: bothBid && winnerIsA ? 600 : 400 }}>
                            {bothBid && winnerIsA ? fmtBid(V - bidA!, variant) : bothBid ? '$0' : '—'}
                          </td>
                          <td className="px-4 py-2.5" style={{ verticalAlign: 'middle' }}>
                            <button onClick={() => handleDeleteRow(a.id, true)} disabled={deletingId === a.id}
                              className="text-[10px] px-1.5 py-0.5 rounded" title="Delete entry"
                              style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent', opacity: deletingId === a.id ? 0.5 : 1 }}>
                              ✕
                            </button>
                          </td>
                        </tr>,
                        <tr key={b.id}
                          style={{ background: bothBid && !winnerIsA ? 'rgba(0,54,96,0.05)' : bothBg, borderBottom: pairIdx < pairs.length - 1 ? '2px solid var(--border)' : '1px solid var(--border)' }}>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)', fontWeight: !winnerIsA && bothBid ? 600 : 400 }}>
                            {b.student_id}{bothBid && !winnerIsA && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>★ winner</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>{fmtBid(Number(b.half_value), variant)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: bidB !== null ? 'var(--text)' : 'var(--text-muted)', fontWeight: bothBid && !winnerIsA ? 600 : 400 }}>
                            {bidB !== null ? fmtBid(bidB, variant) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: bothBid && !winnerIsA ? 'var(--navy)' : 'var(--text-muted)' }}>
                            {bothBid ? (!winnerIsA ? 'Won' : 'Lost') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: bothBid && !winnerIsA ? 600 : 400 }}>
                            {bothBid && !winnerIsA ? fmtBid(V - bidB!, variant) : bothBid ? '$0' : '—'}
                          </td>
                          <td className="px-4 py-2.5" style={{ verticalAlign: 'middle' }}>
                            <button onClick={() => handleDeleteRow(b.id, true)} disabled={deletingId === b.id}
                              className="text-[10px] px-1.5 py-0.5 rounded" title="Delete entry"
                              style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent', opacity: deletingId === b.id ? 0.5 : 1 }}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {unpairedSubmitted.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Awaiting Pair ({unpairedSubmitted.length})
              </p>
              <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ minWidth: '400px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Half Value', 'Bid', 'Joined', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unpairedSubmitted.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{row.student_id}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)' }}>{fmtBid(Number(row.half_value), variant)}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{fmtBid(Number(row.bid!), variant)}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => handleDeleteRow(row.id, false)} disabled={deletingId === row.id}
                            className="text-[10px] px-1.5 py-0.5 rounded" title="Delete entry"
                            style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent', opacity: deletingId === row.id ? 0.5 : 1 }}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {notSubmitted.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Joined, No Bid Yet ({notSubmitted.length})
              </p>
              <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ minWidth: '400px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Half Value', 'Joined', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notSubmitted.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{row.student_id}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)' }}>{fmtBid(Number(row.half_value), variant)}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => handleDeleteRow(row.id, false)} disabled={deletingId === row.id}
                            className="text-[10px] px-1.5 py-0.5 rounded" title="Delete entry"
                            style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent', opacity: deletingId === row.id ? 0.5 : 1 }}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
