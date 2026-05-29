'use client'

import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import type { ParticipationRow, ExpParticipation } from '@/app/api/admin/participation/route'
import type { InferredDateResult } from '@/app/api/settings/inferred-dates/route'
import { useQuarterParam, withQuarter } from '@/lib/use-quarter-param'

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EXPS = [1, 2, 3, 4, 5, 6] as const

const EXP_TITLES: Record<number, string> = {
  1: 'Auctions',
  2: 'Risk Aversion',
  3: 'Seller Auction',
  4: 'Penny Jar',
  5: 'Oil Well',
  6: 'All-Pay',
}

const TH = ({ children, style, onClick, sorted }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  sorted?: 'asc' | 'desc' | false
}) => (
  <th
    onClick={onClick}
    style={{
      padding: '8px 12px',
      textAlign: 'left',
      fontSize: 11,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: sorted ? 'var(--navy)' : 'var(--text-muted)',
      fontWeight: 600,
      borderBottom: '1px solid var(--border)',
      whiteSpace: 'nowrap',
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none',
      ...style,
    }}
  >
    {children}{sorted === 'asc' ? ' ↑' : sorted === 'desc' ? ' ↓' : onClick ? ' ↕' : ''}
  </th>
)

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Check({ on }: { on: ExpParticipation }) {
  if (!on) return <span style={{ color: 'var(--border)' }}>—</span>
  const title = on.ts ? formatTs(on.ts) : on.late ? 'Submitted outside window' : undefined
  if (on.late) {
    return (
      <span title={title} style={{ color: '#ea580c', fontWeight: 700, cursor: title ? 'help' : 'default' }}>✓</span>
    )
  }
  return (
    <span title={title} style={{ color: 'var(--navy)', fontWeight: 700, cursor: title ? 'help' : 'default' }}>✓</span>
  )
}

export default function ParticipationTable() {
  const quarter = useQuarterParam()
  const [rows, setRows] = useState<ParticipationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inferredDates, setInferredDates] = useState<InferredDateResult[]>([])
  const [search, setSearch] = useState('')
  const [validOnly, setValidOnly] = useState(true)
  const [sortKey, setSortKey] = useState<number | 'score' | 'ontime' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: number | 'score' | 'ontime') {
    if (sortKey === key) {
      setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function onTimeScore(r: ParticipationRow) {
    return EXPS.filter((n) => {
      const exp = r[`exp${n}` as keyof ParticipationRow] as ExpParticipation
      return exp && !exp.late
    }).length
  }

  function completionScore(r: ParticipationRow) {
    return EXPS.filter((n) => r[`exp${n}` as keyof ParticipationRow]).length
  }

  useEffect(() => {
    Promise.all([
      fetch(withQuarter('/api/admin/participation', quarter)).then((r) => r.ok ? r.json() : []),
      fetch(withQuarter('/api/settings/inferred-dates', quarter)).then((r) => r.ok ? r.json() : []),
    ]).then(([participation, dates]) => {
      setRows(participation)
      setInferredDates(dates)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = rows
    if (validOnly) result = result.filter((r) => /^[a-zA-Z0-9]{7}$/.test(r.student_id))
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((r) => r.student_id.toLowerCase().includes(q))
    if (sortKey !== null) {
      const expVal = (v: ExpParticipation) => !v ? 0 : v.late ? 1 : 2
      result = [...result].sort((a, b) => {
        const av = sortKey === 'score' ? completionScore(a) : sortKey === 'ontime' ? onTimeScore(a) : expVal(a[`exp${sortKey}` as keyof ParticipationRow] as ExpParticipation)
        const bv = sortKey === 'score' ? completionScore(b) : sortKey === 'ontime' ? onTimeScore(b) : expVal(b[`exp${sortKey}` as keyof ParticipationRow] as ExpParticipation)
        return sortDir === 'desc' ? bv - av : av - bv
      })
    }
    return result
  }, [rows, search, validOnly, sortKey, sortDir])

  const scoreDist = useMemo(() => {
    const counts = Array(EXPS.length + 1).fill(0)
    for (const r of filtered) counts[completionScore(r)]++
    return counts
  }, [filtered])

  const onTimeDist = useMemo(() => {
    const counts = Array(EXPS.length + 1).fill(0)
    for (const r of filtered) counts[onTimeScore(r)]++
    return counts
  }, [filtered])

  function formatHHMM(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function exportToExcel() {
    const headers = ['Perm #', 'On-time', 'Completion', ...EXPS.map((n) => EXP_TITLES[n])]

    const validityRow = ['Window', '', '', ...EXPS.map((n) => {
      const d = inferredDates.find((x) => x.exp === n)
      if (!d?.inferredDate) return ''
      const dateLabel = d.dayOfWeek !== null
        ? `${DOW_SHORT[d.dayOfWeek]}, ${formatDateShort(d.inferredDate)}`
        : formatDateShort(d.inferredDate)
      if (!d.scheduleStart || !d.scheduleEnd) return dateLabel
      return `${dateLabel} · ${formatHHMM(d.scheduleStart)} – ${formatHHMM(d.scheduleEnd)}`
    })]

    const dataRows = filtered.map((r) => [
      r.student_id,
      onTimeScore(r),
      completionScore(r),
      ...EXPS.map((n) => {
        const exp = r[`exp${n}` as keyof ParticipationRow] as ExpParticipation
        if (!exp) return ''
        const ts = exp.ts ? formatTs(exp.ts) : 'Submitted'
        return exp.late ? `${ts} (late)` : ts
      }),
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, validityRow, ...dataRows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Participation')
    XLSX.writeFile(wb, 'participation.xlsx')
  }

  const totals = useMemo(() => ({
    exp1: filtered.filter((r) => r.exp1).length,
    exp2: filtered.filter((r) => r.exp2).length,
    exp3: filtered.filter((r) => r.exp3).length,
    exp4: filtered.filter((r) => r.exp4).length,
    exp5: filtered.filter((r) => r.exp5).length,
    exp6: filtered.filter((r) => r.exp6).length,
  }), [filtered])

  if (loading) {
    return (
      <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No submissions yet.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-5">
        <span className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          {filtered.length} students
        </span>
        {EXPS.map((n) => (
          <span key={n} className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--navy)' }}>
            {EXP_TITLES[n]}: {totals[`exp${n}` as keyof typeof totals]}
          </span>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search perm number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm w-full max-w-xs"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        />
        <button
          onClick={() => setValidOnly((v) => !v)}
          className="text-xs px-3 py-2 rounded-lg font-medium flex-shrink-0 transition-all"
          style={{
            background: validOnly ? 'var(--navy)' : 'var(--surface)',
            color: validOnly ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${validOnly ? 'var(--navy)' : 'var(--border)'}`,
          }}
        >
          Valid perms only
        </button>
        <button
          onClick={exportToExcel}
          className="text-xs px-3 py-2 rounded-lg font-medium flex-shrink-0 transition-all ml-auto"
          style={{
            background: 'var(--surface)',
            color: 'var(--navy)',
            border: '1px solid var(--border)',
          }}
        >
          Export Excel
        </button>
      </div>

      {/* Experiment time windows */}
      {inferredDates.some((d) => d.inferredDate) && (
        <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Experiment</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Conducted</th>
                <th style={{ padding: '7px 12px', textAlign: 'center', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Participation</th>
                <th style={{ padding: '7px 12px', textAlign: 'center', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Out of window</th>
              </tr>
            </thead>
            <tbody>
              {inferredDates.map((d, i) => {
                const dateLabel = d.inferredDate && d.dayOfWeek !== null
                  ? `${DOW_SHORT[d.dayOfWeek]}, ${formatDateShort(d.inferredDate)}`
                  : '—'
                const noSchedule = d.inferredDate && d.onTimeStudents === null
                return (
                  <tr key={d.exp} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--navy)', fontWeight: 600 }}>{EXP_TITLES[d.exp]}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text)', fontFamily: 'monospace' }}>{dateLabel}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                      {noSchedule
                        ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No schedule set</span>
                        : d.onTimeStudents !== null
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: d.inClass ? '#dcfce7' : '#fef9c3', color: d.inClass ? '#15803d' : '#854d0e' }}>
                              {d.onTimeStudents}
                            </span>
                          : <span style={{ color: 'var(--border)' }}>—</span>}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                      {d.outOfWindowStudents !== null
                        ? <span className="text-xs font-medium" style={{ color: d.outOfWindowStudents > 0 ? '#854d0e' : 'var(--text-muted)' }}>
                            {d.outOfWindowStudents}
                          </span>
                        : <span style={{ color: 'var(--border)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Score distribution charts */}
      {filtered.length > 0 && (() => {
        const barH = 80
        const barW = 32
        const gap = 12
        const totalW = (EXPS.length + 1) * (barW + gap) - gap
        const renderChart = (dist: number[], label: string) => {
          const maxCount = Math.max(...dist, 1)
          return (
            <div className="rounded-xl p-5 mb-5 flex-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
              <svg width={totalW} height={barH + 32} style={{ display: 'block', overflow: 'visible' }}>
                {dist.map((count, s) => {
                  const x = s * (barW + gap)
                  const h = count === 0 ? 2 : Math.max(4, Math.round((count / maxCount) * barH))
                  const y = barH - h
                  const full = s === EXPS.length
                  return (
                    <g key={s}>
                      <rect
                        x={x} y={y} width={barW} height={h}
                        rx={4}
                        fill={full ? 'var(--navy)' : count === 0 ? 'var(--border)' : '#93c5fd'}
                      />
                      {count > 0 && (
                        <text
                          x={x + barW / 2} y={y - 5}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={600}
                          fill="var(--text)"
                        >
                          {count}
                        </text>
                      )}
                      <text
                        x={x + barW / 2} y={barH + 16}
                        textAnchor="middle"
                        fontSize={11}
                        fill={full ? 'var(--navy)' : 'var(--text-muted)'}
                        fontWeight={full ? 700 : 400}
                      >
                        {s}
                      </text>
                    </g>
                  )
                })}
              </svg>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>experiments completed</p>
            </div>
          )
        }
        return (
          <div className="flex gap-4 mb-5">
            {renderChart(onTimeDist, 'On-time distribution')}
            {renderChart(scoreDist, 'Completion distribution')}
          </div>
        )
      })()}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <TH>Perm #</TH>
                <TH
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('ontime')}
                  sorted={sortKey === 'ontime' ? sortDir : false}
                >
                  On-time
                </TH>
                <TH
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('score')}
                  sorted={sortKey === 'score' ? sortDir : false}
                >
                  Completion
                </TH>
                {EXPS.map((n) => (
                  <TH
                    key={n}
                    style={{ textAlign: 'center' }}
                    onClick={() => handleSort(n)}
                    sorted={sortKey === n ? sortDir : false}
                  >
                    {EXP_TITLES[n]}
                  </TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Totals row */}
              <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                <td style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Total ({filtered.length})
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }} />
                <td style={{ padding: '6px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }} />
                {EXPS.map((n) => (
                  <td key={n} style={{ padding: '6px 12px', textAlign: 'center', fontSize: 11, color: 'var(--navy)', fontWeight: 600 }}>
                    {totals[`exp${n}` as keyof typeof totals]}
                  </td>
                ))}
              </tr>

              {filtered.map((r, i) => (
                <tr key={r.student_id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                    {r.student_id}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, color: onTimeScore(r) === EXPS.length ? 'var(--navy)' : 'var(--text)' }}>
                    {onTimeScore(r)}/{EXPS.length}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700, color: completionScore(r) === EXPS.length ? 'var(--navy)' : 'var(--text)' }}>
                    {completionScore(r)}/{EXPS.length}
                  </td>
                  {EXPS.map((n) => (
                    <td key={n} style={{ padding: '7px 12px', textAlign: 'center' }}>
                      <Check on={r[`exp${n}` as keyof ParticipationRow] as ExpParticipation} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        Exp 5 &amp; 6 show only students who submitted a bid.
      </p>
    </div>
  )
}
