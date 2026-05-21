'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat, Exp6BidCdfChart } from './charts'
import type { AllPayEntry } from '@/lib/types'

type Tab = 2 | 5 | 10 | 'lookup'

function fmt(n: number) {
  if (n < 0) return `-$${(-n).toFixed(2)}`
  return `$${n.toFixed(2)}`
}

function computeWinner(group: AllPayEntry[]): AllPayEntry {
  return group.reduce((best, m) => {
    const bBid = Number(m.bid!), wBid = Number(best.bid!)
    return bBid > wBid || (bBid === wBid && (m.role ?? 99) < (best.role ?? 99)) ? m : best
  })
}

// ── Lookup panel ──────────────────────────────────────────────────────────────

interface LookupResult {
  status: 'waiting' | 'unmatched' | 'ready' | 'not_found'
  own?: AllPayEntry
  group?: AllPayEntry[]
  num_bidders?: number
}

function LookupPanel() {
  const [perm, setPerm] = useState('')
  const [selectedN, setSelectedN] = useState<2 | 5 | 10>(2)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleLookup() {
    const id = perm.trim()
    if (!id) { setErr('Enter a perm number.'); return }
    setErr(''); setLoading(true); setResult(null)
    try {
      const res = await fetch(
        `/api/exp6/result?student_id=${encodeURIComponent(id)}&num_bidders=${selectedN}`
      )
      if (res.status === 404) { setResult({ status: 'not_found' }); return }
      const json = await res.json()
      setResult({ ...json, num_bidders: selectedN })
    } catch {
      setErr('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const winner = result?.status === 'ready' && result.group ? computeWinner(result.group) : null
  const isWinner = winner && result?.own ? winner.id === result.own.id : false
  const myBid = result?.own ? Number(result.own.bid) : 0
  const myNet = isWinner ? 100 - myBid : -myBid

  return (
    <div className="max-w-md">
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        Enter a student&apos;s perm number to see their outcome.
      </p>

      <div className="flex gap-2 mb-3">
        {([2, 5, 10] as const).map((n) => (
          <button key={n} onClick={() => { setSelectedN(n); setResult(null) }}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ background: selectedN === n ? 'var(--navy)' : 'var(--surface)', color: selectedN === n ? '#fff' : 'var(--text-muted)', border: `1px solid ${selectedN === n ? 'var(--navy)' : 'var(--border)'}` }}>
            {n} Bidders
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="flex-1 rounded-lg px-4 py-2.5 text-sm"
          placeholder="Perm number"
          value={perm}
          onChange={(e) => { setPerm(e.target.value); setErr('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
        />
        <button
          className="btn-gold text-xs px-4 py-2.5 rounded-lg"
          onClick={handleLookup}
          disabled={loading}
        >
          {loading ? '…' : 'Look up'}
        </button>
      </div>
      {err && <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{err}</p>}

      {result && (
        <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {result.status === 'not_found' && (
            <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              No record found for <strong>{perm.trim()}</strong> in the {selectedN}-bidder auction.
            </div>
          )}
          {result.status === 'waiting' && (
            <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <strong>{perm.trim()}</strong> has submitted a bid but has not been grouped yet.
            </div>
          )}
          {result.status === 'unmatched' && (
            <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <strong>{perm.trim()}</strong> was not placed in a group this round (odd one out).
            </div>
          )}
          {result.status === 'ready' && result.own && result.group && winner && (
            <>
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                  {perm.trim()} · {selectedN}-bidder auction
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: isWinner ? 'var(--navy)' : '#f3f4f6', color: isWinner ? '#fff' : 'var(--text-muted)' }}>
                  {isWinner ? '★ Winner' : 'Lost'}
                </span>
              </div>

              <div className="px-4 py-3 grid grid-cols-3 gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Bid</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>${myBid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Prize</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{isWinner ? '$100.00' : '$0.00'}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Net payoff</p>
                  <p className="text-sm font-bold" style={{ color: myNet >= 0 ? 'var(--navy)' : '#dc2626' }}>{fmt(myNet)}</p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    {['All Bids in Group', 'Bid', 'Net'].map((h) => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.group.map((m, i) => {
                    const mWon = m.id === winner.id
                    const mNet = mWon ? 100 - Number(m.bid) : -Number(m.bid)
                    const isMe = m.id === result.own!.id
                    return (
                      <tr key={m.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: isMe ? 700 : 400, color: isMe ? 'var(--navy)' : 'var(--text)' }}>
                          {m.student_id}
                          {isMe && <span className="ml-1 text-[10px]">(lookup)</span>}
                          {mWon && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>★</span>}
                        </td>
                        <td style={{ padding: '7px 12px', fontWeight: mWon ? 700 : 400, color: 'var(--text)' }}>${Number(m.bid).toFixed(2)}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 600, color: mNet >= 0 ? 'var(--navy)' : '#dc2626' }}>{fmt(mNet)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Exp6Results() {
  const [tab, setTab] = useState<Tab>(2)
  const [rows, setRows] = useState<AllPayEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [grouping, setGrouping] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState('')
  const [allBids, setAllBids] = useState<{ 2: number[]; 5: number[]; 10: number[] }>({ 2: [], 5: [], 10: [] })

  const numBidders = tab !== 'lookup' ? tab : 2

  const fetchAllBids = useCallback(async () => {
    const [r2, r5, r10] = await Promise.all([
      fetch('/api/exp6?num_bidders=2').then((r) => r.ok ? r.json() as Promise<AllPayEntry[]> : []),
      fetch('/api/exp6?num_bidders=5').then((r) => r.ok ? r.json() as Promise<AllPayEntry[]> : []),
      fetch('/api/exp6?num_bidders=10').then((r) => r.ok ? r.json() as Promise<AllPayEntry[]> : []),
    ])
    setAllBids({
      2:  (r2  as AllPayEntry[]).filter((e) => e.bid !== null).map((e) => Number(e.bid)),
      5:  (r5  as AllPayEntry[]).filter((e) => e.bid !== null).map((e) => Number(e.bid)),
      10: (r10 as AllPayEntry[]).filter((e) => e.bid !== null).map((e) => Number(e.bid)),
    })
  }, [])

  const fetchRows = useCallback(async () => {
    if (tab === 'lookup') return
    setLoading(true)
    try {
      const res = await fetch(`/api/exp6?num_bidders=${tab}`)
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchRows() }, [fetchRows])
  useEffect(() => { fetchAllBids() }, [fetchAllBids])

  const submitted = rows.filter((r) => r.bid !== null)
  const groupedRows = rows.filter((r) => r.group_id !== null && r.bid !== null)
  const ungroupedSubmitted = submitted.filter((r) => r.group_id === null)
  const notSubmitted = rows.filter((r) => r.bid === null)
  const bids = submitted.map((r) => Number(r.bid!))
  const avgBid = bids.length > 0 ? bids.reduce((s, v) => s + v, 0) / bids.length : null

  const groupMap = new Map<string, AllPayEntry[]>()
  for (const r of groupedRows) {
    if (!r.group_id) continue
    if (!groupMap.has(r.group_id)) groupMap.set(r.group_id, [])
    groupMap.get(r.group_id)!.push(r)
  }
  const groups = [...groupMap.values()].map((g) => g.sort((a, b) => (a.role ?? 0) - (b.role ?? 0)))
  const completeGroups = groups.filter((g) => g.length === numBidders && g.every((m) => m.bid !== null))

  const allNetPayoffs = completeGroups.flatMap((g) => {
    const w = computeWinner(g)
    return g.map((m) => (m.id === w.id ? 100 - Number(m.bid) : -Number(m.bid)))
  })
  const avgProfit = allNetPayoffs.length > 0
    ? allNetPayoffs.reduce((s, v) => s + v, 0) / allNetPayoffs.length
    : null

  async function handleGroupAll() {
    if (tab === 'lookup') return
    setGrouping(true); setActionMsg('')
    try {
      const res = await fetch('/api/exp6/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_bidders: tab }),
      })
      const json = await res.json()
      setActionMsg(`Grouped ${json.grouped} students. ${json.ungrouped} left without a group.`)
      await Promise.all([fetchRows(), fetchAllBids()])
    } catch {
      setActionMsg('Error grouping. Please try again.')
    } finally {
      setGrouping(false)
    }
  }

  async function handleDeleteRow(id: string, isGrouped: boolean) {
    const msg = isGrouped
      ? 'Delete this entry? The rest of their group will be un-grouped.'
      : 'Delete this entry?'
    if (!confirm(msg)) return
    setDeletingId(id)
    try {
      await fetch(`/api/exp6?id=${id}`, { method: 'DELETE' })
      await Promise.all([fetchRows(), fetchAllBids()])
    } catch {
      setActionMsg('Error deleting entry.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReset() {
    if (tab === 'lookup') return
    if (!confirm(`Delete all ${tab}-bidder entries? This cannot be undone.`)) return
    setResetting(true); setActionMsg('')
    try {
      await fetch(`/api/exp6?num_bidders=${tab}`, { method: 'DELETE' })
      setActionMsg('Session reset.')
      setRows([])
    } catch {
      setActionMsg('Error resetting.')
    } finally {
      setResetting(false)
    }
  }

  const DeleteBtn = ({ id, isGrouped }: { id: string; isGrouped: boolean }) => (
    <button onClick={() => handleDeleteRow(id, isGrouped)} disabled={deletingId === id}
      className="text-[10px] px-1.5 py-0.5 rounded" title="Delete entry"
      style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent', opacity: deletingId === id ? 0.5 : 1 }}>
      ✕
    </button>
  )

  const tabs: { value: Tab; label: string }[] = [
    { value: 2, label: 'a · 2 Bidders' },
    { value: 5, label: 'b · 5 Bidders' },
    { value: 10, label: 'c · 10 Bidders' },
    { value: 'lookup', label: 'Lookup' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {tabs.map(({ value, label }) => (
          <button key={value} onClick={() => { setTab(value); setRows([]); setActionMsg('') }}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ background: tab === value ? 'var(--navy)' : 'var(--surface)', color: tab === value ? '#fff' : 'var(--text-muted)', border: `1px solid ${tab === value ? 'var(--navy)' : 'var(--border)'}` }}>
            {label}
          </button>
        ))}
      </div>

      {/* CDF chart — always visible */}
      <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Exp6BidCdfChart bids2={allBids[2]} bids5={allBids[5]} bids10={allBids[10]} />
      </div>

      {/* Lookup tab */}
      {tab === 'lookup' && <LookupPanel />}

      {/* Auction tabs */}
      {tab !== 'lookup' && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl p-4 mb-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Stat label="Joined" value={rows.length} />
            <Stat label="Bids Submitted" value={submitted.length} />
            <Stat label="Grouped" value={groupedRows.length} />
            <Stat label="Awaiting Group" value={ungroupedSubmitted.length} />
            <Stat label="Complete Groups" value={completeGroups.length} />
            <Stat label="Avg Bid" value={avgBid !== null ? `$${avgBid.toFixed(2)}` : '—'} />
            <Stat label="Avg Profit" value={avgProfit !== null ? fmt(avgProfit) : '—'} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 items-center justify-between mb-6">
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={handleGroupAll} className="btn-gold text-xs px-3 py-1.5 rounded"
                disabled={grouping || ungroupedSubmitted.length < tab}>
                {grouping ? 'Grouping…' : `Group All (${ungroupedSubmitted.length} waiting)`}
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
                {loading ? 'Loading…' : `No entries yet. Students join at /exp6/${tab}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    Groups ({groups.length})
                  </p>
                  <div className="space-y-3">
                    {groups.map((group, gIdx) => {
                      const complete = group.every((m) => m.bid !== null)
                      const winner = complete ? computeWinner(group) : null
                      return (
                        <div key={group[0].group_id} className="rounded-xl overflow-hidden"
                          style={{ border: '1px solid var(--border)' }}>
                          <div className="px-4 py-2 flex items-center justify-between"
                            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                            <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                              Group {gIdx + 1}
                            </span>
                            {complete && winner && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Winner: <strong style={{ color: 'var(--navy)' }}>{winner.student_id}</strong>
                                {' · '}Revenue collected: <strong>${group.reduce((s, m) => s + Number(m.bid!), 0).toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: 'var(--surface)' }}>
                                {['Student', 'Bid', 'Outcome', 'Net', 'Time', ''].map((h) => (
                                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {group.map((m, i) => {
                                const mWon = winner?.id === m.id
                                const net = m.bid !== null ? (mWon ? 100 - Number(m.bid) : -Number(m.bid)) : null
                                return (
                                  <tr key={m.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: mWon ? 700 : 400, fontFamily: 'monospace', fontSize: 12 }}>
                                      {m.student_id}
                                      {mWon && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>★ winner</span>}
                                    </td>
                                    <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: mWon ? 700 : 400 }}>
                                      {m.bid !== null ? `$${Number(m.bid).toFixed(2)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '7px 12px', color: mWon ? 'var(--navy)' : 'var(--text-muted)', fontWeight: mWon ? 700 : 400 }}>
                                      {complete ? (mWon ? 'Won $100' : 'Lost') : '—'}
                                    </td>
                                    <td style={{ padding: '7px 12px', fontWeight: 600, color: net === null ? 'var(--text-muted)' : net >= 0 ? 'var(--navy)' : '#dc2626' }}>
                                      {net !== null ? fmt(net) : '—'}
                                    </td>
                                    <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                                      {new Date(m.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '7px 12px' }}>
                                      <DeleteBtn id={m.id} isGrouped={true} />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {ungroupedSubmitted.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    Awaiting Group ({ungroupedSubmitted.length})
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface)' }}>
                          {['Student', 'Bid', 'Time', ''].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ungroupedSubmitted.map((r, i) => (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '7px 12px', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>{r.student_id}</td>
                            <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: 600 }}>${Number(r.bid!).toFixed(2)}</td>
                            <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                              {new Date(r.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '7px 12px' }}><DeleteBtn id={r.id} isGrouped={false} /></td>
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
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface)' }}>
                          {['Student', 'Joined', ''].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {notSubmitted.map((r, i) => (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{r.student_id}</td>
                            <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                              {new Date(r.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '7px 12px' }}><DeleteBtn id={r.id} isGrouped={false} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
