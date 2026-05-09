'use client'

import { useState, useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { AttendanceRecord } from '@/lib/types'

const ATTENDANCE_URL = 'https://econ-177.vercel.app/attendance'

// ── Haversine distance in metres ─────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type SortKey = 'student_id' | 'submitted_at' | 'loc_dist' | 'time_dist'
type SortDir = 'asc' | 'desc'

// ── QR modal ─────────────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function AttendanceResults() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [codeFilter, setCodeFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('submitted_at')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    fetch('/api/attendance')
      .then((r) => r.json())
      .then((data) => setRecords(data))
      .finally(() => setLoading(false))
  }, [])

  const code = codeFilter.trim().toLowerCase()

  // Filter by code word when one is entered
  const filtered = useMemo(
    () => (code ? records.filter((r) => r.code_word.toLowerCase() === code) : records),
    [records, code]
  )

  // Compute averages over the filtered set (only for records with GPS)
  const { avgLat, avgLon, avgTs } = useMemo(() => {
    const gps = filtered.filter((r) => r.latitude != null && r.longitude != null)
    const avgLat = gps.length ? gps.reduce((s, r) => s + r.latitude!, 0) / gps.length : null
    const avgLon = gps.length ? gps.reduce((s, r) => s + r.longitude!, 0) / gps.length : null
    const ts = filtered.map((r) => new Date(r.submitted_at).getTime())
    const avgTs = ts.length ? ts.reduce((s, t) => s + t, 0) / ts.length : null
    return { avgLat, avgLon, avgTs }
  }, [filtered])

  // Annotate each record with distances
  const annotated = useMemo(() =>
    filtered.map((r) => {
      const locDist =
        avgLat != null && avgLon != null && r.latitude != null && r.longitude != null
          ? haversine(r.latitude, r.longitude, avgLat, avgLon)
          : null
      const timeDist =
        avgTs != null
          ? Math.abs(new Date(r.submitted_at).getTime() - avgTs) / 1000
          : null
      return { ...r, locDist, timeDist }
    }),
    [filtered, avgLat, avgLon, avgTs]
  )

  // Sort
  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...annotated].sort((a, b) => {
      switch (sortKey) {
        case 'student_id':
          return dir * a.student_id.localeCompare(b.student_id)
        case 'submitted_at':
          return dir * (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
        case 'loc_dist':
          return dir * ((a.locDist ?? Infinity) - (b.locDist ?? Infinity))
        case 'time_dist':
          return dir * ((a.timeDist ?? Infinity) - (b.timeDist ?? Infinity))
      }
    })
  }, [annotated, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const showDistCols = code.length > 0

  // Group only when no code filter; nested by day → code word
  const byDayAndCode = useMemo(() => {
    if (showDistCols) return null
    return records.reduce<Record<string, Record<string, AttendanceRecord[]>>>((acc, r) => {
      const day = new Date(r.submitted_at).toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
      const word = r.code_word
      ;((acc[day] ??= {})[word] ??= []).push(r)
      return acc
    }, {})
  }, [records, showDistCols])

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const sheet = records.map((r) => ({
      'Student ID': r.student_id,
      'Code Word': r.code_word,
      'Date': new Date(r.submitted_at).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
      'Time': new Date(r.submitted_at).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }),
      'Latitude': r.latitude ?? '',
      'Longitude': r.longitude ?? '',
      'Accuracy (m)': r.accuracy ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Attendance')
    XLSX.writeFile(wb, 'attendance.xlsx')
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {showQR && <QRModal onClose={() => setShowQR(false)} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          className="rounded-lg px-3 py-2 text-sm flex-1"
          style={{ border: '1px solid var(--border)', maxWidth: '260px' }}
          placeholder="Filter by code word…"
          value={codeFilter}
          onChange={(e) => { setCodeFilter(e.target.value); setSortKey('submitted_at'); setSortDir('asc') }}
        />
        {showDistCols && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {sorted.length} match{sorted.length !== 1 ? 'es' : ''}
          </span>
        )}
        <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
          <button className="btn-ghost rounded-lg px-4 py-2 text-sm" onClick={handleExport} disabled={records.length === 0}>
            ⬇ Excel
          </button>
          <button className="btn-gold rounded-lg px-4 py-2 text-sm" onClick={() => setShowQR(true)}>
            Show QR Code
          </button>
        </div>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}

      {/* ── Code-filtered flat view with sortable distance columns ── */}
      {!loading && showDistCols && (
        <>
          {sorted.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No submissions with that code word.</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: 'white' }}>
                    <SortTh label="PERM" col="student_id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <Th>Code Word</Th>
                    <SortTh label="Time" col="submitted_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="Dist from avg (m)" col="loc_dist" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="Time from avg" col="time_dist" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={r.id} style={{
                      borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'white' : 'var(--surface)',
                    }}>
                      <td style={td}>{r.student_id}</td>
                      <td style={td}>{r.code_word}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>
                        {new Date(r.submitted_at).toLocaleTimeString('en-US', {
                          timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
                        })}
                      </td>
                      <td style={{ ...td, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.locDist != null ? `${r.locDist.toFixed(0)} m` : <span style={{ fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ ...td, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.timeDist != null ? fmtSeconds(r.timeDist) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Default day → code word grouped view ── */}
      {!loading && !showDistCols && (
        <>
          {records.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attendance submissions yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {Object.entries(byDayAndCode!).map(([day, byCode]) => {
                const dayTotal = Object.values(byCode).reduce((s, rows) => s + rows.length, 0)
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{day}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--navy)', color: '#fff' }}>
                        {dayTotal} present
                      </span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {Object.entries(byCode).map(([word, rows]) => (
                        <div key={word}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--navy)', letterSpacing: '0.04em' }}>
                              {word}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} student{rows.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ background: 'var(--navy)', color: 'white' }}>
                                  <Th>PERM</Th><Th>Time</Th><Th>Location</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, i) => (
                                  <tr key={r.id} style={{
                                    borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                                    background: i % 2 === 0 ? 'white' : 'var(--surface)',
                                  }}>
                                    <td style={td}>{r.student_id}</td>
                                    <td style={{ ...td, color: 'var(--text-muted)' }}>
                                      {new Date(r.submitted_at).toLocaleTimeString('en-US', {
                                        timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
                                      })}
                                    </td>
                                    <td style={{ ...td, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                      {r.latitude != null && r.longitude != null
                                        ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
                                        : <span style={{ fontStyle: 'italic' }}>unavailable</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, fontFamily: 'inherit' }}>
      {children}
    </th>
  )
}

function SortTh({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th
      onClick={() => onSort(col)}
      style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.4 }}>↕</span>}
    </th>
  )
}

const td: React.CSSProperties = { padding: '0.5rem 1rem', color: 'var(--text)' }
