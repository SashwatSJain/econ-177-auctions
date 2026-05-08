'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

export type NumBidders = 2 | 5 | 10

type Panel = 'identify' | 'bid' | 'waiting' | 'leftover' | 'results'

interface AllPayEntry {
  id: string
  student_id: string
  num_bidders: number
  bid: number | null
  group_id: string | null
  role: number | null
}

function fmt(n: number) {
  if (n < 0) return `-$${(-n).toFixed(2)}`
  return `$${n.toFixed(2)}`
}

export default function AllPayAuction({ numBidders }: { numBidders: NumBidders }) {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [entry, setEntry] = useState<AllPayEntry | null>(null)
  const [bid, setBid] = useState('')
  const [group, setGroup] = useState<AllPayEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputError, setInputError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (panel !== 'waiting' || !studentId) return

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/exp6/result?student_id=${encodeURIComponent(studentId.trim().toLowerCase())}&num_bidders=${numBidders}`
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.status === 'ready') {
          setGroup(json.group)
          setPanel('results')
        } else if (json.status === 'leftover') {
          setPanel('leftover')
        }
      } catch { /* network hiccup */ }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [panel, studentId, numBidders])

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your perm number.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/exp6/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: id, num_bidders: numBidders }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error joining.'); return }
      setEntry(json)
      if (json.bid !== null) {
        if (json.group_id) {
          const r = await fetch(
            `/api/exp6/result?student_id=${encodeURIComponent(id.toLowerCase())}&num_bidders=${numBidders}`
          )
          const rj = await r.json()
          if (rj.status === 'ready') { setGroup(rj.group); setPanel('results') }
          else if (rj.status === 'leftover') setPanel('leftover')
          else setPanel('waiting')
        } else {
          setPanel('waiting')
        }
      } else {
        setPanel('bid')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBid() {
    const trimmed = bid.trim()
    const b = parseFloat(trimmed)

    if (!isFinite(b) || b < 0) {
      setInputError('Enter a non-negative number.')
      return
    }

    setInputError('')
    setLoading(true)
    try {
      const res = await fetch('/api/exp6/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), bid: b, num_bidders: numBidders }),
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
            All-Pay Auction · {numBidders} Bidders
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
                All-Pay Auction
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                A sealed-bid auction of a $100 bill with {numBidders} bidders.
              </p>

              <BillDiagram className="mb-5" />

              <div
                className="rounded-xl px-5 py-4 mb-6 text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', lineHeight: 1.75 }}
              >
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Rules
                </p>
                <ul style={{ color: 'var(--text)', paddingLeft: '1.2em', listStyleType: 'disc' }}>
                  <li>All {numBidders} bidders submit a sealed bid (any amount ≥ $0, decimals allowed).</li>
                  <li><strong>Everyone pays their bid</strong>, regardless of outcome.</li>
                  <li>The <strong>highest bidder</strong> also receives the $100 bill.</li>
                  <li>Ties broken by seat order assigned at random.</li>
                </ul>
                <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Nash equilibrium: each bidder mixes bids uniformly on [0, $100/{numBidders}] ≈ [0, ${(100 / numBidders).toFixed(2)}].
                  Expected payoff = $0 in equilibrium.
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
                {loading ? 'Checking…' : 'Enter Auction →'}
              </button>
            </div>
          )}

          {/* ── PANEL: bid ── */}
          {panel === 'bid' && entry && (
            <div>
              <h2 className="serif text-3xl mb-2 mt-2" style={{ color: 'var(--text)' }}>
                Submit Your Bid
              </h2>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>

              <div
                className="rounded-xl p-4 mb-5"
                style={{ background: 'var(--surface)', border: '2px solid var(--navy)' }}
              >
                <BillDiagram />
                <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                  Prize: $100 bill · {numBidders}-bidder all-pay auction
                </p>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                You are competing against {numBidders - 1} other bidder{numBidders > 2 ? 's' : ''}.
                {' '}<strong>You will pay your bid no matter what.</strong>{' '}
                The highest bidder also receives the $100. Enter any amount ≥ $0.
              </p>

              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Your bid (any amount ≥ $0, decimals ok):
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder="e.g. 45.00"
                min="0"
                step="0.01"
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
                {loading ? 'Submitting…' : 'Lock In Bid →'}
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
                Your bid of{' '}
                <strong style={{ color: 'var(--navy)' }}>{fmt(entry.bid!)}</strong>{' '}
                has been recorded.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Waiting for the instructor to reveal results…
              </p>
            </div>
          )}

          {/* ── PANEL: leftover ── */}
          {panel === 'leftover' && (
            <div className="text-center">
              <div
                className="text-2xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--surface)', border: '2px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>—</span>
              </div>
              <h2 className="serif text-3xl mb-3" style={{ color: 'var(--text)' }}>
                Not Grouped
              </h2>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Your bid was recorded, but you weren&apos;t placed in a group this round
                (not enough bidders for a complete group of {numBidders}).
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Let your instructor know — they can run another round.
              </p>
            </div>
          )}

          {/* ── PANEL: results ── */}
          {panel === 'results' && group.length > 0 && entry && (
            <GroupResults group={group} ownId={entry.id} studentId={studentId.trim()} />
          )}

        </div>
      </main>
    </div>
  )
}

// ── Results display ──────────────────────────────────────────────────────────

function GroupResults({
  group,
  ownId,
  studentId,
}: {
  group: AllPayEntry[]
  ownId: string
  studentId: string
}) {
  const sorted = [...group].sort((a, b) => b.bid! - a.bid! || a.role! - b.role!)
  const winner = sorted[0]
  const own = group.find((m) => m.id === ownId)!
  const isWinner = own.id === winner.id
  const payoff = isWinner ? 100 - own.bid! : -own.bid!

  return (
    <div>
      <h2 className="serif text-3xl mb-2 mt-2" style={{ color: 'var(--text)' }}>
        Results
      </h2>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Perm: {studentId}
      </p>

      {/* All bids ranked */}
      <div
        className="rounded-xl mb-4 overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Bidder</th>
              <th style={thStyle}>Bid</th>
              <th style={thStyle}>Payoff</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const mPayoff = m.id === winner.id ? 100 - m.bid! : -m.bid!
              const isOwn = m.id === ownId
              const isWin = m.id === winner.id
              return (
                <tr
                  key={m.id}
                  style={{
                    background: isOwn ? 'rgba(0,54,96,0.05)' : i % 2 === 0 ? 'transparent' : 'var(--surface)',
                    fontWeight: isOwn ? 600 : 400,
                  }}
                >
                  <td style={tdStyle}>{i === 0 ? '🏆 1' : i + 1}</td>
                  <td style={{ ...tdStyle, color: isOwn ? 'var(--navy)' : 'var(--text)' }}>
                    {isOwn ? 'You' : `Bidder ${m.role}`}
                  </td>
                  <td style={tdStyle}>{fmt(m.bid!)}</td>
                  <td style={{ ...tdStyle, color: mPayoff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {mPayoff >= 0 ? `+${fmt(mPayoff)}` : fmt(mPayoff)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Your outcome */}
      <div
        className="rounded-xl p-5 text-center"
        style={{
          background: isWinner ? 'rgba(0,54,96,0.06)' : 'var(--surface)',
          border: `2px solid ${isWinner ? 'var(--navy)' : 'var(--border)'}`,
        }}
      >
        <p
          className="text-xs uppercase tracking-widest mb-2"
          style={{ color: isWinner ? 'var(--navy)' : 'var(--text-muted)', fontWeight: 600 }}
        >
          {isWinner ? '🏆 You Won' : 'You Lost'}
        </p>
        <p className="serif text-4xl" style={{ color: isWinner ? 'var(--navy)' : '#dc2626' }}>
          {payoff >= 0 ? `+${fmt(payoff)}` : fmt(payoff)}
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {isWinner
            ? `$100 prize − ${fmt(own.bid!)} bid = ${fmt(payoff)}`
            : `You paid your bid of ${fmt(own.bid!)} and received nothing.`}
        </p>
      </div>

      {/* Total collected */}
      <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
        Total bids collected by seller:{' '}
        <strong>${group.reduce((s, m) => s + m.bid!, 0).toFixed(2)}</strong>
      </p>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  fontWeight: 600,
  borderBottom: '1px solid var(--border)',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
}

// ── Bill diagram ─────────────────────────────────────────────────────────────

function BillDiagram({ className = '' }: { className?: string }) {
  const W = 280, H = 126
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}
      aria-label="$100 bill"
    >
      <defs>
        <linearGradient id="billGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d6a4f" />
          <stop offset="100%" stopColor="#1b4332" />
        </linearGradient>
        <pattern id="billPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
      {/* Bill body */}
      <rect x={4} y={4} width={W - 8} height={H - 8} rx={6} fill="url(#billGrad)" />
      <rect x={4} y={4} width={W - 8} height={H - 8} rx={6} fill="url(#billPattern)" />
      {/* Outer border */}
      <rect x={4} y={4} width={W - 8} height={H - 8} rx={6} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
      {/* Inner decorative border */}
      <rect x={12} y={12} width={W - 24} height={H - 24} rx={3} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      {/* "$100" text */}
      <text
        x={W / 2} y={H / 2 + 14}
        textAnchor="middle"
        fontSize={46}
        fontWeight="700"
        fontFamily="Georgia, serif"
        fill="rgba(255,255,255,0.92)"
        letterSpacing="-1"
      >
        $100
      </text>
      {/* Corner labels */}
      {[{ x: 22, y: 26 }, { x: W - 22, y: 26 }, { x: 22, y: H - 16 }, { x: W - 22, y: H - 16 }].map((pos, i) => (
        <text
          key={i}
          x={pos.x} y={pos.y}
          textAnchor="middle"
          fontSize={9}
          fontFamily="Georgia, serif"
          fill="rgba(255,255,255,0.55)"
          fontWeight="600"
        >
          100
        </text>
      ))}
      {/* "THE UNITED STATES OF AMERICA" label */}
      <text
        x={W / 2} y={23}
        textAnchor="middle"
        fontSize={7}
        fontFamily="inherit"
        fill="rgba(255,255,255,0.45)"
        letterSpacing="2"
      >
        THE UNITED STATES OF AMERICA
      </text>
    </svg>
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
