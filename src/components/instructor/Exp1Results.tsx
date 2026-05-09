'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat } from './charts'
import { AUCTION_CONFIGS, TOTAL_ROUNDS } from '@/lib/auction-config'
import type { Bid } from '@/lib/types'

function computeRoundRevenue(roundBids: Bid[]): number {
  return roundBids.reduce((sum, b) => sum + Number(b.amount), 0)
}

type SortCol = 'student_id' | 'round' | 'private_value' | 'amount' | 'ratio' | 'created_at'

export default function Exp1Results() {
  const [selectedAuction, setSelectedAuction] = useState(AUCTION_CONFIGS[0].key)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [confirmDelete, setConfirmDelete] = useState<
    { type: 'bid'; id: string } | { type: 'student'; studentId: string } | null
  >(null)

  const fetchBids = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bids?auction_type=${selectedAuction}`)
      if (res.ok) setBids(await res.json())
    } finally {
      setLoading(false)
    }
  }, [selectedAuction])

  useEffect(() => { fetchBids() }, [fetchBids])

  const confirmAndDeleteBid = useCallback(async (id: string) => {
    await fetch(`/api/bids?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setBids((prev) => prev.filter((b) => b.id !== id))
    setConfirmDelete(null)
  }, [])

  const confirmAndDeleteStudentBids = useCallback(async (studentId: string) => {
    await fetch(
      `/api/bids?student_id=${encodeURIComponent(studentId)}&auction_type=${encodeURIComponent(selectedAuction)}`,
      { method: 'DELETE' }
    )
    setBids((prev) => prev.filter((b) => b.student_id !== studentId))
    setConfirmDelete(null)
  }, [selectedAuction])

  const roundsWithData = Array.from(new Set(bids.map((b) => b.round))).sort((a, b) => a - b)
  const filtered = selectedRound === 'all' ? bids : bids.filter((b) => b.round === selectedRound)

  const handleSortCol = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const sortedFiltered = [...filtered].sort((a, b) => {
    let av: number | string, bv: number | string
    if (sortCol === 'ratio') {
      av = Number(a.private_value) > 0 ? Number(a.amount) / Number(a.private_value) : 0
      bv = Number(b.private_value) > 0 ? Number(b.amount) / Number(b.private_value) : 0
    } else if (sortCol === 'student_id') {
      av = a.student_id; bv = b.student_id
    } else if (sortCol === 'created_at') {
      av = a.created_at; bv = b.created_at
    } else {
      av = Number(a[sortCol]); bv = Number(b[sortCol])
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const winnerMap: Record<number, number> = {}
  for (const r of roundsWithData) {
    const roundBids = bids.filter((b) => b.round === r)
    if (roundBids.length) winnerMap[r] = Math.max(...roundBids.map((b) => b.amount))
  }
  const isWinner = (bid: Bid) => winnerMap[bid.round] !== undefined && bid.amount === winnerMap[bid.round]

  const currentConfig = AUCTION_CONFIGS.find((a) => a.key === selectedAuction)!
  const totalRevenue = roundsWithData.reduce(
    (sum, r) => sum + computeRoundRevenue(bids.filter((b) => b.round === r)), 0
  )
  const avgRevenuePerRound = roundsWithData.length > 0 ? totalRevenue / roundsWithData.length : 0

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const allRows = bids.map((b, i) => ({
      '#': i + 1,
      'Student ID': b.student_id,
      Round: b.round,
      'Private Value': b.private_value,
      'Bid Amount': b.amount,
      'Bid/Value Ratio': b.private_value > 0 ? (b.amount / b.private_value).toFixed(3) : '—',
      Winner: isWinner(b) ? 'YES' : '',
      Time: new Date(b.created_at).toLocaleString(),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), 'All Bids')
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      const rb = bids.filter((b) => b.round === r)
      if (!rb.length) continue
      const sorted = [...rb].sort((a, b) => b.amount - a.amount)
      const rows = sorted.map((b, i) => ({
        Rank: i + 1,
        'Student ID': b.student_id,
        'Private Value': b.private_value,
        'Bid Amount': b.amount,
        'Bid/Value Ratio': b.private_value > 0 ? (b.amount / b.private_value).toFixed(3) : '—',
        Winner: isWinner(b) ? 'YES' : '',
        Time: new Date(b.created_at).toLocaleString(),
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `Round ${r}`)
    }
    XLSX.writeFile(wb, `${selectedAuction}-bids.xlsx`)
  }

  return (
    <div>
      {/* Auction type selector */}
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
          Treatment
        </p>
        <div className="flex flex-wrap gap-2">
          {AUCTION_CONFIGS.map((a) => (
            <button
              key={a.key}
              onClick={() => { setSelectedAuction(a.key); setSelectedRound('all') }}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{
                background: selectedAuction === a.key ? 'var(--navy)' : 'var(--surface)',
                color: selectedAuction === a.key ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${selectedAuction === a.key ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {a.shortTitle}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Total Bids" value={bids.length} />
        <Stat label="Unique Students" value={new Set(bids.map((b) => b.student_id)).size} />
        <Stat label="Rounds Active" value={roundsWithData.length} />
      </div>

      {/* Nash equilibrium + revenue note */}
      <div className="rounded-lg px-4 py-3 mb-6 text-xs"
        style={{ background: 'rgba(0,54,96,0.04)', border: '1px solid rgba(0,54,96,0.1)', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Nash Equilibrium: </span>
        {currentConfig.nashDescription}
        <span className="mx-3" style={{ color: 'rgba(0,54,96,0.25)' }}>|</span>
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Seller Revenue: </span>
        {currentConfig.revenueDescription}
      </div>

      {/* Round filter + actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedRound('all')}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{
              background: selectedRound === 'all' ? 'var(--surface2)' : 'transparent',
              color: selectedRound === 'all' ? 'var(--text)' : 'var(--text-muted)',
              border: `1px solid ${selectedRound === 'all' ? 'var(--navy)' : 'var(--border)'}`,
            }}
          >
            All Rounds
          </button>
          {roundsWithData.map((r) => (
            <button key={r} onClick={() => setSelectedRound(r)}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{
                background: selectedRound === r ? 'var(--surface2)' : 'transparent',
                color: selectedRound === r ? 'var(--text)' : 'var(--text-muted)',
                border: `1px solid ${selectedRound === r ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              Round {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchBids} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button onClick={handleExport} className="btn-gold text-xs px-3 py-1.5 rounded" disabled={bids.length === 0}>
            ⬇ Excel
          </button>
        </div>
      </div>

      {/* Bid table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading bids…' : 'No bids yet for this experiment.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {(
                  [
                    { label: '#', col: null },
                    { label: 'Student ID', col: 'student_id' },
                    { label: 'Round', col: 'round' },
                    { label: 'Private Value', col: 'private_value' },
                    { label: 'Bid Amount', col: 'amount' },
                    { label: 'Bid/Value', col: 'ratio' },
                    { label: 'Time', col: 'created_at' },
                    { label: '', col: null },
                  ] as { label: string; col: SortCol | null }[]
                ).map(({ label, col }) => (
                  <th key={label}
                    className="text-left px-4 py-3 text-xs tracking-wide font-medium select-none"
                    style={{ color: col && sortCol === col ? 'var(--navy)' : 'var(--text-muted)', cursor: col ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                    onClick={() => col && handleSortCol(col)}
                  >
                    {label}
                    {col && sortCol === col && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map((bid, i) => {
                const winner = isWinner(bid)
                const isSilly = Number(bid.amount) > Number(bid.private_value)
                return (
                  <tr key={bid.id}
                    style={{
                      background: isSilly ? 'rgba(251,191,36,0.12)' : winner ? 'rgba(0,54,96,0.04)' : i % 2 === 0 ? '#fff' : 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: winner ? 'var(--navy)' : 'var(--text)', fontWeight: winner ? 500 : 400 }}>
                      {bid.student_id}{winner && <span className="ml-2 text-[10px]">★</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{bid.round}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>${Number(bid.private_value).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: winner ? 'var(--navy)' : 'var(--text)' }}>
                      ${Number(bid.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {bid.private_value > 0 ? (bid.amount / bid.private_value).toFixed(3) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(bid.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {confirmDelete?.type === 'bid' && confirmDelete.id === bid.id ? (
                        <div className="flex gap-1 justify-end items-center">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Delete?</span>
                          <button onClick={() => confirmAndDeleteBid(bid.id)} className="text-[10px] px-2 py-1 rounded" style={{ background: '#b91c1c', color: '#fff' }}>Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>No</button>
                        </div>
                      ) : confirmDelete?.type === 'student' && confirmDelete.studentId === bid.student_id ? (
                        <div className="flex gap-1 justify-end items-center">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Delete all?</span>
                          <button onClick={() => confirmAndDeleteStudentBids(bid.student_id)} className="text-[10px] px-2 py-1 rounded" style={{ background: '#b91c1c', color: '#fff' }}>Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>No</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setConfirmDelete({ type: 'bid', id: bid.id })}
                            className="text-[10px] px-2 py-1 rounded transition-all"
                            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            title="Delete this bid">×</button>
                          <button onClick={() => setConfirmDelete({ type: 'student', studentId: bid.student_id })}
                            className="text-[10px] px-2 py-1 rounded transition-all whitespace-nowrap"
                            style={{ color: '#b91c1c', border: '1px solid #fecaca' }}
                            title={`Delete all bids by ${bid.student_id}`}>× all</button>
                        </div>
                      )}
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
