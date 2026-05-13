'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

export type NumBidders = 2 | 5 | 10

type Panel = 'identify' | 'bid' | 'done' | 'result'

interface GroupMember {
  id: string
  student_id: string
  bid: number
  role: number
}

interface ResultData {
  own: GroupMember
  group: GroupMember[]
}

function fmt(n: number) {
  if (n < 0) return `-$${(-n).toFixed(2)}`
  return `$${n.toFixed(2)}`
}

function computeWinner(group: GroupMember[]): GroupMember {
  return group.reduce((best, m) =>
    m.bid > best.bid || (m.bid === best.bid && m.role < best.role) ? m : best
  )
}

export default function AllPayAuction({ numBidders }: { numBidders: NumBidders }) {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [bid, setBid] = useState('')
  const [submittedBid, setSubmittedBid] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputError, setInputError] = useState('')
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [resultStatus, setResultStatus] = useState<'waiting' | 'unmatched' | 'ready'>('waiting')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (panel !== 'done') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    async function poll() {
      const res = await fetch(
        `/api/exp6/result?student_id=${encodeURIComponent(studentId.trim())}&num_bidders=${numBidders}`
      )
      if (!res.ok) return
      const json = await res.json()
      if (json.status === 'ready') {
        setResultData(json)
        setResultStatus('ready')
        setPanel('result')
        if (pollRef.current) clearInterval(pollRef.current)
      } else if (json.status === 'unmatched') {
        setResultStatus('unmatched')
      }
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [panel, studentId, numBidders])

  function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your perm number.'); return }
    setError('')
    setPanel('bid')
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
      const res = await fetch('/api/exp6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), bid: b, num_bidders: numBidders }),
      })
      const json = await res.json()
      if (!res.ok) { setInputError(json.error ?? 'Submission failed.'); return }
      setSubmittedBid(Number(json.bid))
      setPanel('done')
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
                </ul>
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
              >
                Enter Auction →
              </button>
            </div>
          )}

          {/* ── PANEL: bid ── */}
          {panel === 'bid' && (
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
                Enter any amount ≥ $0.
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

          {/* ── PANEL: done (waiting for group) ── */}
          {panel === 'done' && (
            <div className="text-center">
              <div
                className="mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--surface)', border: '2px solid var(--navy)' }}
              >
                <span className="text-lg" style={{ color: 'var(--navy)' }}>✓</span>
              </div>
              <h2 className="serif text-3xl mb-2" style={{ color: 'var(--text)' }}>
                Bid Recorded
              </h2>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                Your bid of{' '}
                <strong style={{ color: 'var(--navy)' }}>{submittedBid !== null ? fmt(submittedBid) : '—'}</strong>{' '}
                has been recorded.
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                Perm: {studentId.trim()}
              </p>
              <div className="mt-6 rounded-xl px-5 py-4 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {resultStatus === 'unmatched' ? (
                  <p style={{ color: 'var(--text-muted)' }}>
                    Results have been released but you were not placed in a group this round.
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>
                    Waiting for the instructor to release results…
                    <span className="block mt-1 text-xs">This page will update automatically.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── PANEL: result ── */}
          {panel === 'result' && resultData && (() => {
            const winner = computeWinner(resultData.group)
            const isWinner = winner.id === resultData.own.id
            const myBid = Number(resultData.own.bid)
            const myNet = isWinner ? 100 - myBid : -myBid
            return (
              <div>
                <div className="text-center mb-6">
                  <div
                    className="mb-4 w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: isWinner ? 'var(--navy)' : 'var(--surface)', border: '2px solid var(--navy)' }}
                  >
                    <span className="text-lg" style={{ color: isWinner ? '#fff' : 'var(--navy)' }}>{isWinner ? '★' : '—'}</span>
                  </div>
                  <h2 className="serif text-3xl mb-1" style={{ color: 'var(--text)' }}>
                    {isWinner ? 'You Won!' : 'Results'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Perm: {studentId.trim()}</p>
                </div>

                <div className="rounded-xl px-5 py-4 mb-5" style={{ background: 'var(--surface)', border: `2px solid ${isWinner ? 'var(--navy)' : 'var(--border)'}` }}>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--navy)', fontWeight: 600 }}>Your Outcome</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your bid</p>
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>{fmt(myBid)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Prize won</p>
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>{isWinner ? '$100.00' : '$0.00'}</p>
                    </div>
                    <div className="col-span-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Net payoff</p>
                      <p className="text-lg font-bold" style={{ color: myNet >= 0 ? 'var(--navy)' : '#dc2626' }}>
                        {fmt(myNet)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <p className="text-xs uppercase tracking-widest px-4 py-2.5" style={{ background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                    All Bids in Your Group
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface)' }}>
                        {['Bidder', 'Bid', 'Outcome'].map((h) => (
                          <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.group.map((m, i) => {
                        const mWon = m.id === winner.id
                        const isMe = m.id === resultData.own.id
                        return (
                          <tr key={m.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '7px 12px', color: isMe ? 'var(--navy)' : 'var(--text)', fontWeight: isMe ? 700 : 400, fontSize: 12, fontFamily: 'monospace' }}>
                              {m.student_id}{isMe && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--navy)' }}>(you)</span>}
                            </td>
                            <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: mWon ? 700 : 400 }}>{fmt(Number(m.bid))}</td>
                            <td style={{ padding: '7px 12px', color: mWon ? 'var(--navy)' : '#dc2626', fontWeight: mWon ? 700 : 400 }}>
                              {mWon ? '★ Won' : 'Lost'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

        </div>
      </main>
    </div>
  )
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
