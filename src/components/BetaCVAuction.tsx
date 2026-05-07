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
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                A sealed-bid auction with private signals.
              </p>

              <WellDiagram className="mb-4" />
              <OutcomeTable className="mb-6" />

              <div
                className="rounded-xl px-5 py-4 mb-6 text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', lineHeight: 1.75 }}
              >
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Rules
                </p>
                <p style={{ color: 'var(--text)' }}>
                  You see only your own half. Both firms submit a sealed integer bid
                  from <strong>$0 to $6</strong>. The higher bid wins the well and
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
                className="rounded-xl p-4 mb-4"
                style={{ background: 'var(--surface)', border: '2px solid var(--navy)' }}
              >
                <WellDiagram myValue={entry.half_value} />
                <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                  {entry.half_value === 3
                    ? 'Your half = $3. Partner\'s half is $0 or $3, so V = $3 or $6 (each equally likely).'
                    : 'Your half = $0. Partner\'s half is $0 or $3, so V = $0 or $3 (each equally likely).'}
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

// ── Well diagram ────────────────────────────────────────────────────────────

function WellDiagram({ myValue, className = '' }: { myValue?: number; className?: string }) {
  const revealed = myValue !== undefined
  const leftLabel = revealed ? `$${myValue}` : '?'
  const W = 280, H = 140
  const cx = W / 2
  // ground line y
  const groundY = 28
  // well rect
  const wellX = 30, wellY = groundY, wellW = W - 60, wellH = H - groundY - 12

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}
      aria-label="Oil well cross-section"
    >
      {/* ground */}
      <rect x={0} y={0} width={W} height={groundY} fill="#e8dcc8" />
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#a08060" strokeWidth={1.5} />
      <text x={W / 2} y={groundY - 7} textAnchor="middle" fontSize={9} fill="#a08060" fontFamily="inherit" letterSpacing="1">
        GROUND SURFACE
      </text>

      {/* left half — your half */}
      <rect
        x={wellX} y={wellY} width={wellW / 2 - 1} height={wellH}
        fill={revealed && myValue === 3 ? '#003660' : revealed ? '#f0ede8' : '#e8e0d4'}
        stroke="#8a7050" strokeWidth={1}
      />
      {/* right half — partner's half */}
      <rect
        x={cx + 1} y={wellY} width={wellW / 2 - 1} height={wellH}
        fill="#e8e0d4"
        stroke="#8a7050" strokeWidth={1}
      />

      {/* center divider */}
      <line x1={cx} y1={wellY} x2={cx} y2={wellY + wellH} stroke="#8a7050" strokeWidth={2} strokeDasharray="4 3" />

      {/* left label */}
      <text
        x={wellX + (wellW / 2 - 1) / 2} y={wellY + wellH / 2 - 8}
        textAnchor="middle" fontSize={22} fontWeight="700"
        fill={revealed && myValue === 3 ? '#ffffff' : '#003660'}
        fontFamily="Georgia, serif"
      >
        {leftLabel}
      </text>
      <text
        x={wellX + (wellW / 2 - 1) / 2} y={wellY + wellH / 2 + 10}
        textAnchor="middle" fontSize={9} fill={revealed && myValue === 3 ? '#c8d8e8' : '#6b5a45'}
        fontFamily="inherit" letterSpacing="0.5"
      >
        YOUR HALF
      </text>

      {/* right label */}
      <text
        x={cx + 1 + (wellW / 2 - 1) / 2} y={wellY + wellH / 2 - 8}
        textAnchor="middle" fontSize={22} fontWeight="700" fill="#8a7050"
        fontFamily="Georgia, serif"
      >
        ?
      </text>
      <text
        x={cx + 1 + (wellW / 2 - 1) / 2} y={wellY + wellH / 2 + 10}
        textAnchor="middle" fontSize={9} fill="#6b5a45"
        fontFamily="inherit" letterSpacing="0.5"
      >
        PARTNER&apos;S HALF
      </text>
    </svg>
  )
}

// ── Outcome table ────────────────────────────────────────────────────────────

function OutcomeTable({ className = '' }: { className?: string }) {
  const rows = [
    { yours: 0, theirs: 0, v: 0 },
    { yours: 0, theirs: 3, v: 3 },
    { yours: 3, theirs: 0, v: 3 },
    { yours: 3, theirs: 3, v: 6 },
  ]
  const cellStyle = {
    padding: '6px 10px',
    textAlign: 'center' as const,
    fontSize: 13,
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
  }
  const headStyle = {
    ...cellStyle,
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
    fontWeight: 600,
    background: 'var(--surface)',
  }
  return (
    <div className={className} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={headStyle}>Your Half</th>
            <th style={headStyle}>Partner&apos;s Half</th>
            <th style={headStyle}>Well Value V</th>
            <th style={headStyle}>Probability</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
              <td style={{ ...cellStyle, borderBottom: i === rows.length - 1 ? 'none' : cellStyle.borderBottom }}>${r.yours}</td>
              <td style={{ ...cellStyle, borderBottom: i === rows.length - 1 ? 'none' : cellStyle.borderBottom }}>${r.theirs}</td>
              <td style={{ ...cellStyle, borderBottom: i === rows.length - 1 ? 'none' : cellStyle.borderBottom, fontWeight: 600, color: 'var(--navy)' }}>${r.v}</td>
              <td style={{ ...cellStyle, borderBottom: i === rows.length - 1 ? 'none' : cellStyle.borderBottom }}>¼</td>
            </tr>
          ))}
        </tbody>
      </table>
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
