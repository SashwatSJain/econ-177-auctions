'use client'

import Link from 'next/link'
import { useState } from 'react'

const QUESTIONS = [
  {
    key: 'estimate' as const,
    label: 'Estimate',
    question: 'How many kernels do you think are in the jar?',
    sublabel: 'kernels',
  },
  {
    key: 'bid_2' as const,
    label: '2-Bidder Bid',
    question: 'You are bidding in a first-price sealed-bid auction against 1 other bidder. How much would you bid for the jar?',
    sublabel: 'dollars',
  },
  {
    key: 'bid_10' as const,
    label: '10-Bidder Bid',
    question: 'Same auction, but against 9 other bidders. How much would you bid?',
    sublabel: 'dollars',
  },
  {
    key: 'bid_100' as const,
    label: '100-Bidder Bid',
    question: 'Same auction, but against 99 other bidders. How much would you bid?',
    sublabel: 'dollars',
  },
]

type FieldKey = 'estimate' | 'bid_2' | 'bid_10' | 'bid_100'
type Panel = 'identify' | 'survey' | 'confirm' | 'complete'

export default function Experiment4Flow() {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [values, setValues] = useState<Record<FieldKey, string>>({
    estimate: '', bid_2: '', bid_10: '', bid_100: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<FieldKey, string>>({
    estimate: '', bid_2: '', bid_10: '', bid_100: '',
  })
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Identify ─────────────────────────────────────────────────────────────────

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
        setPanel('survey')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Survey ────────────────────────────────────────────────────────────────────

  function handleChange(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
    setError('')
  }

  function validateAndReview() {
    const errors: Record<FieldKey, string> = { estimate: '', bid_2: '', bid_10: '', bid_100: '' }
    let hasError = false

    for (const q of QUESTIONS) {
      const v = parseFloat(values[q.key])
      if (isNaN(v) || v < 0) {
        errors[q.key] = 'Enter a number ≥ 0'
        hasError = true
      }
    }

    if (hasError) { setFieldErrors(errors); return }
    setError('')
    setPanel('confirm')
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/experiment4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim(),
          estimate: parseFloat(values.estimate),
          bid_2: parseFloat(values.bid_2),
          bid_10: parseFloat(values.bid_10),
          bid_100: parseFloat(values.bid_100),
        }),
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

  // ── Layout ────────────────────────────────────────────────────────────────────

  const isSurvey = panel === 'survey' || panel === 'confirm'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

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
                {loading ? 'Checking…' : 'Begin Survey →'}
              </button>
            </div>
          )}

          {/* ── PANEL: survey ── */}
          {panel === 'survey' && (
            <div>
              <StepIndicator step={2} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Estimating and Bidding for the Jar
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm number: {studentId.trim()}
              </p>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Context
                </p>
                <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                  You see a jar containing an unknown number of kernels. Each kernel is worth $1,
                  so the value of the jar equals the number of kernels inside it.
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Please answer each question independently. Do not discuss your answers with others.
                </p>
              </div>

              <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--navy)', color: 'white' }}>
                      <th style={thStyle}>Question</th>
                      <th style={{ ...thStyle, width: '160px' }}>Your Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUESTIONS.map((q, i) => (
                      <tr
                        key={q.key}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'white' : 'var(--surface)',
                          verticalAlign: 'top',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                            Q{i + 1}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.65 }}>
                            {q.question}
                          </p>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={values[q.key]}
                            onChange={(e) => handleChange(q.key, e.target.value)}
                            style={{
                              width: '100%',
                              border: `1.5px solid ${fieldErrors[q.key] ? '#dc2626' : 'var(--border)'}`,
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              fontFamily: 'inherit',
                              fontSize: '0.85rem',
                              background: 'white',
                              color: 'var(--text)',
                              outline: 'none',
                            }}
                          />
                          {fieldErrors[q.key] && (
                            <span style={{ color: '#dc2626', fontSize: '0.68rem', display: 'block', marginTop: '3px' }}>
                              {fieldErrors[q.key]}
                            </span>
                          )}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                            {q.sublabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div
                  className="rounded-lg px-4 py-3 mb-4 text-sm"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', lineHeight: 1.6 }}
                >
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
                Perm number: {studentId.trim()}
              </p>

              <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--navy)', color: 'white' }}>
                      <th style={thStyle}>Question</th>
                      <th style={{ ...thStyle, width: '120px' }}>Your Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUESTIONS.map((q, i) => (
                      <tr
                        key={q.key}
                        style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--surface)' }}
                      >
                        <td style={{ padding: '0.5rem 1rem', color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--navy)', fontWeight: 600, marginRight: '0.4rem' }}>Q{i + 1}</span>
                          {q.label}
                        </td>
                        <td style={{ padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--text)' }}>
                          {parseFloat(values[q.key]).toLocaleString()} {q.sublabel}
                        </td>
                      </tr>
                    ))}
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

// ── Shared cell styles ────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  textAlign: 'left',
  fontFamily: 'inherit',
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 500,
}

// ── Step indicator ────────────────────────────────────────────────────────────

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
