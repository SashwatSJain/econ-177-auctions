'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AUCTION_CONFIGS, TOTAL_ROUNDS } from '@/lib/auction-config'
import type { Bid, RiskAversionResponse } from '@/lib/types'

// ── Risk aversion helpers ────────────────────────────────────────────────────

const RA_C_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90]
const RA_COL_NAMES = ['p_10','p_20','p_30','p_40','p_50','p_60','p_70','p_80','p_90'] as const

function estimateAlpha(row: RiskAversionResponse): number | null {
  let sumXY = 0, sumX2 = 0
  for (let i = 0; i < 9; i++) {
    const p = Number(row[RA_COL_NAMES[i]])
    if (p <= 0) continue
    const x = Math.log(RA_C_VALUES[i] / 100)
    const y = Math.log(p)
    sumXY += x * y
    sumX2 += x * x
  }
  return sumX2 > 0 ? sumXY / sumX2 : null
}

interface Props {
  userEmail: string
}

type TabKey = 'auctions' | 'assignment2'

export default function InstructorPanel({ userEmail }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('auctions')
  const [selectedAuction, setSelectedAuction] = useState(AUCTION_CONFIGS[0].key)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [bids, setBids] = useState<Bid[]>([])
  const [raRows, setRaRows] = useState<RiskAversionResponse[]>([])
  const [loading, setLoading] = useState(false)

  const fetchBids = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bids?auction_type=${selectedAuction}`)
      if (res.ok) setBids(await res.json())
    } finally {
      setLoading(false)
    }
  }, [selectedAuction])

  const fetchRaRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/risk-aversion?raw=true')
      if (res.ok) setRaRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'auctions') fetchBids()
    else fetchRaRows()
  }, [activeTab, fetchBids, fetchRaRows])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/instructor/login')
    router.refresh()
  }

  const roundsWithData = Array.from(new Set(bids.map((b) => b.round))).sort((a, b) => a - b)
  const filtered = selectedRound === 'all' ? bids : bids.filter((b) => b.round === selectedRound)

  const winnerMap: Record<number, number> = {}
  for (const r of roundsWithData) {
    const roundBids = bids.filter((b) => b.round === r)
    if (roundBids.length) {
      winnerMap[r] = Math.max(...roundBids.map((b) => b.amount))
    }
  }

  const isWinner = (bid: Bid) =>
    winnerMap[bid.round] !== undefined && bid.amount === winnerMap[bid.round]

  const currentConfig = AUCTION_CONFIGS.find((a) => a.key === selectedAuction)!

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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--navy)' }}>
            UCSB · Econ 177
          </p>
          <h1 className="text-base font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            Instructor Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {userEmail}
          </span>
          <button
            onClick={handleSignOut}
            className="btn-ghost text-xs px-3 py-1.5 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-8 border-b" style={{ borderColor: 'var(--border)' }}>
          {(['auctions', 'assignment2'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="text-xs tracking-widest uppercase px-4 py-2.5 -mb-px transition-all"
              style={{
                color: activeTab === tab ? 'var(--navy)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--navy)' : '2px solid transparent',
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              {tab === 'auctions' ? 'Auction Experiments' : 'Assignment 2: Risk Aversion'}
            </button>
          ))}
        </div>

        {/* ── Assignment 2 view ── */}
        {activeTab === 'assignment2' && (
          <RiskAversionView rows={raRows} loading={loading} onRefresh={fetchRaRows} />
        )}

        {/* ── Auctions view ── */}
        {activeTab === 'auctions' && <>
        {/* Auction type selector */}
        <div className="mb-6">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
            Experiment
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
        <div
          className="grid grid-cols-3 gap-4 rounded-xl p-4 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Stat label="Total Bids" value={bids.length} />
          <Stat label="Unique Students" value={new Set(bids.map((b) => b.student_id)).size} />
          <Stat label="Rounds Active" value={roundsWithData.length} />
        </div>

        {/* Nash equilibrium note */}
        <div
          className="rounded-lg px-4 py-3 mb-6 text-xs"
          style={{
            background: 'rgba(0,54,96,0.04)',
            border: '1px solid rgba(0,54,96,0.1)',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Nash Equilibrium: </span>
          {currentConfig.nashDescription}
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
              <button
                key={r}
                onClick={() => setSelectedRound(r)}
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
            <button
              onClick={fetchBids}
              className="btn-ghost text-xs px-3 py-1.5 rounded"
              disabled={loading}
            >
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
            <button
              onClick={handleExport}
              className="btn-gold text-xs px-3 py-1.5 rounded"
              disabled={bids.length === 0}
            >
              ⬇ Excel
            </button>
          </div>
        </div>

        {/* Bid table */}
        {filtered.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {loading ? 'Loading bids…' : 'No bids yet for this experiment.'}
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Student ID', 'Round', 'Private Value', 'Bid Amount', 'Bid/Value', 'Time'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs tracking-wide font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((bid, i) => {
                  const winner = isWinner(bid)
                  return (
                    <tr
                      key={bid.id}
                      style={{
                        background: winner
                          ? 'rgba(0,54,96,0.04)'
                          : i % 2 === 0
                          ? '#fff'
                          : 'var(--surface)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {i + 1}
                      </td>
                      <td
                        className="px-4 py-2.5 text-xs"
                        style={{ color: winner ? 'var(--navy)' : 'var(--text)', fontWeight: winner ? 500 : 400 }}
                      >
                        {bid.student_id}
                        {winner && <span className="ml-2 text-[10px]">★</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                        {bid.round}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                        ${Number(bid.private_value).toFixed(2)}
                      </td>
                      <td
                        className="px-4 py-2.5 text-xs font-medium"
                        style={{ color: winner ? 'var(--navy)' : 'var(--text)' }}
                      >
                        ${Number(bid.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {bid.private_value > 0
                          ? (bid.amount / bid.private_value).toFixed(3)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(bid.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        </> /* end auctions tab */}
      </div>
    </div>
  )
}

// ── Risk Aversion instructor view ────────────────────────────────────────────

function RiskAversionView({
  rows,
  loading,
  onRefresh,
}: {
  rows: RiskAversionResponse[]
  loading: boolean
  onRefresh: () => void
}) {
  const classAlpha = (() => {
    let sumXY = 0, sumX2 = 0
    for (const row of rows) {
      for (let i = 0; i < 9; i++) {
        const p = Number(row[RA_COL_NAMES[i]])
        if (p <= 0) continue
        const x = Math.log(RA_C_VALUES[i] / 100)
        const y = Math.log(p)
        sumXY += x * y; sumX2 += x * x
      }
    }
    return sumX2 > 0 ? sumXY / sumX2 : null
  })()

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const sheet1 = rows.map((r) => ({
      'Student ID': r.student_id,
      'p($10)': r.p_10, 'p($20)': r.p_20, 'p($30)': r.p_30,
      'p($40)': r.p_40, 'p($50)': r.p_50, 'p($60)': r.p_60,
      'p($70)': r.p_70, 'p($80)': r.p_80, 'p($90)': r.p_90,
      'p($100)': 1,
      'α (CRRA)': estimateAlpha(r)?.toFixed(4) ?? '—',
      'Submitted': new Date(r.created_at).toLocaleString(),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'Responses')

    // Regression worksheet (y = ln(p), x = ln(C/100))
    const regRows: Record<string, string | number>[] = []
    for (const row of rows) {
      for (let i = 0; i < 9; i++) {
        const p = Number(row[RA_COL_NAMES[i]])
        regRows.push({
          'Student ID': row.student_id,
          'C': RA_C_VALUES[i],
          'y = ln(p)': p > 0 ? +Math.log(p).toFixed(6) : 'N/A',
          'x = ln(C/100)': +Math.log(RA_C_VALUES[i] / 100).toFixed(6),
        })
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regRows), 'Regression Data')

    XLSX.writeFile(wb, 'assignment2-risk-aversion.xlsx')
  }

  return (
    <div>
      {/* Stats */}
      <div
        className="grid grid-cols-3 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Stat label="Submissions" value={rows.length} />
        <Stat label="Unique Students" value={new Set(rows.map((r) => r.student_id)).size} />
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Class α (CRRA)</p>
          <p className="serif text-2xl" style={{ color: 'var(--navy)' }}>
            {classAlpha !== null ? classAlpha.toFixed(3) : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end mb-4">
        <button onClick={onRefresh} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
        <button onClick={handleExport} className="btn-gold text-xs px-3 py-1.5 rounded" disabled={rows.length === 0}>
          ⬇ Excel
        </button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading…' : 'No submissions yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Student ID', '$10', '$20', '$30', '$40', '$50', '$60', '$70', '$80', '$90', '$100', 'α', 'Submitted'].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const alpha = estimateAlpha(row)
                return (
                  <tr
                    key={row.id}
                    style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text)', fontWeight: 500 }}>{row.student_id}</td>
                    {RA_COL_NAMES.map((col) => (
                      <td key={col} className="px-3 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                        {Number(row[col]).toFixed(3)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>1.000</td>
                    <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--navy)' }}>
                      {alpha !== null ? alpha.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="serif text-2xl" style={{ color: 'var(--navy)' }}>
        {value}
      </p>
    </div>
  )
}
