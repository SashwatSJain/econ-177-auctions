'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AUCTION_CONFIGS, TOTAL_ROUNDS } from '@/lib/auction-config'
import { EXPERIMENT3_TREATMENTS } from '@/lib/experiment3-config'
import type { Bid, BetaCVEntry, Experiment3Round, Experiment4Response, RiskAversionResponse } from '@/lib/types'

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

// ── Seller revenue (Experiment 1) ────────────────────────────────────────────

function computeRoundRevenue(roundBids: Bid[]): number {
  return roundBids.reduce((sum, b) => sum + Number(b.amount), 0)
}

// ── Experiment 3 treatment pairing ──────────────────────────────────────────

const PAIRED_TREATMENT: Record<string, string> = {
  'exp3-1': 'exp3-2',
  'exp3-2': 'exp3-1',
  'exp3-3': 'exp3-4',
  'exp3-4': 'exp3-3',
}

interface Props {
  userEmail: string
}

type TabKey = 'auctions' | 'experiment3' | 'assignment2' | 'experiment4' | 'beta_cv'

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
  const [experiment4Rows, setExperiment4Rows] = useState<Experiment4Response[]>([])
  const [betaCVRows, setBetaCVRows] = useState<BetaCVEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [sortCol, setSortCol] = useState<'student_id' | 'round' | 'private_value' | 'amount' | 'ratio' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  // confirmDelete holds either { type: 'bid', id: string } or { type: 'student', studentId: string }
  const [confirmDelete, setConfirmDelete] = useState<
    { type: 'bid'; id: string } | { type: 'student'; studentId: string } | null
  >(null)

  // Cache rows per treatment key so we can load paired treatments without refetching
  const experiment3CacheRef = useRef<Record<string, Experiment3Round[]>>({})

  const fetchTreatmentRows = useCallback(async (key: string): Promise<Experiment3Round[]> => {
    if (experiment3CacheRef.current[key]) return experiment3CacheRef.current[key]
    const res = await fetch(`/api/experiment3/rows?treatment_key=${encodeURIComponent(key)}`)
    if (!res.ok) return []
    const rows: Experiment3Round[] = await res.json()
    experiment3CacheRef.current = { ...experiment3CacheRef.current, [key]: rows }
    return rows
  }, [])

  const fetchBids = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bids?auction_type=${selectedAuction}`)
      if (res.ok) setBids(await res.json())
    } finally {
      setLoading(false)
    }
  }, [selectedAuction])

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

  const fetchRaRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/risk-aversion?raw=true')
      if (res.ok) setRaRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchExperiment4Rows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/experiment4')
      if (res.ok) setExperiment4Rows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const [betaCVVariant, setBetaCVVariant] = useState<'integer' | 'continuous'>('integer')

  const fetchBetaCVRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/beta/cv-auction?variant=${betaCVVariant}`)
      if (res.ok) setBetaCVRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [betaCVVariant])

  const fetchExperiment3Rows = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchTreatmentRows(selectedExperiment3Treatment)
      setExperiment3Rows(rows)
    } finally {
      setLoading(false)
    }
  }, [selectedExperiment3Treatment, fetchTreatmentRows])

  useEffect(() => {
    if (activeTab === 'auctions') fetchBids()
    else if (activeTab === 'experiment3') fetchExperiment3Rows()
    else if (activeTab === 'experiment4') fetchExperiment4Rows()
    else if (activeTab === 'beta_cv') fetchBetaCVRows()
    else fetchRaRows()
  }, [activeTab, fetchBids, fetchExperiment3Rows, fetchExperiment4Rows, fetchRaRows, fetchBetaCVRows])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/instructor/login')
    router.refresh()
  }

  const roundsWithData = Array.from(new Set(bids.map((b) => b.round))).sort((a, b) => a - b)
  const filtered = selectedRound === 'all' ? bids : bids.filter((b) => b.round === selectedRound)

  const handleSortCol = (col: typeof sortCol) => {
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
    if (roundBids.length) {
      winnerMap[r] = Math.max(...roundBids.map((b) => b.amount))
    }
  }

  const isWinner = (bid: Bid) =>
    winnerMap[bid.round] !== undefined && bid.amount === winnerMap[bid.round]

  const currentConfig = AUCTION_CONFIGS.find((a) => a.key === selectedAuction)!

  const totalRevenue = roundsWithData.reduce(
    (sum, r) => sum + computeRoundRevenue(bids.filter((b) => b.round === r)),
    0
  )
  const avgRevenuePerRound = roundsWithData.length > 0 ? totalRevenue / roundsWithData.length : 0
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
        className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
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
          <span className="text-xs hidden sm:block truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {(['auctions', 'assignment2', 'experiment3', 'experiment4', 'beta_cv'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="text-xs tracking-widest uppercase px-3 sm:px-4 py-2.5 -mb-px transition-all whitespace-nowrap flex-shrink-0"
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
                : tab === 'experiment3'
                ? 'Experiment 3: Seller Auction'
                : tab === 'experiment4'
                ? 'Experiment 4: Jar of Kernels'
                : 'Beta: Oil Well'}
            </button>
          ))}
        </div>

        {/* ── Beta: CV Auction view ── */}
        {activeTab === 'beta_cv' && (
          <BetaCVView
            rows={betaCVRows}
            loading={loading}
            variant={betaCVVariant}
            onVariantChange={(v) => { setBetaCVVariant(v); setBetaCVRows([]) }}
            onRefresh={fetchBetaCVRows}
          />
        )}

        {/* ── Experiment 4 view ── */}
        {activeTab === 'experiment4' && (
          <Experiment4View rows={experiment4Rows} loading={loading} onRefresh={fetchExperiment4Rows} />
        )}

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
            onFetchTreatment={fetchTreatmentRows}
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
          className="grid grid-cols-4 gap-4 rounded-xl p-4 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Stat label="Total Bids" value={bids.length} />
          <Stat label="Unique Students" value={new Set(bids.map((b) => b.student_id)).size} />
          <Stat label="Rounds Active" value={roundsWithData.length} />
          <Stat label="Avg Rev / Round" value={`$${avgRevenuePerRound.toFixed(2)}`} />
        </div>

        {/* Nash equilibrium + revenue note */}
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
                    ] as { label: string; col: typeof sortCol | null }[]
                  ).map(({ label, col }) => (
                    <th
                      key={label}
                      className="text-left px-4 py-3 text-xs tracking-wide font-medium select-none"
                      style={{ color: col && sortCol === col ? 'var(--navy)' : 'var(--text-muted)', cursor: col ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      onClick={() => col && handleSortCol(col)}
                    >
                      {label}
                      {col && sortCol === col && (
                        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((bid, i) => {
                  const winner = isWinner(bid)
                  const isSilly = Number(bid.amount) > Number(bid.private_value)
                  return (
                    <tr
                      key={bid.id}
                      style={{
                        background: isSilly
                          ? 'rgba(251,191,36,0.12)'
                          : winner
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
                      <td className="px-4 py-2.5 text-xs" style={{ color: winner ? 'var(--navy)' : 'var(--text)', fontWeight: winner ? 500 : 400 }}>
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
                      <td className="px-4 py-2.5 text-xs">
                        {confirmDelete?.type === 'bid' && confirmDelete.id === bid.id ? (
                          <div className="flex gap-1 justify-end items-center">
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Delete?</span>
                            <button
                              onClick={() => confirmAndDeleteBid(bid.id)}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ background: '#b91c1c', color: '#fff' }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            >
                              No
                            </button>
                          </div>
                        ) : confirmDelete?.type === 'student' && confirmDelete.studentId === bid.student_id ? (
                          <div className="flex gap-1 justify-end items-center">
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Delete all?</span>
                            <button
                              onClick={() => confirmAndDeleteStudentBids(bid.student_id)}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ background: '#b91c1c', color: '#fff' }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setConfirmDelete({ type: 'bid', id: bid.id })}
                              className="text-[10px] px-2 py-1 rounded transition-all"
                              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                              title="Delete this bid"
                            >
                              ×
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: 'student', studentId: bid.student_id })}
                              className="text-[10px] px-2 py-1 rounded transition-all whitespace-nowrap"
                              style={{ color: '#b91c1c', border: '1px solid #fecaca' }}
                              title={`Delete all bids by ${bid.student_id}`}
                            >
                              × all
                            </button>
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
        </> /* end auctions tab */}
      </div>
    </div>
  )
}

// ── Experiment 3 charts ──────────────────────────────────────────────────────

type ChartProps = {
  data: { x: number; y: number }[]
  yLabel: string
  color: string
  yMin?: number
  yMax?: number
  referenceLine?: number
  referenceLabel?: string
  formatY?: (v: number) => string
}

function Exp3LineChart({
  data,
  yLabel,
  color,
  yMin,
  yMax,
  referenceLine,
  referenceLabel,
  formatY = (v) => v.toFixed(1),
}: ChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 480
  const H = 200
  const PAD = { top: 20, right: 56, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ height: `${H}px`, background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const xs = data.map((d) => d.x)
  const ys = data.map((d) => d.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const rawYMin = yMin ?? Math.min(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const rawYMax = yMax ?? Math.max(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const yPadding = (rawYMax - rawYMin) * 0.12 || 5
  const computedYMin = rawYMin - yPadding
  const computedYMax = rawYMax + yPadding

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW
  const sy = (y: number) =>
    PAD.top + (1 - (y - computedYMin) / (computedYMax - computedYMin || 1)) * innerH

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    let bestDist = Infinity
    data.forEach((d, i) => {
      const dist = Math.abs(sx(d.x) - mouseX)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    setHoveredIdx(best)
  }

  const polyPoints = data.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ')
  const yTicks = 4
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    computedYMin + (i / yTicks) * (computedYMax - computedYMin)
  )
  const xLabelSet = new Set([1, 5, 10, 15, 20])

  const hovered = hoveredIdx != null ? data[hoveredIdx] : null

  // Clamp tooltip box so it stays inside the plot area
  const TW = 72
  const TH = 34
  const tooltipX = hovered
    ? Math.min(Math.max(sx(hovered.x) - TW / 2, PAD.left), PAD.left + innerW - TW)
    : 0
  const tooltipY = hovered
    ? sy(hovered.y) - TH - 10 < PAD.top
      ? sy(hovered.y) + 10
      : sy(hovered.y) - TH - 10
    : 0

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ display: 'block', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {/* Grid lines */}
      {yTickVals.map((v, i) => (
        <line key={i} x1={PAD.left} y1={sy(v)} x2={PAD.left + innerW} y2={sy(v)}
          stroke="var(--border)" strokeWidth={1} />
      ))}
      {/* Y axis tick labels */}
      {yTickVals.map((v, i) => (
        <text key={i} x={PAD.left - 5} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
          {formatY(v)}
        </text>
      ))}
      {/* X axis tick labels */}
      {xs.map((x) =>
        xLabelSet.has(x) || xs.length <= 5 ? (
          <text key={x} x={sx(x)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
            {x}
          </text>
        ) : null
      )}
      {/* Reference line */}
      {referenceLine != null && (
        <>
          <line x1={PAD.left} y1={sy(referenceLine)} x2={PAD.left + innerW} y2={sy(referenceLine)}
            stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" />
          {referenceLabel && (
            <text x={PAD.left + innerW + 4} y={sy(referenceLine) + 4}
              fontSize={8} fill="var(--gold)" fontWeight={600}>
              {referenceLabel}
            </text>
          )}
        </>
      )}
      {/* Hover crosshair */}
      {hovered && (
        <line x1={sx(hovered.x)} y1={PAD.top} x2={sx(hovered.x)} y2={PAD.top + innerH}
          stroke={color} strokeWidth={1} strokeOpacity={0.25} strokeDasharray="3 2" />
      )}
      {/* Data line */}
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Data point dots — grow on hover */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={sx(d.x)} cy={sy(d.y)}
          r={hoveredIdx === i ? 5 : 3}
          fill={hoveredIdx === i ? '#fff' : color}
          stroke={color}
          strokeWidth={hoveredIdx === i ? 2 : 0}
        />
      ))}
      {/* Y axis label */}
      <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)"
        transform={`rotate(-90, 10, ${H / 2})`}>
        {yLabel}
      </text>
      {/* X axis label */}
      <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
        Round
      </text>
      {/* Tooltip */}
      {hovered && (
        <g>
          <rect x={tooltipX} y={tooltipY} width={TW} height={TH} rx={4}
            fill="var(--navy)" opacity={0.93} />
          <text x={tooltipX + TW / 2} y={tooltipY + 13} textAnchor="middle"
            fontSize={8.5} fill="rgba(255,255,255,0.75)">
            Round {hovered.x}
          </text>
          <text x={tooltipX + TW / 2} y={tooltipY + 26} textAnchor="middle"
            fontSize={10} fontWeight={600} fill="#fff">
            {formatY(hovered.y)}
          </text>
        </g>
      )}
    </svg>
  )
}

type DualChartProps = {
  dataA: { x: number; y: number }[]
  dataB: { x: number; y: number }[]
  labelA: string
  labelB: string
  yLabel: string
  referenceLine?: number
  referenceLabel?: string
  formatY?: (v: number) => string
}

function Exp3DualLineChart({
  dataA,
  dataB,
  labelA,
  labelB,
  yLabel,
  referenceLine,
  referenceLabel,
  formatY = (v) => v.toFixed(1),
}: DualChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [hoveredSet, setHoveredSet] = useState<'A' | 'B' | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 640
  const H = 240
  const PAD = { top: 24, right: 72, bottom: 36, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allData = [...dataA, ...dataB]
  if (allData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg"
        style={{ height: `${H}px`, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const xs = allData.map((d) => d.x)
  const ys = allData.map((d) => d.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const rawYMin = Math.min(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const rawYMax = Math.max(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const yPadding = (rawYMax - rawYMin) * 0.14 || 5
  const computedYMin = rawYMin - yPadding
  const computedYMax = rawYMax + yPadding

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW
  const sy = (y: number) => PAD.top + (1 - (y - computedYMin) / (computedYMax - computedYMin || 1)) * innerH

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    const mouseY = ((e.clientY - rect.top) / rect.height) * H

    let bestA = 0, bestDistA = Infinity
    dataA.forEach((d, i) => {
      const dist = Math.hypot(sx(d.x) - mouseX, sy(d.y) - mouseY)
      if (dist < bestDistA) { bestDistA = dist; bestA = i }
    })
    let bestB = 0, bestDistB = Infinity
    dataB.forEach((d, i) => {
      const dist = Math.hypot(sx(d.x) - mouseX, sy(d.y) - mouseY)
      if (dist < bestDistB) { bestDistB = dist; bestB = i }
    })
    if (bestDistA <= bestDistB) { setHoveredSet('A'); setHoveredIdx(bestA) }
    else { setHoveredSet('B'); setHoveredIdx(bestB) }
  }

  const polyA = dataA.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ')
  const polyB = dataB.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ')
  const yTicks = 4
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    computedYMin + (i / yTicks) * (computedYMax - computedYMin)
  )
  const xLabelSet = new Set([1, 5, 10, 15, 20])

  const hovered = hoveredIdx != null && hoveredSet
    ? (hoveredSet === 'A' ? dataA[hoveredIdx] : dataB[hoveredIdx])
    : null
  // Short label for tooltip: just the "Exp 3.x" prefix before the first " · "
  const shortLabelA = labelA.split(' · ')[0]
  const shortLabelB = labelB.split(' · ')[0]
  const hoveredShortLabel = hoveredSet === 'A' ? shortLabelA : shortLabelB

  const TW = 80
  const TH = 36
  const tooltipX = hovered
    ? Math.min(Math.max(sx(hovered.x) - TW / 2, PAD.left), PAD.left + innerW - TW)
    : 0
  const tooltipY = hovered
    ? sy(hovered.y) - TH - 10 < PAD.top
      ? sy(hovered.y) + 10
      : sy(hovered.y) - TH - 10
    : 0

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredIdx(null); setHoveredSet(null) }}
      >
        {/* Grid lines */}
        {yTickVals.map((v, i) => (
          <line key={i} x1={PAD.left} y1={sy(v)} x2={PAD.left + innerW} y2={sy(v)}
            stroke="var(--border)" strokeWidth={1} />
        ))}
        {/* Y axis tick labels */}
        {yTickVals.map((v, i) => (
          <text key={i} x={PAD.left - 5} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
            {formatY(v)}
          </text>
        ))}
        {/* X axis tick labels */}
        {Array.from(new Set([...dataA.map(d => d.x), ...dataB.map(d => d.x)])).map((x) =>
          xLabelSet.has(x) ? (
            <text key={x} x={sx(x)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {x}
            </text>
          ) : null
        )}
        {/* Reference line */}
        {referenceLine != null && (
          <>
            <line x1={PAD.left} y1={sy(referenceLine)} x2={PAD.left + innerW} y2={sy(referenceLine)}
              stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" />
            {referenceLabel && (
              <text x={PAD.left + innerW + 4} y={sy(referenceLine) + 4}
                fontSize={8} fill="var(--gold)" fontWeight={600}>
                {referenceLabel}
              </text>
            )}
          </>
        )}
        {/* Lines */}
        <polyline points={polyA} fill="none" stroke="var(--navy)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polyB} fill="none" stroke="var(--gold)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots A */}
        {dataA.map((d, i) => (
          <circle key={`a${i}`} cx={sx(d.x)} cy={sy(d.y)}
            r={hoveredSet === 'A' && hoveredIdx === i ? 5 : 3}
            fill={hoveredSet === 'A' && hoveredIdx === i ? '#fff' : 'var(--navy)'}
            stroke="var(--navy)" strokeWidth={hoveredSet === 'A' && hoveredIdx === i ? 2 : 0} />
        ))}
        {/* Dots B */}
        {dataB.map((d, i) => (
          <circle key={`b${i}`} cx={sx(d.x)} cy={sy(d.y)}
            r={hoveredSet === 'B' && hoveredIdx === i ? 5 : 3}
            fill={hoveredSet === 'B' && hoveredIdx === i ? '#fff' : 'var(--gold)'}
            stroke="var(--gold)" strokeWidth={hoveredSet === 'B' && hoveredIdx === i ? 2 : 0} />
        ))}
        {/* Y axis label */}
        <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)"
          transform={`rotate(-90, 10, ${H / 2})`}>
          {yLabel}
        </text>
        {/* X axis label */}
        <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
          Round
        </text>
        {/* Tooltip */}
        {hovered && (
          <g>
            <rect x={tooltipX} y={tooltipY} width={TW} height={TH} rx={4}
              fill="var(--navy)" opacity={0.93} />
            <text x={tooltipX + TW / 2} y={tooltipY + 12} textAnchor="middle"
              fontSize={8} fill="rgba(255,255,255,0.65)">
              {hoveredShortLabel} · R{hovered.x}
            </text>
            <text x={tooltipX + TW / 2} y={tooltipY + 27} textAnchor="middle"
              fontSize={11} fontWeight={600} fill="#fff">
              {formatY(hovered.y)}
            </text>
          </g>
        )}
      </svg>
      {/* HTML legend — avoids SVG text-width estimation problems */}
      <div className="flex items-center gap-5 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--navy)', flexShrink: 0 }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{labelA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{labelB}</span>
        </div>
      </div>
    </div>
  )
}

function Experiment3Charts({
  allRows,
  sellerValue,
  currentLabel,
  pairedLabel,
  onGetPairedReserveData,
}: {
  allRows: Experiment3Round[]
  sellerValue: number
  currentLabel: string
  pairedLabel: string
  onGetPairedReserveData: () => Promise<{ x: number; y: number }[]>
}) {
  type FullscreenState = (ChartProps & { title: string }) | null
  const [fullscreen, setFullscreen] = useState<FullscreenState>(null)
  const [showCombined, setShowCombined] = useState(false)
  const [pairedReserveData, setPairedReserveData] = useState<{ x: number; y: number }[] | null>(null)
  const [loadingPaired, setLoadingPaired] = useState(false)

  // Reset paired data when the paired treatment changes (i.e. user switches treatment)
  useEffect(() => {
    setPairedReserveData(null)
    setShowCombined(false)
  }, [onGetPairedReserveData])

  const handleShowCombined = async () => {
    if (pairedReserveData === null) {
      setLoadingPaired(true)
      const data = await onGetPairedReserveData()
      setPairedReserveData(data)
      setLoadingPaired(false)
    }
    setShowCombined(true)
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFullscreen(null); setShowCombined(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const byRound = new Map<number, Experiment3Round[]>()
  for (const row of allRows) {
    const r = row.round_in_treatment
    if (!byRound.has(r)) byRound.set(r, [])
    byRound.get(r)!.push(row)
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b)

  const reserveData = rounds.map((r) => {
    const g = byRound.get(r)!
    return { x: r, y: g.reduce((s, row) => s + Number(row.reserve_price), 0) / g.length }
  })
  const profitData = rounds.map((r) => {
    const g = byRound.get(r)!
    return { x: r, y: g.reduce((s, row) => s + Number(row.profit), 0) / g.length }
  })
  const saleRateData = rounds.map((r) => {
    const g = byRound.get(r)!
    return { x: r, y: (g.filter((row) => row.sold).length / g.length) * 100 }
  })

  const optimalReserve = (100 + sellerValue) / 2

  const charts: (ChartProps & { title: string })[] = [
    {
      title: 'Avg Reserve Price',
      data: reserveData,
      yLabel: 'Reserve ($)',
      color: 'var(--navy)',
      referenceLine: optimalReserve,
      referenceLabel: `r*=${optimalReserve}`,
      formatY: (v) => `$${v.toFixed(0)}`,
    },
    {
      title: 'Avg Profit per Round',
      data: profitData,
      yLabel: 'Profit ($)',
      color: 'var(--navy)',
      formatY: (v) => `$${v.toFixed(1)}`,
    },
    {
      title: 'Sale Rate per Round',
      data: saleRateData,
      yLabel: 'Sale Rate (%)',
      color: 'var(--navy)',
      yMin: 40,
      yMax: 100,
      formatY: (v) => `${v.toFixed(0)}%`,
    },
  ]

  if (allRows.length === 0) return null

  return (
    <>
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
          Charts (per-round class averages)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {charts.map((chart) => (
            <div
              key={chart.title}
              className="rounded-xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                  {chart.title}
                </p>
                <div className="flex items-center gap-1">
                  {chart.title === 'Avg Reserve Price' && (
                    <button
                      onClick={handleShowCombined}
                      disabled={loadingPaired}
                      title="Show both treatments together"
                      className="rounded transition-colors text-xs"
                      style={{
                        color: 'var(--text-muted)',
                        padding: '2px 6px',
                        fontSize: '10px',
                        lineHeight: 1.4,
                        background: 'transparent',
                        border: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--navy)'
                        e.currentTarget.style.color = 'var(--navy)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }}
                    >
                      {loadingPaired ? '…' : 'Show Together'}
                    </button>
                  )}
                  <button
                    onClick={() => setFullscreen(chart)}
                    title="Fullscreen"
                    className="rounded transition-colors"
                    style={{
                      color: 'var(--text-muted)',
                      padding: '2px 4px',
                      fontSize: '11px',
                      lineHeight: 1,
                      background: 'transparent',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--navy)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    ⛶
                  </button>
                </div>
              </div>
              <Exp3LineChart {...chart} />
            </div>
          ))}
        </div>
      </div>

      {/* Combined overlay */}
      {showCombined && pairedReserveData !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowCombined(false)}
        >
          <div
            className="rounded-2xl p-6"
            style={{
              background: '#fff',
              width: '90vw',
              maxWidth: '900px',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                Avg Reserve Price — Combined
              </p>
              <button
                onClick={() => setShowCombined(false)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                ✕ Close
              </button>
            </div>
            <Exp3DualLineChart
              dataA={reserveData}
              dataB={pairedReserveData}
              labelA={currentLabel}
              labelB={pairedLabel}
              yLabel="Reserve ($)"
              referenceLine={optimalReserve}
              referenceLabel={`r*=${optimalReserve}`}
              formatY={(v) => `$${v.toFixed(0)}`}
            />
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
              Press Esc or click outside to close
            </p>
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setFullscreen(null)}
        >
          <div
            className="rounded-2xl p-6"
            style={{
              background: '#fff',
              width: '90vw',
              maxWidth: '1100px',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                {fullscreen.title}
              </p>
              <button
                onClick={() => setFullscreen(null)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                ✕ Close
              </button>
            </div>
            <Exp3LineChart {...fullscreen} />
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
              Press Esc or click outside to close
            </p>
          </div>
        </div>
      )}
    </>
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
  onFetchTreatment,
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
  onFetchTreatment: (key: string) => Promise<Experiment3Round[]>
}) {
  const pairedKey = PAIRED_TREATMENT[selectedTreatmentKey]
  const pairedTreatment = EXPERIMENT3_TREATMENTS.find((t) => t.key === pairedKey)!

  const getReserveData = (treatmentRows: Experiment3Round[]) => {
    const byRound = new Map<number, Experiment3Round[]>()
    for (const row of treatmentRows) {
      const r = row.round_in_treatment
      if (!byRound.has(r)) byRound.set(r, [])
      byRound.get(r)!.push(row)
    }
    const rds = Array.from(byRound.keys()).sort((a, b) => a - b)
    return rds.map((r) => {
      const g = byRound.get(r)!
      return { x: r, y: g.reduce((s, row) => s + Number(row.reserve_price), 0) / g.length }
    })
  }

  const onGetPairedReserveData = useCallback(async () => {
    const rows = await onFetchTreatment(pairedKey)
    return getReserveData(rows)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairedKey, onFetchTreatment])
  const saleRate =
    allRows.length > 0
      ? allRows.filter((row) => row.sold).length / allRows.length
      : 0
  const averageProfit =
    allRows.length > 0
      ? allRows.reduce((sum, row) => sum + Number(row.profit), 0) / allRows.length
      : 0

  const profitByStudent = new Map<string, number>()
  for (const row of allRows) {
    profitByStudent.set(
      row.student_id,
      (profitByStudent.get(row.student_id) ?? 0) + Number(row.profit)
    )
  }
  const studentProfits = Array.from(profitByStudent.entries())
  const topEarner =
    studentProfits.length > 0
      ? studentProfits.reduce((a, b) => (b[1] > a[1] ? b : a))
      : null
  const bottomEarner =
    studentProfits.length > 0
      ? studentProfits.reduce((a, b) => (b[1] < a[1] ? b : a))
      : null

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
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Stat label="Total Rows" value={allRows.length} />
        <Stat label="Unique Students" value={new Set(allRows.map((row) => row.student_id)).size} />
        <Stat label="Sale Rate" value={`${(saleRate * 100).toFixed(1)}%`} />
        <Stat label="Avg Profit" value={`$${averageProfit.toFixed(2)}`} />
        {topEarner && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Most Profit</p>
            <p className="serif text-2xl" style={{ color: 'var(--navy)' }}>${topEarner[1].toFixed(2)}</p>
            <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-muted)' }}>{topEarner[0]}</p>
          </div>
        )}
        {bottomEarner && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Least Profit</p>
            <p className="serif text-2xl" style={{ color: bottomEarner[1] < 0 ? '#b91c1c' : 'var(--navy)' }}>${bottomEarner[1].toFixed(2)}</p>
            <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-muted)' }}>{bottomEarner[0]}</p>
          </div>
        )}
      </div>

      <Experiment3Charts
        allRows={allRows}
        sellerValue={currentTreatment.sellerValue}
        currentLabel={currentTreatment.shortTitle}
        pairedLabel={pairedTreatment.shortTitle}
        onGetPairedReserveData={onGetPairedReserveData}
      />

      <div
        className="rounded-lg px-4 py-3 mb-6 text-xs"
        style={{
          background: 'rgba(0,54,96,0.04)',
          border: '1px solid rgba(0,54,96,0.1)',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Treatment Setup: </span>
        {currentTreatment.bidderCount} bidders, seller value {currentTreatment.sellerValue}, 20 rounds. Optimal reserve: ${(100 + currentTreatment.sellerValue) / 2}.
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

// ── Experiment 4 charts ──────────────────────────────────────────────────────

function filterExp4Outliers(data: { id: string; x: number; y: number }[]) {
  if (data.length < 4) return data
  const fence = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b)
    const q1 = s[Math.floor(s.length * 0.25)]
    const q3 = s[Math.floor(s.length * 0.75)]
    const iqr = q3 - q1
    return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr }
  }
  const { lo: xLo, hi: xHi } = fence(data.map((d) => d.x))
  const { lo: yLo, hi: yHi } = fence(data.map((d) => d.y))
  return data.filter((d) => d.x >= xLo && d.x <= xHi && d.y >= yLo && d.y <= yHi)
}

function Exp4ScatterChart({ data }: { data: { x: number; y: number; id: string }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 320; const H = 260
  const PAD = { top: 20, right: 16, bottom: 40, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg"
        style={{ height: `${H}px`, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.x, d.y))) * 1.08 || 100
  const sx = (v: number) => PAD.left + (v / maxVal) * innerW
  const sy = (v: number) => PAD.top + (1 - v / maxVal) * innerH

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * W
    const my = ((e.clientY - rect.top) / rect.height) * H
    let best = 0, bestDist = Infinity
    data.forEach((d, i) => {
      const dist = Math.hypot(sx(d.x) - mx, sy(d.y) - my)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    setHoveredIdx(best)
  }

  const ticks = Array.from({ length: 5 }, (_, i) => (i / 4) * maxVal)
  const hov = hoveredIdx != null ? data[hoveredIdx] : null
  const TW = 96; const TH = 44
  const tooltipX = hov ? Math.min(Math.max(sx(hov.x) - TW / 2, PAD.left), PAD.left + innerW - TW) : 0
  const tooltipY = hov ? (sy(hov.y) - TH - 8 < PAD.top ? sy(hov.y) + 8 : sy(hov.y) - TH - 8) : 0

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
      style={{ display: 'block', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
      {/* Grid */}
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={sy(v)} x2={PAD.left + innerW} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
          <line x1={sx(v)} y1={PAD.top} x2={sx(v)} y2={PAD.top + innerH} stroke="var(--border)" strokeWidth={1} />
        </g>
      ))}
      {/* Y tick labels */}
      {ticks.map((v, i) => (
        <text key={i} x={PAD.left - 5} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
          {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
        </text>
      ))}
      {/* X tick labels */}
      {ticks.map((v, i) => (
        <text key={i} x={sx(v)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
          {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
        </text>
      ))}
      {/* 45° reference: bid = estimate */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(maxVal * 0.96)} y2={sy(maxVal * 0.96)}
        stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={sx(maxVal * 0.96) + 2} y={sy(maxVal * 0.96) - 4} fontSize={8} fill="var(--gold)" fontWeight={600}>
        bid=est
      </text>
      {/* Hover crosshair */}
      {hov && (
        <line x1={sx(hov.x)} y1={PAD.top} x2={sx(hov.x)} y2={PAD.top + innerH}
          stroke="var(--navy)" strokeWidth={1} strokeOpacity={0.2} strokeDasharray="3 2" />
      )}
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.x)} cy={sy(d.y)}
          r={hoveredIdx === i ? 5 : 3}
          fill={hoveredIdx === i ? '#fff' : 'var(--navy)'}
          stroke="var(--navy)"
          strokeWidth={hoveredIdx === i ? 2 : 0}
          opacity={hoveredIdx === i ? 1 : 0.65}
        />
      ))}
      {/* Axis labels */}
      <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)"
        transform={`rotate(-90, 10, ${H / 2})`}>
        Bid ($)
      </text>
      <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
        Estimate ($)
      </text>
      {/* Tooltip */}
      {hov && (
        <g>
          <rect x={tooltipX} y={tooltipY} width={TW} height={TH} rx={4} fill="var(--navy)" opacity={0.93} />
          <text x={tooltipX + TW / 2} y={tooltipY + 12} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.6)">
            {hov.id}
          </text>
          <text x={tooltipX + TW / 2} y={tooltipY + 23} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.8)">
            est: {hov.x.toLocaleString()}  bid: ${hov.y.toFixed(0)}
          </text>
          <text x={tooltipX + TW / 2} y={tooltipY + 36} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#fff">
            ratio: {hov.x > 0 ? (hov.y / hov.x).toFixed(3) : '—'}
          </text>
        </g>
      )}
    </svg>
  )
}

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

  const chartBody = (
    <>
      <div className="flex gap-1 mb-3">
        {EXP4_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--navy)' : 'var(--surface2)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${activeTab === tab.key ? 'var(--navy)' : 'var(--border)'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Exp4ScatterChart data={data} />
    </>
  )

  const headerActions = (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setNoOutliers((v) => !v)}
        className="rounded transition-colors"
        style={{
          color: noOutliers ? 'var(--navy)' : 'var(--text-muted)',
          padding: '2px 6px',
          fontSize: '10px',
          lineHeight: 1.4,
          background: 'transparent',
          border: `1px solid ${noOutliers ? 'var(--navy)' : 'var(--border)'}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)' }}
        onMouseLeave={(e) => {
          if (!noOutliers) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }
        }}
      >
        {noOutliers ? `Outliers hidden (${hiddenCount})` : 'Remove outliers'}
      </button>
      <button
        onClick={() => setFullscreen(true)}
        title="Fullscreen"
        className="rounded transition-colors"
        style={{ color: 'var(--text-muted)', padding: '2px 4px', fontSize: '11px', lineHeight: 1, background: 'transparent', border: '1px solid transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--navy)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        ⛶
      </button>
    </div>
  )

  return (
    <div className="mb-6">
      <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
        Charts
      </p>
      <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Estimate vs Bid</p>
          {headerActions}
        </div>
        {chartBody}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setFullscreen(false)}
        >
          <div
            className="rounded-2xl p-6"
            style={{ background: '#fff', width: '90vw', maxWidth: '1100px', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>Estimate vs Bid</p>
              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  onClick={() => setFullscreen(false)}
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
            {chartBody}
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
              Press Esc or click outside to close
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Experiment 4 instructor view ─────────────────────────────────────────────

function Experiment4View({
  rows,
  loading,
  onRefresh,
}: {
  rows: Experiment4Response[]
  loading: boolean
  onRefresh: () => void
}) {
  const avg = (fn: (r: Experiment4Response) => number) =>
    rows.length > 0 ? rows.reduce((s, r) => s + fn(r), 0) / rows.length : null

  const avgEstimate = avg((r) => Number(r.estimate))
  const avgBid2 = avg((r) => Number(r.bid_2))
  const avgBid10 = avg((r) => Number(r.bid_10))
  const avgBid100 = avg((r) => Number(r.bid_100))

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

  const fmt = (v: number | null) => (v == null ? '—' : v.toFixed(1))

  return (
    <div>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Stat label="Submissions" value={rows.length} />
        <Stat label="Avg Estimate" value={fmt(avgEstimate)} />
        <Stat label="Avg Bid · 1 Bidder" value={avgBid2 != null ? `$${fmt(avgBid2)}` : '—'} />
        <Stat label="Avg Bid · 10 Bidders" value={avgBid10 != null ? `$${fmt(avgBid10)}` : '—'} />
        <Stat label="Avg Bid · 100 Bidders" value={avgBid100 != null ? `$${fmt(avgBid100)}` : '—'} />
      </div>

      <Experiment4Charts rows={rows} />

      <div className="flex gap-2 justify-end mb-4">
        <button onClick={onRefresh} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
        <button onClick={handleExport} className="btn-gold text-xs px-3 py-1.5 rounded" disabled={rows.length === 0}>
          ⬇ Excel
        </button>
      </div>

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
          <table className="w-full text-sm" style={{ minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Student ID', 'Estimate', 'Bid · 1 Bidder', 'Bid · 10 Bidders', 'Bid · 100 Bidders', 'Submitted'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{row.student_id}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{Number(row.estimate).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>${Number(row.bid_2).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>${Number(row.bid_10).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>${Number(row.bid_100).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

// ── Beta: CV Auction instructor view ─────────────────────────────────────────

function fmtBid(n: number, variant: 'integer' | 'continuous') {
  return variant === 'continuous' ? `$${Number(n).toFixed(2)}` : `$${Number(n)}`
}

function BetaCVView({
  rows,
  loading,
  variant,
  onVariantChange,
  onRefresh,
}: {
  rows: BetaCVEntry[]
  loading: boolean
  variant: 'integer' | 'continuous'
  onVariantChange: (v: 'integer' | 'continuous') => void
  onRefresh: () => void
}) {
  const [pairing, setPairing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const submitted = rows.filter((r) => r.bid !== null)
  const pairedRows = rows.filter((r) => r.pair_id !== null)
  const unpairedSubmitted = submitted.filter((r) => r.pair_id === null)
  const notSubmitted = rows.filter((r) => r.bid === null)

  // Group paired rows by pair_id → [{a, b}]
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

  // Aggregate stats from completed pairs
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
    setPairing(true)
    setActionMsg('')
    try {
      const res = await fetch('/api/beta/cv-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      })
      const json = await res.json()
      setActionMsg(`Paired ${json.paired} students. ${json.unpaired} left without a pair.`)
      await onRefresh()
    } catch {
      setActionMsg('Error pairing. Please try again.')
    } finally {
      setPairing(false)
    }
  }

  async function handleReset() {
    if (!confirm(`Delete all Oil Well (${variant}) entries? This cannot be undone.`)) return
    setResetting(true)
    setActionMsg('')
    try {
      await fetch(`/api/beta/cv-auction?variant=${variant}`, { method: 'DELETE' })
      setActionMsg('Session reset.')
      await onRefresh()
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
          <button
            key={v}
            onClick={() => onVariantChange(v)}
            className="text-xs px-3 py-1.5 rounded transition-all capitalize"
            style={{
              background: variant === v ? 'var(--navy)' : 'var(--surface)',
              color: variant === v ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${variant === v ? 'var(--navy)' : 'var(--border)'}`,
            }}
          >
            {v === 'integer' ? 'Integer Bids' : 'Continuous Bids'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
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
          <button
            onClick={handlePairAll}
            className="btn-gold text-xs px-3 py-1.5 rounded"
            disabled={pairing || unpairedSubmitted.length === 0}
          >
            {pairing ? 'Pairing…' : `Pair All (${unpairedSubmitted.length} waiting)`}
          </button>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded transition-all"
            disabled={resetting || rows.length === 0}
            style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626' }}
          >
            {resetting ? 'Resetting…' : 'Reset Session'}
          </button>
          {actionMsg && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{actionMsg}</span>
          )}
        </div>
        <button onClick={onRefresh} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading
              ? 'Loading…'
              : `No students have joined yet. Share /beta/${variant} with your class.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Paired results ── */}
          {pairs.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Paired Results ({pairs.length} pair{pairs.length !== 1 ? 's' : ''})
              </p>
              <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ minWidth: '680px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Pair', 'Student', 'Half Value', 'Bid', 'V', 'Outcome', 'Profit'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
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

                      const rowA = (
                        <tr
                          key={a.id}
                          style={{
                            background: bothBid && winnerIsA ? 'rgba(0,54,96,0.05)' : bothBg,
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <td className="px-4 py-2.5 text-xs font-mono" rowSpan={2}
                            style={{ color: 'var(--text-muted)', fontSize: '10px', borderRight: '3px solid var(--navy)', verticalAlign: 'middle' }}>
                            {pairIdx + 1}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)', fontWeight: winnerIsA ? 600 : 400 }}>
                            {a.student_id}
                            {bothBid && winnerIsA && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>★ winner</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>
                            {fmtBid(Number(a.half_value), variant)}
                          </td>
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
                        </tr>
                      )

                      const rowB = (
                        <tr
                          key={b.id}
                          style={{
                            background: bothBid && !winnerIsA ? 'rgba(0,54,96,0.05)' : bothBg,
                            borderBottom: pairIdx < pairs.length - 1 ? '2px solid var(--border)' : '1px solid var(--border)',
                          }}
                        >
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)', fontWeight: !winnerIsA && bothBid ? 600 : 400 }}>
                            {b.student_id}
                            {bothBid && !winnerIsA && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>★ winner</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: 500 }}>
                            {fmtBid(Number(b.half_value), variant)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: bidB !== null ? 'var(--text)' : 'var(--text-muted)', fontWeight: bothBid && !winnerIsA ? 600 : 400 }}>
                            {bidB !== null ? fmtBid(bidB, variant) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: bothBid && !winnerIsA ? 'var(--navy)' : 'var(--text-muted)' }}>
                            {bothBid ? (!winnerIsA ? 'Won' : 'Lost') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--navy)', fontWeight: bothBid && !winnerIsA ? 600 : 400 }}>
                            {bothBid && !winnerIsA ? fmtBid(V - bidB!, variant) : bothBid ? '$0' : '—'}
                          </td>
                        </tr>
                      )

                      return [rowA, rowB]
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Awaiting pair ── */}
          {unpairedSubmitted.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Awaiting Pair ({unpairedSubmitted.length})
              </p>
              <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ minWidth: '400px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Half Value', 'Bid', 'Joined'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Not yet submitted ── */}
          {notSubmitted.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Joined, No Bid Yet ({notSubmitted.length})
              </p>
              <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ minWidth: '400px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Half Value', 'Joined'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
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
