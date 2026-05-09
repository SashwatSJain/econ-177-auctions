'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type Panel = 'identify' | 'form' | 'confirm' | 'complete'

interface GpsState {
  status: 'idle' | 'acquiring' | 'acquired' | 'error'
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  errorMsg: string
}

export default function AttendanceFlow() {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [codeWord, setCodeWord] = useState('')
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gps, setGps] = useState<GpsState>({
    status: 'idle',
    latitude: null,
    longitude: null,
    accuracy: null,
    errorMsg: '',
  })

  // Acquire GPS as soon as the form panel appears
  useEffect(() => {
    if (panel !== 'form') return
    if (gps.status !== 'idle') return

    if (!navigator.geolocation) {
      setGps((g) => ({
        ...g,
        status: 'error',
        errorMsg: 'Geolocation is not available. Please use HTTPS or a supported browser.',
      }))
      return
    }

    setGps((g) => ({ ...g, status: 'acquiring' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          status: 'acquired',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          errorMsg: '',
        })
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'Location access denied. Please tap Allow when your browser asks for location.'
            : err.code === 2
            ? 'Location unavailable. Make sure Location Services is enabled on your device.'
            : 'Location timed out. Please check your signal and try again.'
        setGps((g) => ({ ...g, status: 'error', errorMsg: msg }))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [panel, gps.status])

  // ── Identify ──────────────────────────────────────────────────────────────

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your PERM number.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/check?student_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (json.submitted) {
        setAlreadySubmitted(true)
        setPanel('complete')
      } else {
        setPanel('form')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  function handleReview() {
    if (gps.status !== 'acquired') {
      setError('Waiting for location. Please allow location access and try again.')
      return
    }
    if (!codeWord.trim()) {
      setError('Please enter the code word.')
      return
    }
    setError('')
    setPanel('confirm')
  }

  function retryGps() {
    setGps({ status: 'idle', latitude: null, longitude: null, accuracy: null, errorMsg: '' })
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim(),
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          code_word: codeWord.trim(),
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

  // ── Layout ────────────────────────────────────────────────────────────────

  const isWide = panel === 'form'

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
            Attendance
          </span>
        </div>
        <div style={{ width: '4rem' }} />
      </header>

      <main
        className="flex-1 flex px-6 py-12"
        style={{ alignItems: isWide ? 'flex-start' : 'center', justifyContent: 'center' }}
      >
        <div className={`w-full ${isWide ? 'max-w-lg' : 'max-w-md'}`}>

          {/* ── PANEL: identify ── */}
          {panel === 'identify' && (
            <div>
              <StepIndicator step={1} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Sign In
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                Enter your PERM number to record your attendance.
              </p>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                PERM Number
              </label>
              <input
                type="text"
                inputMode="numeric"
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
                {loading ? 'Checking…' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ── PANEL: form ── */}
          {panel === 'form' && (
            <div>
              <StepIndicator step={2} />
              <h2 className="serif text-3xl mb-2 mt-6" style={{ color: 'var(--text)' }}>
                Attendance Details
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                PERM: {studentId.trim()}
              </p>

              {/* GPS status card */}
              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Location
                </p>
                {gps.status === 'acquiring' && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Acquiring location…
                  </p>
                )}
                {gps.status === 'acquired' && (
                  <p className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
                    ✓ Location acquired
                  </p>
                )}
                {gps.status === 'error' && (
                  <div>
                    <p className="text-sm mb-2" style={{ color: '#dc2626' }}>{gps.errorMsg}</p>
                    <button
                      className="text-xs underline"
                      style={{ color: 'var(--navy)' }}
                      onClick={retryGps}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Code word */}
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Code Word
              </label>
              <input
                type="text"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Enter today's code word"
                value={codeWord}
                onChange={(e) => { setCodeWord(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleReview()}
                autoComplete="off"
              />

              {error && <p className="text-xs mb-4" style={{ color: '#dc2626' }}>{error}</p>}

              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleReview}
                disabled={gps.status === 'acquiring'}
              >
                {gps.status === 'acquiring' ? 'Waiting for location…' : 'Review →'}
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
                Confirm your details before submitting.
              </p>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Row label="PERM Number" value={studentId.trim()} />
                <Row label="Code Word" value={codeWord.trim()} last />
              </div>

              {error && <p className="text-xs mb-4" style={{ color: '#dc2626' }}>{error}</p>}

              <div className="flex gap-3">
                <button
                  className="btn-ghost flex-1 rounded-lg px-4 py-3 text-sm"
                  onClick={() => { setPanel('form'); setError('') }}
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
                    Already Recorded
                  </h2>
                  <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                    Attendance for <strong>{studentId.trim()}</strong> is already on record for today.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                    Attendance Recorded
                  </h2>
                  <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                    Thank you, {studentId.trim()}. You&apos;re marked present for today.
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

// ── Helper components ────────────────────────────────────────────────────────

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="flex justify-between py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Identify', 'Details', 'Confirm']
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
