'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AUCTION_CONFIGS, TOTAL_ROUNDS } from '@/lib/auction-config'
import { EXPERIMENT3_TREATMENTS } from '@/lib/experiment3-config'
import type { Bid, Experiment3Round, RiskAversionResponse } from '@/lib/types'

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

type TabKey = 'auctions' | 'experiment3' | 'assignment2'

export default function InstructorPanel({ userEmail }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('auctions')
  const [selectedAuction, setSelectedAuction] = useState(AUCTION_CONFIGS[0].key)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [bids, setBids] = useState<Bid[]>([])
  const [selectedExperiment3Treatment, setSelectedExperiment3Treatment] = useState(
    EXPERIMENT3_TREATMENTS[0].key
  )
  const [selectedExperiment3Round, setSelectedExperiment3Round] = useState<number | 'all'>('all')
  const [experiment3Rows, setExperiment3Rows] = useState<Experiment3Round[]>([])
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

  const fetchExperiment3Rows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/experiment3/rows?treatment_key=${encodeURIComponent(selectedExperiment3Treatment)}`
      )
      if (res.ok) setExperiment3Rows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [selectedExperiment3Treatment])

  useEffect(() => {
    if (activeTab === 'auctions') fetchBids()
    else if (activeTab === 'experiment3') fetchExperiment3Rows()
    else fetchRaRows()
  }, [activeTab, fetchBids, fetchExperiment3Rows, fetchRaRows])

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
  const experiment3RoundsWithData = Array.from(
    new Set(experiment3Rows.map((row) => row.round_in_treatment))
  ).sort((a, b) => a - b)
  const filteredExperiment3Rows =
    selectedExperiment3Round === 'all'
      ? experiment3Rows
      : experiment3Rows.filter((row) => row.round_in_treatment === selectedExperiment3Round)
  const currentExperiment3Treatment = EXPERIMENT3_TREATMENTS.find(
    (treatment) => treatment.key === selectedExperiment3Treatment
  )!

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

  const handleExperiment3Export = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const allRows = experiment3Rows.map((row, index) => ({
      '#': index + 1,
      'Student ID': row.student_id,
      'Round In Treatment': row.round_in_treatment,
      'Seller Value': row.seller_value,
      'Reserve Price': row.reserve_price,
      'Simulated Bids': row.simulated_bids.map((value) => Number(value).toFixed(2)).join(', '),
      'Highest Bid': row.highest_bid,
      'Second Highest Bid': row.second_highest_bid,
      Sold: row.sold ? 'YES' : 'NO',
      'Sale Price': row.sale_price ?? '—',
      Profit: row.profit,
      Time: new Date(row.created_at).toLocaleString(),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), 'All Rows')

    for (let round = 1; round <= 20; round++) {
      const rowsForRound = experiment3Rows.filter((row) => row.round_in_treatment === round)
      if (!rowsForRound.length) continue
      const roundSheet = rowsForRound.map((row, index) => ({
        '#': index + 1,
        'Student ID': row.student_id,
        'Seller Value': row.seller_value,
        'Reserve Price': row.reserve_price,
        'Simulated Bids': row.simulated_bids.map((value) => Number(value).toFixed(2)).join(', '),
        'Highest Bid': row.highest_bid,
        'Second Highest Bid': row.second_highest_bid,
        Sold: row.sold ? 'YES' : 'NO',
        'Sale Price': row.sale_price ?? '—',
        Profit: row.profit,
        Time: new Date(row.created_at).toLocaleString(),
      }))
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(roundSheet),
        `Round ${round}`
      )
    }

    XLSX.writeFile(wb, `${selectedExperiment3Treatment}-seller-auction.xlsx`)
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
          {(['auctions', 'assignment2', 'experiment3'] as TabKey[]).map((tab) => (
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
              {tab === 'auctions'
                ? 'Experiment 1: Auctions'
                : tab === 'assignment2'
                ? 'Experiment 2: Risk Aversion'
                : 'Experiment 3: Seller Auction'}
            </button>
          ))}
        </div>

        {/* ── Assignment 2 view ── */}
        {activeTab === 'assignment2' && (
          <RiskAversionView rows={raRows} loading={loading} onRefresh={fetchRaRows} />
        )}

        {activeTab === 'experiment3' && (
          <Experiment3View
            rows={filteredExperiment3Rows}
            allRows={experiment3Rows}
            loading={loading}
            treatments={EXPERIMENT3_TREATMENTS}
            selectedTreatmentKey={selectedExperiment3Treatment}
            selectedRound={selectedExperiment3Round}
            currentTreatment={currentExperiment3Treatment}
            roundsWithData={experiment3RoundsWithData}
            onSelectTreatment={(key) => {
              setSelectedExperiment3Treatment(key)
              setSelectedExperiment3Round('all')
            }}
            onSelectRound={setSelectedExperiment3Round}
            onRefresh={fetchExperiment3Rows}
            onExport={handleExperiment3Export}
          />
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

// ── Experiment 3 instructor view ─────────────────────────────────────────────

function Experiment3View({
  rows,
  allRows,
  loading,
  treatments,
  selectedTreatmentKey,
  selectedRound,
  currentTreatment,
  roundsWithData,
  onSelectTreatment,
  onSelectRound,
  onRefresh,
  onExport,
}: {
  rows: Experiment3Round[]
  allRows: Experiment3Round[]
  loading: boolean
  treatments: typeof EXPERIMENT3_TREATMENTS
  selectedTreatmentKey: string
  selectedRound: number | 'all'
  currentTreatment: (typeof EXPERIMENT3_TREATMENTS)[number]
  roundsWithData: number[]
  onSelectTreatment: (key: string) => void
  onSelectRound: (value: number | 'all') => void
  onRefresh: () => void
  onExport: () => void
}) {
  const saleRate =
    allRows.length > 0
      ? allRows.filter((row) => row.sold).length / allRows.length
      : 0
  const averageProfit =
    allRows.length > 0
      ? allRows.reduce((sum, row) => sum + Number(row.profit), 0) / allRows.length
      : 0

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
          Experiment 3 Treatment
        </p>
        <div className="flex flex-wrap gap-2">
          {treatments.map((treatment) => (
            <button
              key={treatment.key}
              onClick={() => onSelectTreatment(treatment.key)}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{
                background: selectedTreatmentKey === treatment.key ? 'var(--navy)' : 'var(--surface)',
                color: selectedTreatmentKey === treatment.key ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${selectedTreatmentKey === treatment.key ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {treatment.shortTitle}
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid grid-cols-4 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Stat label="Total Rows" value={allRows.length} />
        <Stat label="Unique Students" value={new Set(allRows.map((row) => row.student_id)).size} />
        <Stat label="Sale Rate" value={`${(saleRate * 100).toFixed(1)}%`} />
        <Stat label="Avg Profit" value={`$${averageProfit.toFixed(2)}`} />
      </div>

      <div
        className="rounded-lg px-4 py-3 mb-6 text-xs"
        style={{
          background: 'rgba(0,54,96,0.04)',
          border: '1px solid rgba(0,54,96,0.1)',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Treatment Setup: </span>
        {currentTreatment.bidderCount} bidders, seller value {currentTreatment.sellerValue}, 20 rounds.
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onSelectRound('all')}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{
              background: selectedRound === 'all' ? 'var(--surface2)' : 'transparent',
              color: selectedRound === 'all' ? 'var(--text)' : 'var(--text-muted)',
              border: `1px solid ${selectedRound === 'all' ? 'var(--navy)' : 'var(--border)'}`,
            }}
          >
            All Rounds
          </button>
          {roundsWithData.map((round) => (
            <button
              key={round}
              onClick={() => onSelectRound(round)}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{
                background: selectedRound === round ? 'var(--surface2)' : 'transparent',
                color: selectedRound === round ? 'var(--text)' : 'var(--text-muted)',
                border: `1px solid ${selectedRound === round ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              Round {round}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="btn-ghost text-xs px-3 py-1.5 rounded"
            disabled={loading}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button
            onClick={onExport}
            className="btn-gold text-xs px-3 py-1.5 rounded"
            disabled={allRows.length === 0}
          >
            ⬇ Excel
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading rows…' : 'No Experiment 3 rows yet for this treatment.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {[
                  '#',
                  'Student ID',
                  'Round',
                  'Seller Value',
                  'Reserve',
                  'All Bids',
                  'Highest',
                  'Second',
                  'Sold',
                  'Sale Price',
                  'Profit',
                  'Time',
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left px-4 py-3 text-xs tracking-wide font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    background: row.sold ? (index % 2 === 0 ? '#fff' : 'var(--surface)') : 'rgba(239,68,68,0.04)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {index + 1}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>
                    {row.student_id}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                    {row.round_in_treatment}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                    ${Number(row.seller_value).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>
                    ${Number(row.reserve_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.simulated_bids.map((value) => `$${Number(value).toFixed(2)}`).join(', ')}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                    ${Number(row.highest_bid).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                    ${Number(row.second_highest_bid).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                    {row.sold ? 'YES' : 'NO'}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                    {row.sale_price == null ? '—' : `$${Number(row.sale_price).toFixed(2)}`}
                  </td>
                  <td
                    className="px-4 py-2.5 text-xs font-medium"
                    style={{ color: Number(row.profit) >= 0 ? 'var(--navy)' : '#b91c1c' }}
                  >
                    ${Number(row.profit).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(row.created_at).toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
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

function Stat({ label, value }: { label: string; value: number | string }) {
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
