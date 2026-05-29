'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stat } from './charts'
import type { RiskAversionResponse } from '@/lib/types'
import { useQuarterParam, withQuarter } from '@/lib/use-quarter-param'

const RA_C_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90]
const RA_COL_NAMES = ['p_10','p_20','p_30','p_40','p_50','p_60','p_70','p_80','p_90'] as const

function estimateAlpha(row: RiskAversionResponse): number | null {
  let sumXY = 0, sumX2 = 0
  for (let i = 0; i < 9; i++) {
    const p = Number(row[RA_COL_NAMES[i]])
    if (p <= 0) continue
    const x = Math.log(RA_C_VALUES[i] / 100)
    const y = Math.log(p)
    sumXY += x * y; sumX2 += x * x
  }
  return sumX2 > 0 ? sumXY / sumX2 : null
}

export default function Exp2Results() {
  const quarter = useQuarterParam()
  const [rows, setRows] = useState<RiskAversionResponse[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(withQuarter('/api/risk-aversion?raw=true', quarter))
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [quarter])

  useEffect(() => { fetchRows() }, [fetchRows])

  const classAlpha = (() => {
    let sumXY = 0, sumX2 = 0
    for (const row of rows) {
      for (let i = 0; i < 9; i++) {
        const p = Number(row[RA_COL_NAMES[i]])
        if (p <= 0) continue
        const x = Math.log(RA_C_VALUES[i] / 100)
        const y = Math.log(p)
        sumXY += x * y; sumX2 += x * x
      }
    }
    return sumX2 > 0 ? sumXY / sumX2 : null
  })()

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const sheet1 = rows.map((r) => ({
      'Student ID': r.student_id,
      'p($10)': r.p_10, 'p($20)': r.p_20, 'p($30)': r.p_30,
      'p($40)': r.p_40, 'p($50)': r.p_50, 'p($60)': r.p_60,
      'p($70)': r.p_70, 'p($80)': r.p_80, 'p($90)': r.p_90,
      'p($100)': 1,
      'α (CRRA)': estimateAlpha(r)?.toFixed(4) ?? '—',
      'Submitted': new Date(r.created_at).toLocaleString(),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'Responses')
    const regRows: Record<string, string | number>[] = []
    for (const row of rows) {
      for (let i = 0; i < 9; i++) {
        const p = Number(row[RA_COL_NAMES[i]])
        regRows.push({
          'Student ID': row.student_id,
          'C': RA_C_VALUES[i],
          'y = ln(p)': p > 0 ? +Math.log(p).toFixed(6) : 'N/A',
          'x = ln(C/100)': +Math.log(RA_C_VALUES[i] / 100).toFixed(6),
        })
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regRows), 'Regression Data')
    XLSX.writeFile(wb, 'assignment2-risk-aversion.xlsx')
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 rounded-xl p-4 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Stat label="Submissions" value={rows.length} />
        <Stat label="Unique Students" value={new Set(rows.map((r) => r.student_id)).size} />
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Class α (CRRA)</p>
          <p className="serif text-2xl" style={{ color: 'var(--navy)' }}>
            {classAlpha !== null ? classAlpha.toFixed(3) : '—'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 justify-end mb-4">
        <button onClick={fetchRows} className="btn-ghost text-xs px-3 py-1.5 rounded" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
        <button onClick={handleExport} className="btn-gold text-xs px-3 py-1.5 rounded" disabled={rows.length === 0}>
          ⬇ Excel
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loading ? 'Loading…' : 'No submissions yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Student ID', '$10', '$20', '$30', '$40', '$50', '$60', '$70', '$80', '$90', '$100', 'α', 'Submitted'].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs tracking-wide font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const alpha = estimateAlpha(row)
                return (
                  <tr key={row.id}
                    style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text)', fontWeight: 500 }}>{row.student_id}</td>
                    {RA_COL_NAMES.map((col) => (
                      <td key={col} className="px-3 py-2.5 text-xs" style={{ color: 'var(--text)' }}>
                        {Number(row[col]).toFixed(3)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>1.000</td>
                    <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--navy)' }}>
                      {alpha !== null ? alpha.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(row.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
