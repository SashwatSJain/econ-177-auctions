'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { AttendanceRecord } from '@/lib/types'

const ATTENDANCE_URL = 'https://econ-177.vercel.app/attendance'

function QRModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: '#fff' }}
      onClick={onClose}
    >
      <p className="text-xs tracking-widest uppercase mb-8" style={{ color: 'var(--text-muted)' }}>
        Scan to record attendance · tap anywhere to close
      </p>
      <QRCodeSVG value={ATTENDANCE_URL} size={320} level="M" />
      <p className="mt-8 text-sm font-medium" style={{ color: 'var(--navy)' }}>
        {ATTENDANCE_URL}
      </p>
    </div>
  )
}

export default function AttendanceResults() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)

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

  return (
    <>
      {showQR && <QRModal onClose={() => setShowQR(false)} />}

      <div className="flex justify-end mb-6">
        <button
          className="btn-gold rounded-lg px-4 py-2 text-sm"
          onClick={() => setShowQR(true)}
        >
          Show QR Code
        </button>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      )}

      {!loading && records.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attendance submissions yet.</p>
        </div>
      )}

      {!loading && records.length > 0 && (
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
      )}
    </>
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
