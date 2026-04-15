'use client'

import Link from 'next/link'
import { useState } from 'react'

const C_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90]

type Panel = 'identify' | 'survey' | 'confirm' | 'complete'

export default function RiskAversionFlow() {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [probabilities, setProbabilities] = useState<string[]>(Array(9).fill(''))
  const [fieldErrors, setFieldErrors] = useState<string[]>(Array(9).fill(''))
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Identify ────────────────────────────────────────────────────────────────

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your Student ID.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/risk-aversion/check?student_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (json.submitted) {
        setAlreadySubmitted(true)
        setPanel('complete')
      } else {
        setPanel('survey')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Survey ──────────────────────────────────────────────────────────────────

  function handleProbChange(i: number, value: string) {
    setProbabilities((prev) => { const n = [...prev]; n[i] = value; return n })
    setFieldErrors((prev) => { const n = [...prev]; n[i] = ''; return n })
    setError('')
  }

  function validateAndReview() {
    const parsed: number[] = []
    const errors = Array(9).fill('')
    let hasError = false

    for (let i = 0; i < 9; i++) {
      const v = parseFloat(probabilities[i])
      if (isNaN(v) || v <= 0 || v > 1) {
        errors[i] = 'Enter 0 < p ≤ 1'
        hasError = true
      } else {
        parsed.push(v)
      }
    }

    if (hasError) { setFieldErrors(errors); return }

    for (let i = 0; i < 8; i++) {
      if (parsed[i] > parsed[i + 1]) {
        setError(
          `p for $${C_VALUES[i]} (${parsed[i].toFixed(2)}) exceeds p for $${C_VALUES[i + 1]} ` +
          `(${parsed[i + 1].toFixed(2)}). Probabilities should weakly increase with C.`
        )
        return
      }
    }

    setError('')
    setPanel('confirm')
  }

  // ── Confirm ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const probs = C_VALUES.map((_, i) => parseFloat(probabilities[i]))
      const res = await fetch('/api/risk-aversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), probabilities: probs }),
      })

      if (res.status === 409) {
        setAlreadySubmitted(true)
        setPanel('complete')
        return
      }
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Submission failed. Please try again.')
        return
      }

      setPanel('complete')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  const isSurvey = panel === 'survey' || panel === 'confirm'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header — matches BidFlow exactly */}
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
            Assignment 2: Risk Aversion
          </span>
        </div>
        <div style={{ width: '4rem' }} />
      </header>

      <main
        className="flex-1 flex px-6 py-12"
        style={{ alignItems: isSurvey ? 'flex-start' : 'center', justifyContent: 'center' }}
      >
        <div className={`w-full ${isSurvey ? 'max-w-2xl' : 'max-w-md'}`}>

          {/* ── PANEL: identify ── */}
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
                {loading ? 'Checking…' : 'Begin Survey →'}
              </button>
            </div>
          )}

          {/* ── PANEL: survey ── */}
          {panel === 'survey' && (
            <div>
              <StepIndicator step={2} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Your Indifference Probabilities
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Student ID: {studentId.trim()}
              </p>

              {/* Scenarios card */}
              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  The two scenarios
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg p-3" style={{ background: 'white', border: '1px solid var(--border)' }}>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                      Scenario A — Gamble
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                      Win <strong>$100</strong> with probability <em>p</em>,{' '}
                      and <strong>$0</strong> with probability <em>1 − p</em>.
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'white', border: '1px solid var(--border)' }}>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                      Scenario B — Certain
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                      Receive <strong>$C</strong> with certainty.
                    </p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  For each cash amount <em>C</em> below, enter the probability <em>p</em> at which
                  you are <strong>indifferent</strong> between Scenario A and Scenario B.
                </p>
              </div>

              {/* Probability table */}
              <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--navy)', color: 'white' }}>
                      <th style={thStyle}>i</th>
                      <th style={thStyle}>C<sub>i</sub></th>
                      <th style={thStyle}>p<sub>i</sub> — your indifference probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {C_VALUES.map((c, i) => (
                      <tr key={c} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--surface)' }}>
                        <td style={tdMuted}>{i + 1}</td>
                        <td style={tdBold}>${c}</td>
                        <td style={{ padding: '0.4rem 1rem' }}>
                          <input
                            type="number"
                            min="0.01"
                            max="1"
                            step="0.01"
                            placeholder="0.00"
                            value={probabilities[i]}
                            onChange={(e) => handleProbChange(i, e.target.value)}
                            style={{
                              width: '100px',
                              border: `1.5px solid ${fieldErrors[i] ? '#dc2626' : 'var(--border)'}`,
                              borderRadius: '6px',
                              padding: '0.3rem 0.5rem',
                              fontFamily: 'inherit',
                              fontSize: '0.85rem',
                              background: 'white',
                              color: 'var(--text)',
                              outline: 'none',
                            }}
                          />
                          {fieldErrors[i] && (
                            <span style={{ color: '#dc2626', fontSize: '0.68rem', marginLeft: '6px' }}>
                              {fieldErrors[i]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* C=$100 fixed row */}
                    <tr style={{ background: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                      <td style={tdMuted}>10</td>
                      <td style={tdBold}>$100</td>
                      <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        1.00 &nbsp;(fixed)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 mb-4 text-sm"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', lineHeight: 1.6 }}>
                  {error}
                </div>
              )}

              <button className="btn-gold w-full rounded-lg px-4 py-3 text-sm" onClick={validateAndReview}>
                Review My Answers →
              </button>
            </div>
          )}

          {/* ── PANEL: confirm ── */}
          {panel === 'confirm' && (
            <div>
              <StepIndicator step={3} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Review & Submit
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Student ID: {studentId.trim()}
              </p>

              <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--navy)', color: 'white' }}>
                      <th style={thStyle}>C</th>
                      <th style={thStyle}>Your p</th>
                    </tr>
                  </thead>
                  <tbody>
                    {C_VALUES.map((c, i) => (
                      <tr key={c} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--surface)' }}>
                        <td style={tdBold}>${c}</td>
                        <td style={{ padding: '0.5rem 1rem', color: 'var(--text)' }}>{parseFloat(probabilities[i]).toFixed(3)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                      <td style={tdBold}>$100</td>
                      <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>1.000 (fixed)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {error && (
                <p className="text-xs mb-4" style={{ color: '#dc2626' }}>{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={() => { setPanel('survey'); setError('') }}
                  disabled={loading}
                >
                  ← Edit
                </button>
                <button
                  className="btn-gold flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={handleSubmit}
                  disabled={loading}
                >
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

// ── Shared cell styles ───────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  textAlign: 'left',
  fontFamily: 'inherit',
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 500,
}

const tdMuted: React.CSSProperties = {
  padding: '0.5rem 1rem',
  color: 'var(--text-muted)',
  fontSize: '0.78rem',
}

const tdBold: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontWeight: 600,
  color: 'var(--text)',
}

// ── Step indicator — same pattern as BidFlow ─────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Identify', 'Survey', 'Confirm']
  return (
    <div className="flex gap-2 items-center">
      {steps.map((label, i) => {
        const s = i + 1
        const active = s === step
        const done = s < step
        return (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-6 h-px" style={{ background: done ? 'var(--navy)' : 'var(--border)' }} />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: active || done ? 'var(--navy)' : 'var(--surface2)',
                  color: active || done ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {done ? '✓' : s}
              </span>
              <span className="text-xs" style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

