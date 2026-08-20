'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Exp1BidChart,
  Exp3LineChart,
  Exp3DualLineChart,
  Exp4ScatterChart,
  Exp5BidCdfChart,
  Exp6BidCdfChart,
  filterExp4Outliers,
} from '@/components/instructor/charts'
import { AUCTION_CONFIGS } from '@/lib/auction-config'
import { EXPERIMENT3_TREATMENTS } from '@/lib/experiment3-config'
import { withQuarter } from '@/lib/use-quarter-param'
import type { PublicQuarter } from '@/app/api/quarters/route'

// ── Types ────────────────────────────────────────────────────────────────────

type Exp1Row = { private_value: number; amount: number }
type Exp3Row = { round_in_treatment: number; reserve_price: number; profit: number; sold: boolean }
type Exp4Row = { student_id: string; estimate: number; bid_2: number; bid_10: number; bid_100: number }
type Exp5Row = { bid: number | null; half_value: number }
type Exp6Row = { bid: number; num_bidders: number }

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mb-14">
      <div className="mb-5">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>{title}</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
      {children}
    </div>
  )
}

function Loading() {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  )
}

function Empty() {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet.</p>
    </div>
  )
}

// ── Exp 1 ────────────────────────────────────────────────────────────────────

function getRegressionBids(auctionKey: string, bids: { pv: number; bid: number }[]) {
  if (auctionKey === 'second-2') return bids.filter((d) => Math.abs(d.bid - d.pv / 2) >= 0.99)
  if (auctionKey === 'second-5') return bids.filter((d) => Math.abs(d.bid - (d.pv * 4) / 5) >= 0.99 && d.bid !== 0)
  if (auctionKey === 'first-2' || auctionKey === 'first-5') return bids.filter((d) => d.bid < d.pv)
  return bids
}

function Exp1Charts({ quarter }: { quarter: string | null }) {
  const [selectedKey, setSelectedKey] = useState(AUCTION_CONFIGS[0].key)
  const [rows, setRows] = useState<Exp1Row[]>([])
  const [loading, setLoading] = useState(false)
  const cache = useRef<Record<string, Exp1Row[]>>({})

  useEffect(() => {
    const cacheKey = `${quarter ?? 'active'}:${selectedKey}`
    if (cache.current[cacheKey]) { setRows(cache.current[cacheKey]); return }
    setLoading(true)
    fetch(withQuarter(`/api/class-results/exp1?auction_type=${encodeURIComponent(selectedKey)}`, quarter))
      .then((r) => r.ok ? r.json() : [])
      .then((data: Exp1Row[]) => { cache.current[cacheKey] = data; setRows(data) })
      .finally(() => setLoading(false))
  }, [selectedKey, quarter])

  const config = AUCTION_CONFIGS.find((a) => a.key === selectedKey)!
  const bids = rows.map((r) => ({ pv: Number(r.private_value), bid: Number(r.amount) }))

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {AUCTION_CONFIGS.map((a) => (
          <button key={a.key} onClick={() => setSelectedKey(a.key)}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{
              background: selectedKey === a.key ? 'var(--navy)' : 'var(--surface)',
              color: selectedKey === a.key ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${selectedKey === a.key ? 'var(--navy)' : 'var(--border)'}`,
            }}>
            {a.shortTitle}
          </button>
        ))}
      </div>

      <div className="rounded-lg px-4 py-3 mb-5 text-xs"
        style={{ background: 'rgba(0,54,96,0.04)', border: '1px solid rgba(0,54,96,0.1)', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Nash Equilibrium: </span>
        {config.nashDescription}
        <span className="mx-3" style={{ color: 'rgba(0,54,96,0.25)' }}>|</span>
        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Seller Revenue: </span>
        {config.revenueDescription}
      </div>

      {loading ? <Loading /> : bids.length === 0 ? <Empty /> : (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Exp1BidChart
            bids={bids}
            nashFormula={config.nashFormula}
            participationThreshold={config.participationThreshold}
            nashSlope={config.nashSlope}
            regressionBids={config.nashSlope !== null ? getRegressionBids(selectedKey, bids) : undefined}
          />
        </div>
      )}
    </div>
  )
}

// ── Exp 3 ────────────────────────────────────────────────────────────────────

const PAIRED_TREATMENT: Record<string, string> = {
  'exp3-1': 'exp3-2',
  'exp3-2': 'exp3-1',
  'exp3-3': 'exp3-4',
  'exp3-4': 'exp3-3',
}

function rowsToReserveData(rows: Exp3Row[]) {
  const byRound = new Map<number, Exp3Row[]>()
  for (const row of rows) {
    if (!byRound.has(row.round_in_treatment)) byRound.set(row.round_in_treatment, [])
    byRound.get(row.round_in_treatment)!.push(row)
  }
  return Array.from(byRound.keys()).sort((a, b) => a - b).map((r) => {
    const g = byRound.get(r)!
    return { x: r, y: g.reduce((s, row) => s + Number(row.reserve_price), 0) / g.length }
  })
}

function Exp3Charts({ quarter }: { quarter: string | null }) {
  const [selectedKey, setSelectedKey] = useState(EXPERIMENT3_TREATMENTS[0].key)
  const [rows, setRows] = useState<Exp3Row[]>([])
  const [loading, setLoading] = useState(false)
  const [showCombined, setShowCombined] = useState(false)
  const [pairedReserveData, setPairedReserveData] = useState<{ x: number; y: number }[] | null>(null)
  const [loadingPaired, setLoadingPaired] = useState(false)
  const cache = useRef<Record<string, Exp3Row[]>>({})

  const fetchRows = useCallback(async (key: string): Promise<Exp3Row[]> => {
    const cacheKey = `${quarter ?? 'active'}:${key}`
    if (cache.current[cacheKey]) return cache.current[cacheKey]
    const res = await fetch(withQuarter(`/api/class-results/exp3?treatment_key=${encodeURIComponent(key)}`, quarter))
    if (!res.ok) return []
    const data: Exp3Row[] = await res.json()
    cache.current[cacheKey] = data
    return data
  }, [quarter])

  useEffect(() => {
    setLoading(true)
    fetchRows(selectedKey).then(setRows).finally(() => setLoading(false))
  }, [selectedKey, fetchRows])

  // Reset paired state when treatment or quarter changes
  useEffect(() => {
    setPairedReserveData(null)
    setShowCombined(false)
  }, [selectedKey, quarter])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCombined(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleShowCombined = async () => {
    if (pairedReserveData === null) {
      setLoadingPaired(true)
      const pairedKey = PAIRED_TREATMENT[selectedKey]
      const pairedRows = await fetchRows(pairedKey)
      setPairedReserveData(rowsToReserveData(pairedRows))
      setLoadingPaired(false)
    }
    setShowCombined(true)
  }

  const treatment = EXPERIMENT3_TREATMENTS.find((t) => t.key === selectedKey)!
  const pairedKey = PAIRED_TREATMENT[selectedKey]
  const pairedTreatment = EXPERIMENT3_TREATMENTS.find((t) => t.key === pairedKey)!
  const optimalReserve = (100 + treatment.sellerValue) / 2

  const byRound = new Map<number, Exp3Row[]>()
  for (const row of rows) {
    if (!byRound.has(row.round_in_treatment)) byRound.set(row.round_in_treatment, [])
    byRound.get(row.round_in_treatment)!.push(row)
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

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {EXPERIMENT3_TREATMENTS.map((t) => (
          <button key={t.key} onClick={() => setSelectedKey(t.key)}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{
              background: selectedKey === t.key ? 'var(--navy)' : 'var(--surface)',
              color: selectedKey === t.key ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${selectedKey === t.key ? 'var(--navy)' : 'var(--border)'}`,
            }}>
            {t.shortTitle}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Avg Reserve Price',
              data: reserveData,
              yLabel: 'Reserve ($)',
              color: 'var(--navy)',
              referenceLine: optimalReserve,
              referenceLabel: `r*=${optimalReserve}`,
              formatY: (v: number) => `$${v.toFixed(0)}`,
              showTogether: true,
            },
            {
              title: 'Avg Profit per Round',
              data: profitData,
              yLabel: 'Profit ($)',
              color: 'var(--navy)',
              formatY: (v: number) => `$${v.toFixed(1)}`,
              showTogether: false,
            },
            {
              title: 'Sale Rate per Round',
              data: saleRateData,
              yLabel: 'Sale Rate (%)',
              color: 'var(--navy)',
              yMin: 40,
              yMax: 100,
              formatY: (v: number) => `${v.toFixed(0)}%`,
              showTogether: false,
            },
          ].map(({ showTogether, ...chart }) => (
            <div key={chart.title} className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{chart.title}</p>
                {showTogether && (
                  <button onClick={handleShowCombined} disabled={loadingPaired}
                    className="rounded transition-colors"
                    style={{ color: 'var(--text-muted)', padding: '2px 6px', fontSize: '10px', lineHeight: 1.4, background: 'transparent', border: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    {loadingPaired ? '…' : 'Show Together'}
                  </button>
                )}
              </div>
              <Exp3LineChart {...chart} />
            </div>
          ))}
        </div>
      )}

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
              labelA={treatment.shortTitle} labelB={pairedTreatment.shortTitle}
              yLabel="Reserve ($)"
              referenceLine={optimalReserve} referenceLabel={`r*=${optimalReserve}`}
              formatY={(v) => `$${v.toFixed(0)}`}
            />
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>Press Esc or click outside to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Exp 4 ────────────────────────────────────────────────────────────────────

const EXP4_TABS = [
  { key: 'bid_2' as const, label: '2 Bidders' },
  { key: 'bid_10' as const, label: '10 Bidders' },
  { key: 'bid_100' as const, label: '100 Bidders' },
]

function Exp4Charts({ quarter }: { quarter: string | null }) {
  const [rows, setRows] = useState<Exp4Row[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'bid_2' | 'bid_10' | 'bid_100'>('bid_2')
  const [noOutliers, setNoOutliers] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(withQuarter('/api/experiment4', quarter))
      .then((r) => r.ok ? r.json() : [])
      .then(setRows)
      .finally(() => setLoading(false))
  }, [quarter])

  if (loading) return <Loading />
  if (rows.length === 0) return <Empty />

  const rawData = rows.map((r) => ({ id: r.student_id, x: Number(r.estimate), y: Number(r[activeTab]) }))
  const data = noOutliers ? filterExp4Outliers(rawData) : rawData
  const hiddenCount = rawData.length - data.length

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {EXP4_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{ background: activeTab === tab.key ? 'var(--navy)' : 'var(--surface2)', color: activeTab === tab.key ? '#fff' : 'var(--text-muted)', border: `1px solid ${activeTab === tab.key ? 'var(--navy)' : 'var(--border)'}` }}>
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => setNoOutliers((v) => !v)}
          className="rounded transition-colors text-xs"
          style={{ color: noOutliers ? 'var(--navy)' : 'var(--text-muted)', padding: '2px 6px', fontSize: '10px', lineHeight: 1.4, background: 'transparent', border: `1px solid ${noOutliers ? 'var(--navy)' : 'var(--border)'}` }}>
          {noOutliers ? `Outliers hidden (${hiddenCount})` : 'Remove outliers'}
        </button>
      </div>
      <Exp4ScatterChart data={data} />
    </div>
  )
}

// ── Exp 5 ────────────────────────────────────────────────────────────────────

function Exp5Charts({ quarter }: { quarter: string | null }) {
  const [bids0, setBids0] = useState<number[]>([])
  const [bids3, setBids3] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(withQuarter('/api/beta/cv-auction?variant=integer', quarter))
      .then((r) => r.ok ? r.json() : [])
      .then((rows: Exp5Row[]) => {
        const submitted = rows.filter((r) => r.bid !== null)
        setBids0(submitted.filter((r) => Number(r.half_value) === 0).map((r) => Number(r.bid)))
        setBids3(submitted.filter((r) => Number(r.half_value) === 3).map((r) => Number(r.bid)))
      })
      .finally(() => setLoading(false))
  }, [quarter])

  if (loading) return <Loading />
  if (bids0.length === 0 && bids3.length === 0) return <Empty />

  return <Exp5BidCdfChart bids0={bids0} bids3={bids3} />
}

// ── Exp 6 ────────────────────────────────────────────────────────────────────

function Exp6Charts({ quarter }: { quarter: string | null }) {
  const [bids2, setBids2] = useState<number[]>([])
  const [bids5, setBids5] = useState<number[]>([])
  const [bids10, setBids10] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(withQuarter('/api/exp6?num_bidders=2', quarter)).then((r) => r.ok ? r.json() as Promise<Exp6Row[]> : []),
      fetch(withQuarter('/api/exp6?num_bidders=5', quarter)).then((r) => r.ok ? r.json() as Promise<Exp6Row[]> : []),
      fetch(withQuarter('/api/exp6?num_bidders=10', quarter)).then((r) => r.ok ? r.json() as Promise<Exp6Row[]> : []),
    ]).then(([r2, r5, r10]) => {
      setBids2(r2.map((r) => Number(r.bid)))
      setBids5(r5.map((r) => Number(r.bid)))
      setBids10(r10.map((r) => Number(r.bid)))
    }).finally(() => setLoading(false))
  }, [quarter])

  if (loading) return <Loading />
  if (bids2.length === 0 && bids5.length === 0 && bids10.length === 0) return <Empty />

  return <Exp6BidCdfChart bids2={bids2} bids5={bids5} bids10={bids10} />
}

// ── Page ─────────────────────────────────────────────────────────────────────

function QuarterSelector({ quarters, quarter, onChange }: {
  quarters: PublicQuarter[]
  quarter: string | null
  onChange: (id: string) => void
}) {
  if (quarters.length === 0) return null
  const selectedId = quarter ?? quarters.find((q) => q.is_active)?.id ?? ''

  return (
    <select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1.5 rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        cursor: 'pointer',
      }}
    >
      {quarters.map((q) => (
        <option key={q.id} value={q.id}>
          {q.name}{q.is_active ? ' (current)' : ''}
        </option>
      ))}
    </select>
  )
}

function ClassResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [quarters, setQuarters] = useState<PublicQuarter[]>([])

  const quarterParam = searchParams.get('quarter')

  useEffect(() => {
    fetch('/api/quarters')
      .then((r) => r.json())
      .then((data) => setQuarters(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const activeQuarter = quarters.find((q) => q.is_active)
  const viewingQuarter = quarterParam ? quarters.find((q) => q.id === quarterParam) : activeQuarter
  const isArchiveView = Boolean(viewingQuarter && !viewingQuarter.is_active)
  const quarter = isArchiveView ? viewingQuarter!.id : null

  function handleQuarterChange(id: string) {
    const selected = quarters.find((q) => q.id === id)
    if (!selected) return
    router.push(selected.is_active ? '/class-results' : `/class-results?quarter=${id}`)
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <Link href="/" className="text-xs tracking-widest uppercase mb-4 inline-block"
            style={{ color: 'var(--text-muted)' }}>
            ← Home
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="serif text-3xl" style={{ color: 'var(--navy)' }}>Class Results</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Aggregate bid distributions and performance charts across all experiments.
              </p>
            </div>
            <QuarterSelector quarters={quarters} quarter={quarterParam} onChange={handleQuarterChange} />
          </div>

          {isArchiveView && viewingQuarter && (
            <div
              className="mt-5 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
            >
              <span style={{ color: '#92400e', fontSize: 14 }}>📦</span>
              <p className="text-xs font-medium" style={{ color: '#92400e' }}>
                Viewing archived quarter: <strong>{viewingQuarter.name}</strong>
              </p>
              <button
                onClick={() => router.push('/class-results')}
                className="ml-auto text-xs px-3 py-1 rounded-lg"
                style={{ background: '#92400e', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Back to current
              </button>
            </div>
          )}
        </div>

        <Section
          title="Experiment 1 — Sealed-Bid Auction"
          description="Private value vs. bid scatter with Nash equilibrium line and OLS regression, across all four treatments."
        >
          <Exp1Charts quarter={quarter} />
        </Section>

        <Section
          title="Experiment 3 — Seller Auction"
          description="Per-round class averages for reserve price, profit, and sale rate across four treatments."
        >
          <Exp3Charts quarter={quarter} />
        </Section>

        <Section
          title="Experiment 4 — Penny Jar Experiment"
          description="Scatter plot of each student's kernel estimate vs. their bid under 2, 10, or 100 bidders."
        >
          <Exp4Charts quarter={quarter} />
        </Section>

        <Section
          title="Experiment 5 — Oil Well"
          description="Empirical bid CDF vs. Nash equilibrium, split by half-value treatment (integer bids)."
        >
          <Exp5Charts quarter={quarter} />
        </Section>

        <Section
          title="Experiment 6 — All-Pay Auction"
          description="Empirical bid CDF vs. Nash equilibrium for groups of 2, 5, and 10 bidders."
        >
          <Exp6Charts quarter={quarter} />
        </Section>
      </div>
    </main>
  )
}

export default function ClassResultsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClassResultsContent />
    </Suspense>
  )
}
