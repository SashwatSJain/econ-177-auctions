'use client'

import Link from 'next/link'
import { useState } from 'react'

type Panel = 'identify' | 'q1' | 'q2' | 'q3' | 'q4' | 'complete'

const PANEL_ORDER: Panel[] = ['identify', 'q1', 'q2', 'q3', 'q4', 'complete']
const Q_PANELS: Panel[] = ['q1', 'q2', 'q3', 'q4']

export default function Experiment4Flow() {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')

  const [estimate, setEstimate] = useState('')
  const [bid2, setBid2] = useState('')
  const [bid10, setBid10] = useState('')
  const [bid100, setBid100] = useState('')

  const [inputError, setInputError] = useState('')
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const questionsAnswered = Q_PANELS.indexOf(panel) // -1 on identify/complete

  // ── Identify ──────────────────────────────────────────────────────────────────

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your perm number.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/experiment4/check?student_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (json.submitted) {
        setAlreadySubmitted(true)
        setPanel('complete')
      } else {
        setPanel('q1')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Per-question advance ───────────────────────────────────────────────────────

  function validateNumber(val: string, label: string): boolean {
    const v = parseFloat(val)
    if (isNaN(v) || v < 0) {
      setInputError(`Please enter a valid number for ${label}.`)
      return false
    }
    setInputError('')
    return true
  }

  function handleQ1() {
    if (!validateNumber(estimate, 'your estimate')) return
    setPanel('q2')
  }

  function handleQ2() {
    if (!validateNumber(bid2, 'your bid')) return
    setPanel('q3')
  }

  function handleQ3() {
    if (!validateNumber(bid10, 'your bid')) return
    setPanel('q4')
  }

  async function handleQ4() {
    if (!validateNumber(bid100, 'your bid')) return
    setLoading(true)
    setInputError('')
    try {
      const res = await fetch('/api/experiment4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim(),
          estimate: parseFloat(estimate),
          bid_2: parseFloat(bid2),
          bid_10: parseFloat(bid10),
          bid_100: parseFloat(bid100),
        }),
      })
      if (res.status === 409) {
        setAlreadySubmitted(true)
        setPanel('complete')
        return
      }
      if (!res.ok) {
        const json = await res.json()
        setInputError(json.error ?? 'Submission failed. Please try again.')
        return
      }
      setPanel('complete')
    } catch {
      setInputError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function goBack() {
    setInputError('')
    const idx = PANEL_ORDER.indexOf(panel)
    if (idx > 0) setPanel(PANEL_ORDER[idx - 1])
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link href="/" className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          ← Back
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--navy)' }}>
            UCSB · Econ 177
          </span>
          <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Experiment 4: Jar of Kernels
          </span>
        </div>
        {/* Question progress dots */}
        <div className="flex gap-1 items-center">
          {Q_PANELS.map((p, i) => {
            const done = questionsAnswered > i
            const current = panel === p
            let cls = 'round-dot'
            if (done) cls += ' completed'
            else if (current) cls += ' current'
            return <span key={p} className={cls} />
          })}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* ── PANEL: identify ── */}
          {panel === 'identify' && (
            <div>
              <StepIndicator current="identify" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Identify Yourself
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Enter your perm number to begin.
              </p>
              <input
                type="text"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="e.g. 1234567"
                value={studentId}
                onChange={(e) => { setStudentId(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
                autoFocus
              />
              {error && <p className="text-xs mb-4" style={{ color: '#dc2626' }}>{error}</p>}
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleIdentify}
                disabled={loading}
              >
                {loading ? 'Checking…' : 'Begin →'}
              </button>
            </div>
          )}

          {/* ── PANEL: q1 — Estimate ── */}
          {panel === 'q1' && (
            <div>
              <StepIndicator current="q1" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Question 1: Estimate
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Context
                </p>
                <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                  You see a jar containing an unknown number of kernels.
                  Each kernel is worth $1, so the value of the jar equals the number of kernels inside it.
                </p>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                How many kernels do you think are in the jar?
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Number of kernels"
                min="0"
                step="1"
                value={estimate}
                onChange={(e) => { setEstimate(e.target.value); setInputError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleQ1()}
                autoFocus
              />
              {inputError && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{inputError}</p>}
              <div className="flex gap-3 mt-2">
                <button className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm" onClick={goBack}>
                  ← Back
                </button>
                <button className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm" onClick={handleQ1}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── PANEL: q2 — 2-bidder auction ── */}
          {panel === 'q2' && (
            <div>
              <StepIndicator current="q2" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Question 2: 1 Bidder
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>

              <ContextBar estimate={estimate} />

              <p className="text-sm mb-6" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                You are bidding in a <strong>first-price sealed-bid auction</strong> against{' '}
                <strong>1 other bidder</strong>. Everyone submits one private bid; the highest
                bidder wins and pays their own bid. How much would you bid for the jar?
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Your bid ($)"
                min="0"
                step="1"
                value={bid2}
                onChange={(e) => { setBid2(e.target.value); setInputError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleQ2()}
                autoFocus
              />
              {inputError && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{inputError}</p>}
              <div className="flex gap-3 mt-2">
                <button className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm" onClick={goBack}>
                  ← Back
                </button>
                <button className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm" onClick={handleQ2}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── PANEL: q3 — 10-bidder auction ── */}
          {panel === 'q3' && (
            <div>
              <StepIndicator current="q3" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Question 3: 10 Bidders
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>

              <ContextBar estimate={estimate} bid2={bid2} />

              <p className="text-sm mb-6" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                Same first-price sealed-bid auction, but now against{' '}
                <strong>9 other bidders</strong>. How much would you bid for the jar?
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Your bid ($)"
                min="0"
                step="1"
                value={bid10}
                onChange={(e) => { setBid10(e.target.value); setInputError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleQ3()}
                autoFocus
              />
              {inputError && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{inputError}</p>}
              <div className="flex gap-3 mt-2">
                <button className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm" onClick={goBack}>
                  ← Back
                </button>
                <button className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm" onClick={handleQ3}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── PANEL: q4 — 100-bidder auction ── */}
          {panel === 'q4' && (
            <div>
              <StepIndicator current="q4" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Question 4: 100 Bidders
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>

              <ContextBar estimate={estimate} bid2={bid2} bid10={bid10} />

              <p className="text-sm mb-6" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                Same first-price sealed-bid auction, but now against{' '}
                <strong>99 other bidders</strong>. How much would you bid for the jar?
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Your bid ($)"
                min="0"
                step="1"
                value={bid100}
                onChange={(e) => { setBid100(e.target.value); setInputError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleQ4()}
                autoFocus
              />
              {inputError && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{inputError}</p>}
              <div className="flex gap-3 mt-2">
                <button className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm" onClick={goBack} disabled={loading}>
                  ← Back
                </button>
                <button className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm" onClick={handleQ4} disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit →'}
                </button>
              </div>
            </div>
          )}

          {/* ── PANEL: complete ── */}
          {panel === 'complete' && (
            <div className="text-center">
              <div
                className="text-2xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto font-bold"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                ✓
              </div>
              {alreadySubmitted ? (
                <>
                  <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                    Already Submitted
                  </h2>
                  <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                    Your responses for <strong>{studentId.trim()}</strong> are already recorded.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                    Responses Recorded
                  </h2>
                  <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                    Thank you, {studentId.trim()}. Your answers have been saved.
                  </p>
                </>
              )}
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

// ── Context reminder bar ──────────────────────────────────────────────────────

function ContextBar({
  estimate,
  bid2,
  bid10,
}: {
  estimate?: string
  bid2?: string
  bid10?: string
}) {
  const items: { label: string; value: string }[] = []
  if (estimate) items.push({ label: 'Estimate', value: `${parseFloat(estimate).toLocaleString()} kernels` })
  if (bid2) items.push({ label: 'Bid (1 bidder)', value: `$${parseFloat(bid2).toLocaleString()}` })
  if (bid10) items.push({ label: 'Bid (10 bidders)', value: `$${parseFloat(bid10).toLocaleString()}` })
  if (items.length === 0) return null
  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs rounded-lg px-4 py-3 mb-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {items.map((item, i) => (
        <span key={i} style={{ color: 'var(--text-muted)' }}>
          {item.label}:{' '}
          <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{item.value}</span>
        </span>
      ))}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { key: Panel; label: string }[] = [
  { key: 'identify', label: 'Identify' },
  { key: 'q1', label: 'Estimate' },
  { key: 'q2', label: '1 Other' },
  { key: 'q3', label: '9 Others' },
  { key: 'q4', label: '99 Others' },
]

function StepIndicator({ current }: { current: Panel }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current)
  const visibleSteps = STEPS.slice(0, currentIdx + 1)
  return (
    <div className="flex items-center gap-1">
      {visibleSteps.map((step, i) => {
        const active = step.key === current
        const done = i < currentIdx
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className="w-5 h-px" style={{ background: 'var(--navy)' }} />
            )}
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{
                background: 'var(--navy)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {done ? '✓' : i + 1}
            </span>
          </div>
        )
      })}
    </div>
  )
}
