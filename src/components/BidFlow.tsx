'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { getAuctionConfig, TOTAL_ROUNDS } from '@/lib/auction-config'

type Panel = 'identify' | 'value' | 'bid' | 'confirm' | 'complete'

interface Props {
  auctionKey: string
}

export default function BidFlow({ auctionKey }: Props) {
  const config = getAuctionConfig(auctionKey)!

  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [privateValue, setPrivateValue] = useState(0)
  const [bidAmount, setBidAmount] = useState('')
  const [currentRound, setCurrentRound] = useState(1)
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Step 1 → Step 2: fetch progress, generate private value
  const handleReveal = useCallback(async () => {
    const id = studentId.trim()
    if (!id) { setError('Please enter your Student ID.'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch(
        `/api/progress?student_id=${encodeURIComponent(id)}&auction_type=${config.key}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch progress')

      const completed: number = data.rounds_completed ?? 0
      if (completed >= TOTAL_ROUNDS) {
        setRoundsCompleted(completed)
        setPanel('complete')
        return
      }

      setRoundsCompleted(completed)
      setCurrentRound(completed + 1)
      // Generate private value client-side, same formula as original
      const pv = Math.round(Math.random() * 10000) / 100
      setPrivateValue(pv)
      setPanel('value')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [studentId, config.key])

  // Step 3 → submit bid
  const handleSubmit = useCallback(async () => {
    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount < 0) {
      showToast('Please enter a valid bid amount.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          auction_type: config.key,
          round: currentRound,
          private_value: privateValue,
          amount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      const newCompleted = currentRound
      setRoundsCompleted(newCompleted)
      setBidAmount('')

      if (newCompleted >= TOTAL_ROUNDS) {
        setPanel('complete')
      } else {
        setPanel('confirm')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }, [bidAmount, studentId, config.key, currentRound, privateValue])

  // Start next round
  const handleNextRound = useCallback(() => {
    const nextRound = roundsCompleted + 1
    setCurrentRound(nextRound)
    const pv = Math.round(Math.random() * 10000) / 100
    setPrivateValue(pv)
    setBidAmount('')
    setPanel('value')
  }, [roundsCompleted])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <Link
            href="/"
            className="text-xs tracking-widest uppercase mr-4"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Back
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--gold)' }}
          >
            Econ 177
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {config.shortTitle}
          </span>
        </div>
        {/* Round dots */}
        <div className="flex gap-1 items-center">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
            let cls = 'round-dot'
            if (i < roundsCompleted) cls += ' completed'
            else if (i === roundsCompleted && panel !== 'complete') cls += ' current'
            return <span key={i} className={cls} />
          })}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded text-sm z-50"
          style={{ background: '#3a1a1a', color: '#f87171', border: '1px solid #7f1d1d' }}
        >
          {toast}
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* PANEL: identify */}
          {panel === 'identify' && (
            <div>
              <StepIndicator step={1} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Identify Yourself
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Enter your student ID to begin.
              </p>
              <input
                type="text"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="e.g. S12345"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReveal()}
                autoFocus
              />
              {error && (
                <p className="text-xs mb-4" style={{ color: '#f87171' }}>
                  {error}
                </p>
              )}
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleReveal}
                disabled={loading}
              >
                {loading ? 'Checking…' : 'Reveal My Private Value →'}
              </button>
            </div>
          )}

          {/* PANEL: value */}
          {panel === 'value' && (
            <div>
              <StepIndicator step={2} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Your Private Value
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Round {currentRound} of {TOTAL_ROUNDS} · {studentId}
              </p>
              <div
                className="rounded-xl p-8 text-center mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                  Your private value this round
                </p>
                <p className="serif text-5xl" style={{ color: 'var(--gold)' }}>
                  ${privateValue.toFixed(2)}
                </p>
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
                  onClick={() => setPanel('bid')}
                >
                  Continue to Place Bid →
                </button>
              </div>
            </div>
          )}

          {/* PANEL: bid */}
          {panel === 'bid' && (
            <div>
              <StepIndicator step={3} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Place Your Bid
              </h2>

              {/* Reminder bar */}
              <div
                className="flex gap-4 text-xs rounded-lg px-4 py-3 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  Private Value:{' '}
                  <span style={{ color: 'var(--gold)' }}>${privateValue.toFixed(2)}</span>
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  ID: <span style={{ color: 'var(--text)' }}>{studentId}</span>
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Round: <span style={{ color: 'var(--text)' }}>{currentRound}</span>
                </span>
              </div>

              {config.participationThreshold !== null && (
                <div
                  className="text-xs rounded-lg px-4 py-3 mb-4"
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Note: {config.nashDescription}. Bid $0 to not participate.
                </div>
              )}

              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Enter bid amount ($)"
                min="0"
                step="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit Bid →'}
                </button>
              </div>
            </div>
          )}

          {/* PANEL: confirm */}
          {panel === 'confirm' && (
            <div className="text-center">
              <div className="text-5xl mb-6">✓</div>
              <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                Round {roundsCompleted} Recorded
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                {TOTAL_ROUNDS - roundsCompleted} round{TOTAL_ROUNDS - roundsCompleted !== 1 ? 's' : ''} remaining.
              </p>
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm"
                onClick={handleNextRound}
              >
                Start Round {roundsCompleted + 1} →
              </button>
            </div>
          )}

          {/* PANEL: complete */}
          {panel === 'complete' && (
            <div className="text-center">
              <div className="text-5xl mb-6">🎉</div>
              <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                All {TOTAL_ROUNDS} Rounds Complete
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Thank you, {studentId}. Your bids have been recorded.
              </p>
              <Link href="/" className="btn-gold inline-block rounded-lg px-6 py-3 text-sm">
                Return to Experiments
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Identify', 'Your Value', 'Bid']
  return (
    <div className="flex gap-2 items-center">
      {steps.map((label, i) => {
        const s = i + 1
        const active = s === step
        const done = s < step
        return (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-6 h-px" style={{ background: done ? 'var(--gold)' : 'var(--border)' }} />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: active || done ? 'var(--gold)' : 'var(--surface2)',
                  color: active || done ? '#0d0d0d' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {done ? '✓' : s}
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
