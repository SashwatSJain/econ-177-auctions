'use client'

import { useState, useEffect } from 'react'
import type { AttendanceRecord } from '@/lib/types'

export default function AttendanceResults() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/attendance')
      .then((r) => r.json())
      .then((data) => setRecords(data))
      .finally(() => setLoading(false))
  }, [])

  const byDay = records.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    const day = new Date(r.submitted_at).toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
    ;(acc[day] ??= []).push(r)
    return acc
  }, {})

  const days = Object.keys(byDay)

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
  }

  if (records.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attendance submissions yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => {
        const rows = byDay[day]
        return (
          <div key={day}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{day}</h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                {rows.length} present
              </span>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    <Th>PERM</Th>
                    <Th>Code Word</Th>
                    <Th>Time</Th>
                    <Th>Location</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                        background: i % 2 === 0 ? 'white' : 'var(--surface)',
                      }}
                    >
                      <td style={td}>{r.student_id}</td>
                      <td style={td}>{r.code_word}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>
                        {new Date(r.submitted_at).toLocaleTimeString('en-US', {
                          timeZone: 'America/Los_Angeles',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </td>
                      <td style={{ ...td, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.latitude != null && r.longitude != null
                          ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`
                          : <span style={{ fontStyle: 'italic' }}>unavailable</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: '0.6rem 1rem', textAlign: 'left',
      fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
      fontWeight: 500, fontFamily: 'inherit',
    }}>
      {children}
    </th>
  )
}

const td: React.CSSProperties = {
  padding: '0.5rem 1rem',
  color: 'var(--text)',
}
