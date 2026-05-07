'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

type Panel = 'identify' | 'signal_bid' | 'waiting' | 'results'

interface Entry {
  id: string
  half_value: number
  bid: number | null
  pair_id: string | null
  role: 'a' | 'b' | null
}

interface ResultPayload {
  own: Entry & { half_value: number; bid: number; role: 'a' | 'b' }
  partner: Entry & { half_value: number; bid: number; role: 'a' | 'b' }
}

export default function BetaCVAuction() {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [entry, setEntry] = useState<Entry | null>(null)
  const [bid, setBid] = useState('')
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputError, setInputError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for results once in 'waiting' state
  useEffect(() => {
    if (panel !== 'waiting' || !studentId) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/beta/cv-auction/result?student_id=${encodeURIComponent(studentId.trim().toLowerCase())}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.status === 'ready') {
          setResult(json)
          setPanel('results')
        }
      } catch { /* network hiccup — try again next tick */ }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [panel, studentId])

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your perm number.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/beta/cv-auction/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: id }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error joining.'); return }
      setEntry(json)
      if (json.bid !== null) {
        // Already submitted — go to waiting or results directly
        if (json.pair_id) {
          // Check if result is ready
          const r = await fetch(`/api/beta/cv-auction/result?student_id=${encodeURIComponent(id.toLowerCase())}`)
          const rj = await r.json()
          if (rj.status === 'ready') { setResult(rj); setPanel('results') }
          else setPanel('waiting')
        } else {
          setPanel('waiting')
        }
      } else {
        setPanel('signal_bid')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBid() {
    const b = parseInt(bid, 10)
    if (!Number.isInteger(b) || b < 0 || b > 6) {
      setInputError('Enter a whole number between 0 and 6.')
      return
    }
    setInputError('')
    setLoading(true)
    try {
      const res = await fetch('/api/beta/cv-auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), bid: b }),
      })
      const json = await res.json()
      if (!res.ok) { setInputError(json.error ?? 'Submission failed.'); return }
      setEntry(json)
      setPanel('waiting')
    } catch {
      setInputError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="border-b px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link href="/" className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          ← Home
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--navy)' }}>
            UCSB · Econ 177
          </span>
          <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Beta · Oil Well Auction
          </span>
        </div>
        <div className="w-16" />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* ── PANEL: identify ── */}
          {panel === 'identify' && (
            <div>
              <h2 className="serif text-3xl mb-2 mt-2" style={{ color: 'var(--text)' }}>
                Oil Well Auction
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                A sealed-bid auction with private signals.
              </p>

              <div
                className="rounded-xl p-5 mb-8 text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', lineHeight: 1.75 }}
              >
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Framing
                </p>
                <p style={{ color: 'var(--text)' }}>
                  Two firms bid for an oil well. The well has two halves; each firm
                  has tested one half privately. Each half independently contains{' '}
                  <strong>$3 of oil</strong> with probability ½, else <strong>$0</strong>.
                  The total well value <em>V</em> is the sum — so <em>V</em> ∈ {'{'}0, 3, 6{'}'}.
                </p>
                <p className="mt-3" style={{ color: 'var(--text)' }}>
                  You see only your own test result. Both firms submit a sealed integer
                  bid from <strong>$0 to $6</strong>. The higher bid wins the well and
                  earns <em>V − bid</em>. The loser earns $0. Ties broken randomly.
                </p>
              </div>

              <input
                type="text"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Perm number"
                value={studentId}
                onChange={(e) => { setStudentId(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
              />
              {error && <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{error}</p>}
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleIdentify}
                disabled={loading}
              >
                {loading ? 'Checking…' : 'See My Signal →'}
              </button>
            </div>
          )}

          {/* ── PANEL: signal + bid ── */}
          {panel === 'signal_bid' && entry && (
            <div>
              <h2 className="serif text-3xl mb-2 mt-2" style={{ color: 'var(--text)' }}>
                Your Private Signal
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>

              <div
                className="rounded-xl p-5 mb-6 text-center"
                style={{ background: 'var(--surface)', border: '2px solid var(--navy)' }}
              >
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Your Half of the Well
                </p>
                <p className="serif text-5xl mt-1" style={{ color: 'var(--navy)' }}>
                  ${entry.half_value}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  {entry.half_value === 3
                    ? 'Your half contains oil worth $3.'
                    : 'Your half contains no oil ($0).'}
                </p>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                You are in a <strong>first-price sealed-bid auction</strong> against
                one other firm. Each firm submits one integer bid ($0–$6). The higher
                bid wins and pays that bid; the winner earns <em>V − bid</em>.
              </p>

              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Your bid ($0–$6):
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="Enter a whole number (0–6)"
                min="0"
                max="6"
                step="1"
                value={bid}
                onChange={(e) => { setBid(e.target.value); setInputError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleBid()}
              />
              {inputError && <p className="text-xs mb-2" style={{ color: '#dc2626' }}>{inputError}</p>}
              <button
                className="btn-gold w-full rounded-lg px-4 py-3 text-sm mt-2"
                onClick={handleBid}
                disabled={loading}
              >
                {loading ? 'Submitting…' : 'Submit Bid →'}
              </button>
            </div>
          )}

          {/* ── PANEL: waiting ── */}
          {panel === 'waiting' && entry && (
            <div className="text-center">
              <div
                className="text-2xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--surface)', border: '2px solid var(--navy)' }}
              >
                <WaitingDots />
              </div>
              <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                Bid Submitted
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Your bid of <strong style={{ color: 'var(--navy)' }}>${entry.bid}</strong> has been recorded.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Waiting for the instructor to reveal results…
              </p>
            </div>
          )}

          {/* ── PANEL: results ── */}
          {panel === 'results' && result && (
            <Results own={result.own} partner={result.partner} studentId={studentId.trim()} />
          )}

        </div>
      </main>
    </div>
  )
}

// ── Results display ──────────────────────────────────────────────────────────

function Results({
  own,
  partner,
  studentId,
}: {
  own: { half_value: number; bid: number; role: 'a' | 'b' }
  partner: { half_value: number; bid: number; role: 'a' | 'b' }
  studentId: string
}) {
  const V = own.half_value + partner.half_value
  const tie = own.bid === partner.bid
  const won = own.bid > partner.bid || (tie && own.role === 'a')
  const payoff = won ? V - own.bid : 0

  return (
    <div>
      <h2 className="serif text-3xl mb-2 mt-2" style={{ color: 'var(--text)' }}>
        Results
      </h2>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Perm: {studentId}
      </p>

      {/* Well reveal */}
      <div
        className="grid grid-cols-2 gap-3 rounded-xl p-4 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Your Half
          </p>
          <p className="serif text-3xl" style={{ color: 'var(--navy)' }}>${own.half_value}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Partner's Half
          </p>
          <p className="serif text-3xl" style={{ color: 'var(--navy)' }}>${partner.half_value}</p>
        </div>
        <div className="col-span-2 pt-3 mt-1 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Well Value
          </p>
          <p className="serif text-4xl" style={{ color: 'var(--navy)' }}>${V}</p>
        </div>
      </div>

      {/* Bids */}
      <div
        className="grid grid-cols-2 gap-3 rounded-xl p-4 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Your Bid
          </p>
          <p className="serif text-3xl" style={{ color: won ? 'var(--navy)' : 'var(--text-muted)' }}>
            ${own.bid}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Partner's Bid
          </p>
          <p className="serif text-3xl" style={{ color: !won ? 'var(--navy)' : 'var(--text-muted)' }}>
            ${partner.bid}
          </p>
        </div>
      </div>

      {/* Outcome */}
      <div
        className="rounded-xl p-5 text-center"
        style={{
          background: won ? 'rgba(0,54,96,0.06)' : 'var(--surface)',
          border: `2px solid ${won ? 'var(--navy)' : 'var(--border)'}`,
        }}
      >
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: won ? 'var(--navy)' : 'var(--text-muted)', fontWeight: 600 }}>
          {won ? '🏆 You Won' : 'You Lost'}
          {tie && ' (tie — broken randomly)'}
        </p>
        <p className="serif text-4xl" style={{ color: won ? 'var(--navy)' : 'var(--text-muted)' }}>
          {won ? `+$${payoff}` : '$0'}
        </p>
        {won && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            V − bid = ${V} − ${own.bid} = ${payoff}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Animated waiting dots ────────────────────────────────────────────────────

function WaitingDots() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 500)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-sm font-medium tracking-widest" style={{ color: 'var(--navy)' }}>
      {'···'.slice(0, tick + 1).padEnd(3, ' ')}
    </span>
  )
}
