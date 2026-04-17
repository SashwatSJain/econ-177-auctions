'use client'

import Link from 'next/link'
import { useState } from 'react'

import { EXPERIMENT3_ROUNDS_PER_TREATMENT } from '@/lib/experiment3-config'
import type { Experiment3ProgressPayload } from '@/lib/experiment3'
import type {
  Experiment3BlockSummary,
  Experiment3OverallSummary,
  Experiment3RoundContext,
} from '@/lib/types'

type Panel = 'identify' | 'value' | 'reserve' | 'confirm' | 'block-summary' | 'complete'

export default function Experiment3Flow() {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [currentContext, setCurrentContext] = useState<Experiment3RoundContext | null>(null)
  const [nextContext, setNextContext] = useState<Experiment3RoundContext | null>(null)
  const [reservePrice, setReservePrice] = useState('')
  const [roundsCompletedInBlock, setRoundsCompletedInBlock] = useState(0)
  const [blockSummary, setBlockSummary] = useState<Experiment3BlockSummary | null>(null)
  const [overallSummary, setOverallSummary] = useState<Experiment3OverallSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) {
      setError('Please enter your perm number.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(
        `/api/experiment3/progress?student_id=${encodeURIComponent(id)}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load Experiment 3 progress.')

      applyProgress(json as Experiment3ProgressPayload, id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function applyProgress(progress: Experiment3ProgressPayload, id: string) {
    setStudentId(id)
    setReservePrice('')
    setError('')
    setBlockSummary(progress.blockSummary)
    setOverallSummary(progress.overallSummary)
    setNextContext(progress.next)

    if (progress.phase === 'round' && progress.current) {
      setCurrentContext(progress.current)
      setRoundsCompletedInBlock(progress.current.roundInTreatment - 1)
      setPanel('value')
      return
    }

    if (progress.phase === 'block-summary' && progress.blockSummary) {
      setCurrentContext(null)
      setRoundsCompletedInBlock(EXPERIMENT3_ROUNDS_PER_TREATMENT)
      setPanel('block-summary')
      return
    }

    setCurrentContext(null)
    setRoundsCompletedInBlock(EXPERIMENT3_ROUNDS_PER_TREATMENT)
    setPanel('complete')
  }

  async function handleSubmitReserve() {
    if (!currentContext) return

    const parsedReserve = parseFloat(reservePrice)
    if (Number.isNaN(parsedReserve) || parsedReserve < 0 || parsedReserve > 100) {
      showToast('Please enter a valid reserve price between 0 and 100.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/experiment3/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim(),
          treatment_key: currentContext.treatment.key,
          round_in_treatment: currentContext.roundInTreatment,
          reserve_price: parsedReserve,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to record reserve price.')

      setReservePrice('')
      setRoundsCompletedInBlock(currentContext.roundInTreatment)
      setBlockSummary(json.blockSummary ?? null)
      setOverallSummary(json.overallSummary ?? null)
      setNextContext(json.next ?? null)

      if (json.blockComplete) {
        setCurrentContext(null)
        setPanel('block-summary')
      } else {
        setPanel('confirm')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record reserve price.')
    } finally {
      setLoading(false)
    }
  }

  function handleStartNextRound() {
    if (!currentContext) return
    setCurrentContext({
      ...currentContext,
      roundInTreatment: currentContext.roundInTreatment + 1,
      globalRound: currentContext.globalRound + 1,
    })
    setReservePrice('')
    setPanel('value')
  }

  function handleContinueAfterBlock() {
    if (nextContext) {
      setCurrentContext(nextContext)
      setRoundsCompletedInBlock(0)
      setBlockSummary(null)
      setNextContext(null)
      setReservePrice('')
      setPanel('value')
      return
    }

    if (overallSummary) {
      setPanel('complete')
    }
  }

  const progressDotsCompleted =
    panel === 'confirm'
      ? roundsCompletedInBlock
      : panel === 'block-summary' || panel === 'complete'
      ? EXPERIMENT3_ROUNDS_PER_TREATMENT
      : roundsCompletedInBlock

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="border-b px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="justify-self-start">
          <Link
            href="/"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Back
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--navy)' }}>
            UCSB · Econ 177
          </span>
          <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Experiment 3: Seller Reserve Auction
          </span>
        </div>
        <div className="flex gap-1 items-center justify-self-end">
          {Array.from({ length: EXPERIMENT3_ROUNDS_PER_TREATMENT }).map((_, index) => {
            let cls = 'round-dot'
            if (index < progressDotsCompleted) cls += ' completed'
            else if (
              currentContext &&
              index === currentContext.roundInTreatment - 1 &&
              panel !== 'confirm'
            ) {
              cls += ' current'
            }
            return <span key={index} className={cls} />
          })}
        </div>
      </header>

      {toast ? (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded text-sm z-50"
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
          }}
        >
          {toast}
        </div>
      ) : null}

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          {panel === 'identify' && (
            <div className="max-w-md mx-auto">
              <StepIndicator step={1} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Identify Yourself
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Enter your perm number to begin Experiment 3.
              </p>
              <input
                type="text"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="e.g. 1234567"
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value)
                  setError('')
                }}
                onKeyDown={(event) => event.key === 'Enter' && handleIdentify()}
                autoFocus
              />
              {error ? (
                <p className="text-xs mb-4" style={{ color: '#dc2626' }}>
                  {error}
                </p>
              ) : null}
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleIdentify}
                disabled={loading}
              >
                {loading ? 'Checking…' : 'Begin Experiment 3 →'}
              </button>
            </div>
          )}

          {panel === 'value' && currentContext ? (
            <div className="max-w-md mx-auto">
              <StepIndicator step={2} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Seller Round Setup
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                {currentContext.treatment.shortTitle} · Round {currentContext.roundInTreatment} of{' '}
                {EXPERIMENT3_ROUNDS_PER_TREATMENT} · {studentId.trim()}
              </p>
              <div
                className="rounded-xl p-8 text-center mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p
                  className="text-xs uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Your seller value this round
                </p>
                <p className="serif text-5xl" style={{ color: 'var(--navy)' }}>
                  ${currentContext.sellerValue.toFixed(2)}
                </p>
              </div>
              <div
                className="text-xs rounded-lg px-4 py-3 mb-6"
                style={{
                  background: 'rgba(0,54,96,0.04)',
                  border: '1px solid rgba(0,54,96,0.1)',
                  color: 'var(--text-muted)',
                  lineHeight: 1.7,
                }}
              >
                Choose a reserve price. Your outcome will be revealed after all{' '}
                {EXPERIMENT3_ROUNDS_PER_TREATMENT} rounds in this block.
              </div>
              <div className="flex gap-3">
                <button
                  className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={() => setPanel('identify')}
                >
                  ← Back
                </button>
                <button
                  className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={() => setPanel('reserve')}
                >
                  Continue to Set Reserve →
                </button>
              </div>
            </div>
          ) : null}

          {panel === 'reserve' && currentContext ? (
            <div className="max-w-md mx-auto">
              <StepIndicator step={3} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Set Your Reserve
              </h2>

              <div
                className="flex gap-4 text-xs rounded-lg px-4 py-3 mb-6 flex-wrap"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  Seller Value:{' '}
                  <span style={{ color: 'var(--navy)', fontWeight: 500 }}>
                    ${currentContext.sellerValue.toFixed(2)}
                  </span>
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Block:{' '}
                  <span style={{ color: 'var(--text)' }}>
                    {currentContext.treatment.shortTitle}
                  </span>
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Round:{' '}
                  <span style={{ color: 'var(--text)' }}>
                    {currentContext.roundInTreatment}
                  </span>
                </span>
              </div>

              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Enter reserve price ($)"
                min="0"
                max="100"
                step="0.01"
                value={reservePrice}
                onChange={(event) => setReservePrice(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSubmitReserve()}
                autoFocus
              />

              <div className="flex gap-3 mt-2">
                <button
                  className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={() => setPanel('value')}
                >
                  ← Back
                </button>
                <button
                  className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={handleSubmitReserve}
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit Reserve →'}
                </button>
              </div>
            </div>
          ) : null}

          {panel === 'confirm' && currentContext ? (
            <div className="max-w-md mx-auto text-center">
              <div
                className="text-4xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(0,54,96,0.08)', color: 'var(--navy)' }}
              >
                ✓
              </div>
              <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                Round {roundsCompletedInBlock} Recorded
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                {EXPERIMENT3_ROUNDS_PER_TREATMENT - roundsCompletedInBlock} round
                {EXPERIMENT3_ROUNDS_PER_TREATMENT - roundsCompletedInBlock !== 1 ? 's' : ''}{' '}
                remaining in this block.
              </p>
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm"
                onClick={handleStartNextRound}
              >
                Start Round {currentContext.roundInTreatment + 1} →
              </button>
            </div>
          ) : null}

          {panel === 'block-summary' && blockSummary ? (
            <div>
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div
                    className="text-2xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto font-bold"
                    style={{ background: 'var(--navy)', color: '#fff' }}
                  >
                    ✓
                  </div>
                  <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                    {blockSummary.shortTitle} Complete
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Feedback for all {EXPERIMENT3_ROUNDS_PER_TREATMENT} rounds in this block.
                  </p>
                </div>

                <div
                  className="grid gap-3 sm:grid-cols-4 rounded-xl p-4 mb-6"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <SummaryStat label="Total Profit" value={formatMoney(blockSummary.totalProfit)} />
                  <SummaryStat
                    label="Avg Profit"
                    value={formatMaybeMoney(blockSummary.averageProfit)}
                  />
                  <SummaryStat label="Sale Rate" value={formatPercent(blockSummary.saleRate)} />
                  <SummaryStat
                    label="Avg Reserve"
                    value={formatMaybeMoney(blockSummary.averageReserve)}
                  />
                </div>

                <div
                  className="rounded-xl overflow-auto mb-6"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <table className="w-full text-sm" style={{ minWidth: '980px' }}>
                    <thead>
                      <tr
                        style={{
                          background: 'var(--surface)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {[
                          '#',
                          'Seller Value',
                          'Reserve',
                          'All Bids',
                          'Highest',
                          'Second',
                          'Sold',
                          'Sale Price',
                          'Profit',
                        ].map((label) => (
                          <th
                            key={label}
                            className="text-left px-4 py-3 text-xs tracking-wide font-medium"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {blockSummary.rows.map((row, index) => (
                        <tr
                          key={row.id}
                          style={{
                            background: index % 2 === 0 ? '#fff' : 'var(--surface)',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {row.round_in_treatment}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                            {formatMoney(row.seller_value)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                            {formatMoney(row.reserve_price)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {row.simulated_bids.map((value) => formatMoney(value)).join(', ')}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                            {formatMoney(row.highest_bid)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                            {formatMoney(row.second_highest_bid)}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                            {row.sold ? 'Yes' : 'No'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                            {row.sale_price == null ? '—' : formatMoney(row.sale_price)}
                          </td>
                          <td
                            className="px-4 py-2.5 text-xs font-medium"
                            style={{
                              color: row.profit >= 0 ? 'var(--navy)' : '#b91c1c',
                            }}
                          >
                            {formatMoney(row.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="max-w-md mx-auto">
                  <button
                    className="btn-gold w-full rounded-lg px-4 py-3 text-sm"
                    onClick={handleContinueAfterBlock}
                  >
                    {nextContext ? `Continue to ${nextContext.treatment.shortTitle} →` : 'View Final Summary →'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {panel === 'complete' && overallSummary ? (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div
                  className="text-2xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto font-bold"
                  style={{ background: 'var(--navy)', color: '#fff' }}
                >
                  ✓
                </div>
                <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                  Experiment 3 Complete
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Thank you, {studentId.trim()}. All reserve choices have been recorded.
                </p>
              </div>

              <div
                className="grid gap-3 sm:grid-cols-4 rounded-xl p-4 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <SummaryStat label="Total Profit" value={formatMoney(overallSummary.totalProfit)} />
                <SummaryStat
                  label="Avg Profit"
                  value={formatMaybeMoney(overallSummary.averageProfit)}
                />
                <SummaryStat label="Sale Rate" value={formatPercent(overallSummary.saleRate)} />
                <SummaryStat
                  label="Blocks Complete"
                  value={`${overallSummary.blocksCompleted} / ${overallSummary.blockSummaries.length}`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-8">
                {overallSummary.blockSummaries.map((summary) => (
                  <div
                    key={summary.treatmentKey}
                    className="rounded-xl p-5"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p
                      className="text-xs uppercase tracking-widest mb-2"
                      style={{ color: 'var(--navy)' }}
                    >
                      {summary.shortTitle}
                    </p>
                    <div className="grid gap-2 grid-cols-2 text-sm">
                      <SummaryCell label="Total Profit" value={formatMoney(summary.totalProfit)} />
                      <SummaryCell
                        label="Avg Profit"
                        value={formatMaybeMoney(summary.averageProfit)}
                      />
                      <SummaryCell label="Sale Rate" value={formatPercent(summary.saleRate)} />
                      <SummaryCell
                        label="Avg Reserve"
                        value={formatMaybeMoney(summary.averageReserve)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link href="/" className="btn-gold inline-block rounded-lg px-6 py-3 text-sm">
                  Return to Experiments
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Identify', 'Seller Value', 'Reserve']
  return (
    <div className="flex gap-2 items-center">
      {steps.map((label, index) => {
        const current = index + 1
        const active = current === step
        const done = current < step
        return (
          <div key={label} className="flex items-center gap-2">
            {index > 0 ? (
              <div
                className="w-6 h-px"
                style={{ background: done ? 'var(--navy)' : 'var(--border)' }}
              />
            ) : null}
            <div className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: active || done ? 'var(--navy)' : 'var(--surface2)',
                  color: active || done ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {done ? '✓' : current}
              </span>
              <span
                className="text-xs"
                style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
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

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 font-medium" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatMaybeMoney(value: number | null) {
  return value == null ? 'n/a' : formatMoney(value)
}

function formatPercent(value: number | null) {
  return value == null ? 'n/a' : `${(value * 100).toFixed(1)}%`
}
