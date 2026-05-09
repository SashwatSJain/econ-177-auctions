'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Stat, Exp3LineChart, Exp3DualLineChart, ChartProps } from './charts'
import { EXPERIMENT3_TREATMENTS } from '@/lib/experiment3-config'
import type { Experiment3Round } from '@/lib/types'

const PAIRED_TREATMENT: Record<string, string> = {
  'exp3-1': 'exp3-2',
  'exp3-2': 'exp3-1',
  'exp3-3': 'exp3-4',
  'exp3-4': 'exp3-3',
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

  useEffect(() => {
    setPairedReserveData(null)
    setShowCombined(false)
  }, [onGetPairedReserveData])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFullscreen(null); setShowCombined(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleShowCombined = async () => {
    if (pairedReserveData === null) {
      setLoadingPaired(true)
      const data = await onGetPairedReserveData()
      setPairedReserveData(data)
      setLoadingPaired(false)
    }
    setShowCombined(true)
  }

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
            <div key={chart.title} className="rounded-xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{chart.title}</p>
                <div className="flex items-center gap-1">
                  {chart.title === 'Avg Reserve Price' && (
                    <button onClick={handleShowCombined} disabled={loadingPaired}
                      className="rounded transition-colors text-xs"
                      style={{ color: 'var(--text-muted)', padding: '2px 6px', fontSize: '10px', lineHeight: 1.4, background: 'transparent', border: '1px solid var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      {loadingPaired ? '…' : 'Show Together'}
                    </button>
                  )}
                  <button onClick={() => setFullscreen(chart)} title="Fullscreen"
                    className="rounded transition-colors"
                    style={{ color: 'var(--text-muted)', padding: '2px 4px', fontSize: '11px', lineHeight: 1, background: 'transparent', border: '1px solid transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--navy)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >⛶</button>
                </div>
              </div>
              <Exp3LineChart {...chart} />
            </div>
          ))}
        </div>
      </div>

      {showCombined && pairedReserveData !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setShowCombined(false)}>
          <div className="rounded-2xl p-6"
            style={{ background: '#fff', width: '90vw', maxWidth: '900px', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>Avg Reserve Price — Combined</p>
              <button onClick={() => setShowCombined(false)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ✕ Close
              </button>
            </div>
            <Exp3DualLineChart
              dataA={reserveData} dataB={pairedReserveData}
              labelA={currentLabel} labelB={pairedLabel}
              yLabel="Reserve ($)"
              referenceLine={optimalReserve} referenceLabel={`r*=${optimalReserve}`}
              formatY={(v) => `$${v.toFixed(0)}`}
            />
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>Press Esc or click outside to close</p>
          </div>
        </div>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setFullscreen(null)}>
          <div className="rounded-2xl p-6"
            style={{ background: '#fff', width: '90vw', maxWidth: '1100px', border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{fullscreen.title}</p>
              <button onClick={() => setFullscreen(null)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ✕ Close
              </button>
            </div>
            <Exp3LineChart {...fullscreen} />
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>Press Esc or click outside to close</p>
          </div>
        </div>
      )}
    </>
  )
}

export default function Exp3Results() {
  const [selectedTreatmentKey, setSelectedTreatmentKey] = useState(EXPERIMENT3_TREATMENTS[0].key)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [allRows, setAllRows] = useState<Experiment3Round[]>([])
  const [loading, setLoading] = useState(false)

  const cacheRef = useRef<Record<string, Experiment3Round[]>>({})

  const fetchTreatmentRows = useCallback(async (key: string): Promise<Experiment3Round[]> => {
    if (cacheRef.current[key]) return cacheRef.current[key]
    const res = await fetch(`/api/experiment3/rows?treatment_key=${encodeURIComponent(key)}`)
    if (!res.ok) return []
    const rows: Experiment3Round[] = await res.json()
    cacheRef.current = { ...cacheRef.current, [key]: rows }
    return rows
  }, [])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchTreatmentRows(selectedTreatmentKey)
      setAllRows(rows)
    } finally {
      setLoading(false)
    }
  }, [selectedTreatmentKey, fetchTreatmentRows])

  useEffect(() => { fetchRows() }, [fetchRows])

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const rows = allRows.map((row, index) => ({
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'All Rows')
    for (let round = 1; round <= 20; round++) {
      const rowsForRound = allRows.filter((row) => row.round_in_treatment === round)
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roundSheet), `Round ${round}`)
    }
    XLSX.writeFile(wb, `${selectedTreatmentKey}-seller-auction.xlsx`)
  }

  const roundsWithData = Array.from(new Set(allRows.map((r) => r.round_in_treatment))).sort((a, b) => a - b)
  const filteredRows = selectedRound === 'all' ? allRows : allRows.filter((r) => r.round_in_treatment === selectedRound)
  const currentTreatment = EXPERIMENT3_TREATMENTS.find((t) => t.key === selectedTreatmentKey)!
  const pairedKey = PAIRED_TREATMENT[selectedTreatmentKey]
  const pairedTreatment = EXPERIMENT3_TREATMENTS.find((t) => t.key === pairedKey)!

  const saleRate = allRows.length > 0 ? allRows.filter((r) => r.sold).length / allRows.length : 0
  const averageProfit = allRows.length > 0 ? allRows.reduce((sum, r) => sum + Number(r.profit), 0) / allRows.length : 0

  const profitByStudent = new Map<string, number>()
  for (const row of allRows) {
    profitByStudent.set(row.student_id, (profitByStudent.get(row.student_id) ?? 0) + Number(row.profit))
  }
  const studentProfits = Array.from(profitByStudent.entries())
  const topEarner = studentProfits.length > 0 ? studentProfits.reduce((a, b) => (b[1] > a[1] ? b : a)) : null
  const bottomEarner = studentProfits.length > 0 ? studentProfits.reduce((a, b) => (b[1] < a[1] ? b : a)) : null

  const onGetPairedReserveData = useCallback(async () => {
    const rows = await fetchTreatmentRows(pairedKey)
    const byRound = new Map<number, Experiment3Round[]>()
    for (const row of rows) {
      const r = row.round_in_treatment
      if (!byRound.has(r)) byRound.set(r, [])
      byRound.get(r)!.push(row)
    }
    const rds = Array.from(byRound.keys()).sort((a, b) => a - b)
    return rds.map((r) => {
      const g = byRound.get(r)!
      return { x: r, y: g.reduce((s, row) => s + Number(row.reserve_price), 0) / g.length }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairedKey, fetchTreatmentRows])

  return (
    <div>
      {/* Treatment selector */}
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Treatment</p>
        <div className="flex flex-wrap gap-2">
          {EXPERIMENT3_TREATMENTS.map((treatment) => (
            <button key={treatment.key}
              onClick={() => { setSelectedTreatmentKey(treatment.key); setSelectedRound('all') }}
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

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Total Rows" value={allRows.length} />
        <Stat label="Unique Students" value={new Set(allRows.map((r) => r.student_id)).size} />
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

      <div className="rounded-lg px-4 py-3 mb-6 text-xs"
        style={{ background: 'rgba(0,54,96,0.04)', border: '1px solid rgba(0,54,96,0.1)', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Treatment Setup: </span>
        {currentTreatment.bidderCount} bidders, seller value {currentTreatment.sellerValue}, 20 rounds. Optimal reserve: ${(100 + currentTreatment.sellerValue) / 2}.
      </div>

      {/* Round filter + actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedRound('all')}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ background: selectedRound === 'all' ? 'var(--surface2)' : 'transparent', color: selectedRound === 'all' ? 'var(--text)' : 'var(--text-muted)', border: `1px solid ${selectedRound === 'all' ? 'var(--navy)' : 'var(--border)'}` }}>
            All Rounds
          </button>
          {roundsWithData.map((round) => (
            <button key={round} onClick={() => setSelectedRound(round)}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{ background: selectedRound === round ? 'var(--surface2)' : 'transparent', color: selectedRound === round ? 'var(--text)' : 'var(--text-muted)', border: `1px solid ${selectedRound === round ? 'var(--navy)' : 'var(--border)'}` }}>
              Round {round}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRows} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button onClick={handleExport} className="btn-gold text-xs px-3 py-1.5 rounded" disabled={allRows.length === 0}>
            ⬇ Excel
          </button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading rows…' : 'No rows yet for this treatment.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Student ID', 'Round', 'Seller Value', 'Reserve', 'All Bids', 'Highest', 'Second', 'Sold', 'Sale Price', 'Profit', 'Time'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.id}
                  style={{ background: row.sold ? (index % 2 === 0 ? '#fff' : 'var(--surface)') : 'rgba(239,68,68,0.04)', borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>{row.student_id}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{row.round_in_treatment}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>${Number(row.seller_value).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text)' }}>${Number(row.reserve_price).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.simulated_bids.map((v) => `$${Number(v).toFixed(2)}`).join(', ')}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>${Number(row.highest_bid).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>${Number(row.second_highest_bid).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{row.sold ? 'YES' : 'NO'}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>{row.sale_price == null ? '—' : `$${Number(row.sale_price).toFixed(2)}`}</td>
                  <td className="px-4 py-2.5 text-xs font-medium"
                    style={{ color: Number(row.profit) >= 0 ? 'var(--navy)' : '#b91c1c' }}>
                    ${Number(row.profit).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
