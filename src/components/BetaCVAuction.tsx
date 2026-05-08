'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

export type CVVariant = 'integer' | 'continuous'

type Panel = 'identify' | 'signal_bid' | 'waiting' | 'unmatched' | 'results'

interface Entry {
  id: string
  half_value: number
  bid: number | null
  pair_id: string | null
  role: 'a' | 'b' | null
  variant: CVVariant
}

interface ResultPayload {
  own: Entry & { half_value: number; bid: number; role: 'a' | 'b' }
  partner: Entry & { half_value: number; bid: number; role: 'a' | 'b' }
}

function fmt(n: number, variant: CVVariant) {
  if (n < 0) return variant === 'continuous' ? `-$${(-n).toFixed(2)}` : `-$${-n}`
  return variant === 'continuous' ? `$${n.toFixed(2)}` : `$${n}`
}

export default function BetaCVAuction({ variant }: { variant: CVVariant }) {
  const [panel, setPanel] = useState<Panel>('identify')
  const [studentId, setStudentId] = useState('')
  const [entry, setEntry] = useState<Entry | null>(null)
  const [bid, setBid] = useState('')
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputError, setInputError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (panel !== 'waiting' || !studentId) return

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/beta/cv-auction/result?student_id=${encodeURIComponent(studentId.trim().toLowerCase())}&variant=${variant}`
        )
        if (!res.ok) return
        const json = await res.json()
        if (json.status === 'ready') {
          setResult(json)
          setPanel('results')
        } else if (json.status === 'unmatched') {
          setPanel('unmatched')
        }
      } catch { /* network hiccup */ }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [panel, studentId, variant])

  async function handleIdentify() {
    const id = studentId.trim()
    if (!id) { setError('Please enter your perm number.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/beta/cv-auction/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: id, variant }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error joining.'); return }
      setEntry(json)
      if (json.bid !== null) {
        if (json.pair_id) {
          const r = await fetch(
            `/api/beta/cv-auction/result?student_id=${encodeURIComponent(id.toLowerCase())}&variant=${variant}`
          )
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
    const trimmed = bid.trim()
    const b = parseFloat(trimmed)

    if (!isFinite(b)) {
      setInputError('Enter a number.')
      return
    }
    if (variant === 'integer' && !/^\d+$/.test(trimmed)) {
      setInputError('Whole numbers only — no decimals.')
      return
    }
    if (b < 0 || b > 6) {
      setInputError(`Enter a number between 0 and 6.`)
      return
    }

    setInputError('')
    setLoading(true)
    try {
      const res = await fetch('/api/beta/cv-auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim(), bid: b, variant }),
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

  const variantLabel = variant === 'integer' ? 'Integer Bids' : 'Continuous Bids'

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
            Oil Well Auction · {variantLabel}
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
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                A sealed-bid auction with private signals.
              </p>
              <p
                className="text-xs mb-5 px-2 py-1 rounded inline-block"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--navy)' }}
              >
                {variantLabel}
              </p>

              <WellDiagram className="mb-4" variant={variant} />

              {variant === 'integer' ? (
                <OutcomeTable className="mb-6" />
              ) : (
                <ContinuousDistNote className="mb-6" />
              )}

              <div
                className="rounded-xl px-5 py-4 mb-6 text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', lineHeight: 1.75 }}
              >
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Rules
                </p>
                <p style={{ color: 'var(--text)' }}>
                  You see only your own half. Both firms submit a sealed bid
                  from <strong>$0 to $6</strong>
                  {variant === 'integer' ? ' (whole numbers only)' : ' (decimals allowed)'}. The higher bid wins the well and
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
                <WellDiagram myValue={entry.half_value} variant={variant} />
                <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                  {variant === 'integer' ? (
                    entry.half_value === 3
                      ? "Your half = $3. Opponent's half is $0 or $3, so V = $3 or $6 (each equally likely)."
                      : "Your half = $0. Opponent's half is $0 or $3, so V = $0 or $3 (each equally likely)."
                  ) : (
                    `Your half = ${fmt(entry.half_value, variant)}. Opponent's half is drawn from [0, 3], so V ∈ [${fmt(entry.half_value, variant)}, ${fmt(entry.half_value + 3, variant)}].`
                  )}
                </p>
              </div>

              <p className="text-sm mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                You are in a <strong>first-price sealed-bid auction</strong> against
                one other firm. Each firm submits one bid ($0–$6
                {variant === 'integer' ? ', integers only' : ', decimals ok'}). The higher
                bid wins and pays that bid; the winner earns <em>V − bid</em>.
              </p>

              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Your bid ($0–$6{variant === 'integer' ? ', integers only' : ''}):
              </p>
              <input
                type="number"
                className="w-full rounded-lg px-4 py-3 text-base mb-2"
                placeholder={variant === 'integer' ? 'Enter a whole number (0–6)' : 'Enter a number (0–6)'}
                min="0"
                max="6"
                step={variant === 'integer' ? '1' : '0.01'}
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
                Your bid of <strong style={{ color: 'var(--navy)' }}>{fmt(entry.bid!, variant)}</strong> has been recorded.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Waiting for the instructor to reveal results…
              </p>
            </div>
          )}

          {/* ── PANEL: unmatched ── */}
          {panel === 'unmatched' && (
            <div className="text-center">
              <div
                className="text-2xl mb-6 w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--surface)', border: '2px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>—</span>
              </div>
              <h2 className="serif text-3xl mb-3" style={{ color: 'var(--text)' }}>
                Not Matched
              </h2>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Your bid was recorded, but you weren&apos;t matched this round
                (odd number of bidders).
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Let your instructor know — they can pair you manually or run another round.
              </p>
            </div>
          )}

          {/* ── PANEL: results ── */}
          {panel === 'results' && result && (
            <Results own={result.own} partner={result.partner} studentId={studentId.trim()} variant={variant} />
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
  variant,
}: {
  own: { half_value: number; bid: number; role: 'a' | 'b' }
  partner: { half_value: number; bid: number; role: 'a' | 'b' }
  studentId: string
  variant: CVVariant
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
          <p className="serif text-3xl" style={{ color: 'var(--navy)' }}>{fmt(own.half_value, variant)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Opponent&apos;s Half
          </p>
          <p className="serif text-3xl" style={{ color: 'var(--navy)' }}>{fmt(partner.half_value, variant)}</p>
        </div>
        <div className="col-span-2 pt-3 mt-1 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Well Value
          </p>
          <p className="serif text-4xl" style={{ color: 'var(--navy)' }}>{fmt(V, variant)}</p>
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
            {fmt(own.bid, variant)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Opponent&apos;s Bid
          </p>
          <p className="serif text-3xl" style={{ color: !won ? 'var(--navy)' : 'var(--text-muted)' }}>
            {fmt(partner.bid, variant)}
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
          {won ? (payoff >= 0 ? `+${fmt(payoff, variant)}` : fmt(payoff, variant)) : '$0'}
        </p>
        {won && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            V − bid = {fmt(V, variant)} − {fmt(own.bid, variant)} = {fmt(payoff, variant)}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Well diagram ────────────────────────────────────────────────────────────

function WellDiagram({
  myValue,
  variant,
  className = '',
}: {
  myValue?: number
  variant: CVVariant
  className?: string
}) {
  const revealed = myValue !== undefined
  const hasOil = revealed && myValue > 0
  const leftLabel = revealed
    ? variant === 'continuous' ? `$${myValue.toFixed(2)}` : `$${myValue}`
    : '?'
  const W = 280, H = 246
  const cx = W / 2
  const groundY = 78
  const leftCx = 70
  const rightCx = 210
  const resCy = H - 30
  const resRx = 110
  const resRy = 28
  const casingW = 11
  const casingBottom = resCy - resRy + 4

  const top = `M 0,${groundY} Q 70,${groundY - 3} 140,${groundY + 1} Q 210,${groundY + 4} 280,${groundY - 1}`

  function Derrick({ centerX }: { centerX: number }) {
    const apexY = 5
    const spread = 20
    const lx = centerX - spread, rx = centerX + spread
    const h = groundY - apexY
    return (
      <>
        <line x1={lx} y1={groundY} x2={centerX} y2={apexY} stroke="#4a5568" strokeWidth={2} strokeLinecap="round" />
        <line x1={rx} y1={groundY} x2={centerX} y2={apexY} stroke="#4a5568" strokeWidth={2} strokeLinecap="round" />
        <line x1={centerX - spread * 0.65} y1={groundY - h * 0.35} x2={centerX + spread * 0.65} y2={groundY - h * 0.35} stroke="#4a5568" strokeWidth={1.5} />
        <line x1={centerX - spread * 0.35} y1={groundY - h * 0.65} x2={centerX + spread * 0.35} y2={groundY - h * 0.65} stroke="#4a5568" strokeWidth={1.5} />
        <rect x={centerX - 4} y={apexY - 2} width={8} height={5} rx={1} fill="#4a5568" />
        <rect x={lx - 3} y={groundY - 5} width={(spread + 3) * 2} height={5} rx={1} fill="#718096" />
      </>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}
      aria-label="Oil well cross-section"
    >
      <defs>
        <linearGradient id="wdOilGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d1200" />
          <stop offset="45%" stopColor="#100500" />
          <stop offset="100%" stopColor="#050100" />
        </linearGradient>
        <clipPath id="wdLeftClip">
          <rect x={0} y={0} width={cx} height={H} />
        </clipPath>
        <clipPath id="wdRightClip">
          <rect x={cx} y={0} width={W - cx} height={H} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={W} height={groundY} fill="#e8eef5" />
      <Derrick centerX={leftCx} />
      <Derrick centerX={rightCx} />

      <path d={`${top} L 280,${groundY + 72} Q 210,${groundY + 76} 140,${groundY + 69} Q 70,${groundY + 66} 0,${groundY + 72} Z`} fill="#7a6858" />
      <path d={`${top} L 280,${groundY + 33} Q 210,${groundY + 37} 140,${groundY + 31} Q 70,${groundY + 29} 0,${groundY + 34} Z`} fill="#9e9080" />
      <path d={`${top} L 280,${groundY + 18} Q 210,${groundY + 16} 140,${groundY + 19} Q 70,${groundY + 22} 0,${groundY + 18} Z`} fill="#b89a68" />
      <line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#a08060" strokeWidth={1.5} />
      <text x={7} y={groundY - 10} fontSize={8} fill="#8a7a6a" fontFamily="inherit" letterSpacing="0.5">GROUND</text>

      {[leftCx, rightCx].map((cx2) => (
        <g key={cx2}>
          <rect x={cx2 - casingW / 2} y={groundY} width={casingW} height={casingBottom - groundY}
            fill="#8a8a8a" stroke="#606060" strokeWidth={0.75} rx={2} />
          <rect x={cx2 - casingW / 2 + 2} y={groundY + 2} width={casingW - 4} height={casingBottom - groundY - 4}
            fill="#c4c4c4" rx={1} />
          <polygon points={`${cx2},${casingBottom + 7} ${cx2 - 4},${casingBottom} ${cx2 + 4},${casingBottom}`} fill="#555" />
        </g>
      ))}

      <ellipse cx={cx} cy={resCy} rx={resRx} ry={resRy}
        fill={hasOil ? 'url(#wdOilGrad)' : '#c8b880'}
        clipPath="url(#wdLeftClip)" />
      {hasOil && (
        <path
          d={`M ${cx - resRx + 14},${resCy - 14} Q ${cx - resRx * 0.55},${resCy - 18} ${cx},${resCy - 14}`}
          fill="none" stroke="#5a2800" strokeWidth={1.5} clipPath="url(#wdLeftClip)"
        />
      )}
      <ellipse cx={cx} cy={resCy} rx={resRx} ry={resRy}
        fill="#c0b070"
        clipPath="url(#wdRightClip)" />
      <ellipse cx={cx} cy={resCy} rx={resRx} ry={resRy} fill="none" stroke="#8a7050" strokeWidth={1.5} />
      <line x1={cx} y1={resCy - resRy} x2={cx} y2={resCy + resRy} stroke="#8a7050" strokeWidth={1.5} strokeDasharray="3 2" />

      <text x={leftCx} y={resCy - 2} textAnchor="middle" fontSize={leftLabel.length > 4 ? 12 : 17} fontWeight="700"
        fill={hasOil ? '#f5e8d0' : '#4a3818'} fontFamily="Georgia, serif">
        {leftLabel}
      </text>
      <text x={leftCx} y={resCy + 14} textAnchor="middle" fontSize={6.5}
        fill={hasOil ? '#b0c8d8' : '#6b5a45'} fontFamily="inherit" letterSpacing="0.5">
        YOUR HALF
      </text>

      <text x={rightCx} y={resCy - 2} textAnchor="middle" fontSize={17} fontWeight="700"
        fill="#7a6030" fontFamily="Georgia, serif">
        ?
      </text>
      <text x={rightCx} y={resCy + 14} textAnchor="middle" fontSize={6.5}
        fill="#6b5a45" fontFamily="inherit" letterSpacing="0.5">
        OPPONENT&apos;S HALF
      </text>
    </svg>
  )
}

// ── Outcome table (integer variant only) ────────────────────────────────────

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
            <th style={headStyle}>Opponent&apos;s Half</th>
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

// ── Continuous distribution note ─────────────────────────────────────────────

function ContinuousDistNote({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', padding: '14px 16px' }}
    >
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)', fontWeight: 600 }}>
        Signal Structure
      </p>
      <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.75 }}>
        Each firm&apos;s half-value is drawn independently from a <strong>uniform distribution on [0, 3]</strong>.
        The total well value is <em>V = your half + opponent&apos;s half</em>, so <em>V ∈ [0, 6]</em>.
        You observe only your own half before bidding.
      </p>
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
