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

  const questionsAnswered = Q_PANELS.indexOf(panel)

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

      <header
        className="border-b px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="justify-self-start">
          <Link href="/" className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            ← Back
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--navy)' }}>
            UCSB · Econ 177
          </span>
          <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Experiment 4: Penny Jar Experiment
          </span>
        </div>
        <div className="flex gap-1 items-center justify-self-end">
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
                Enter your perm number to begin Experiment 4.
              </p>
              <input
                type="text"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="e.g. 1234567"
                value={studentId}
                onChange={(e) => { setStudentId(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
              />
              {error && <p className="text-xs mb-4" style={{ color: '#dc2626' }}>{error}</p>}
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleIdentify}
                disabled={loading}
              >
                {loading ? 'Checking…' : 'Begin Experiment 4 →'}
              </button>
            </div>
          )}

          {/* ── PANEL: q1 — Estimate ── */}
          {panel === 'q1' && (
            <div>
              <StepIndicator current="q1" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Your Estimate
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm number: {studentId.trim()}
              </p>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Context
                </p>
                <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                  You see a jar containing an unknown number of pennies.
                  Each penny is worth $1, so the value of the jar equals the number of pennies inside it.
                </p>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                How many pennies do you think are in the jar?
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Number of pennies"
                min="0"
                step="1"
                value={estimate}
                onChange={(e) => { setEstimate(e.target.value); setInputError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleQ1()}
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

          {/* ── PANEL: q2 — 1 other bidder ── */}
          {panel === 'q2' && (
            <div>
              <StepIndicator current="q2" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Your Bid
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm number: {studentId.trim()}
              </p>

              <ContextBar estimate={estimate} />

              <p className="text-sm mb-6" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                You are one of <strong>2 bidders</strong> in a <strong>first-price sealed-bid
                auction</strong>. Everyone submits one private bid; the highest bidder wins and pays
                their own bid. How much would you bid for the jar?
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

          {/* ── PANEL: q3 — 9 other bidders ── */}
          {panel === 'q3' && (
            <div>
              <StepIndicator current="q3" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Your Bid
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm number: {studentId.trim()}
              </p>

              <ContextBar estimate={estimate} bid2={bid2} />

              <p className="text-sm mb-6" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                Same first-price sealed-bid auction, but now with{' '}
                <strong>10 bidders</strong> total. How much would you bid for the jar?
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

          {/* ── PANEL: q4 — 99 other bidders ── */}
          {panel === 'q4' && (
            <div>
              <StepIndicator current="q4" />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Your Bid
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm number: {studentId.trim()}
              </p>

              <ContextBar estimate={estimate} bid2={bid2} bid10={bid10} />

              <p className="text-sm mb-6" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                Same first-price sealed-bid auction, but now with{' '}
                <strong>100 bidders</strong> total. How much would you bid for the jar?
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
                    Experiment 4 Complete
                  </h2>
                  <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                    Thank you, {studentId.trim()}. Your answers have been recorded.
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
  if (estimate) items.push({ label: 'Estimate', value: `${parseFloat(estimate).toLocaleString()} pennies` })
  if (bid2) items.push({ label: 'Bid (2 bidders)', value: `$${parseFloat(bid2).toLocaleString()}` })
  if (bid10) items.push({ label: 'Bid (10 bidders)', value: `$${parseFloat(bid10).toLocaleString()}` })
  if (items.length === 0) return null
  return (
    <div
      className="flex flex-wrap gap-4 text-xs rounded-lg px-4 py-3 mb-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {items.map((item, i) => (
        <>
          {i > 0 && <span key={`sep-${i}`} style={{ color: 'var(--border)' }}>|</span>}
          <span key={item.label} style={{ color: 'var(--text-muted)' }}>
            {item.label}:{' '}
            <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{item.value}</span>
          </span>
        </>
      ))}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { key: Panel; label: string }[] = [
  { key: 'identify', label: 'Identify' },
  { key: 'q1', label: 'Estimate' },
  { key: 'q2', label: '2 Bidders' },
  { key: 'q3', label: '10 Bidders' },
  { key: 'q4', label: '100 Bidders' },
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
                background: active || done ? 'var(--navy)' : 'var(--surface2)',
                color: active || done ? '#fff' : 'var(--text-muted)',
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
