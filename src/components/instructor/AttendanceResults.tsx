'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { AttendanceRecord } from '@/lib/types'
import { useQuarterParam, withQuarter } from '@/lib/use-quarter-param'
import InfoTooltip from './InfoTooltip'

const ATTENDANCE_URL = 'https://econ-177.vercel.app/attendance'

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

function groupLocationStats(rows: AttendanceRecord[]) {
  const gps = rows.filter((r) => r.latitude != null && r.longitude != null)
  if (gps.length === 0) return { meanLat: null, meanLon: null, trimLat: null, trimLon: null }

  const meanLat = gps.reduce((s, r) => s + r.latitude!, 0) / gps.length
  const meanLon = gps.reduce((s, r) => s + r.longitude!, 0) / gps.length

  const sorted = gps
    .map((r) => ({ r, dist: haversine(r.latitude!, r.longitude!, meanLat, meanLon) }))
    .sort((a, b) => a.dist - b.dist)

  const lo = Math.floor(sorted.length * 0.25)
  const hi = Math.ceil(sorted.length * 0.75)
  const middle = sorted.slice(lo, hi)
  const trimLat = middle.reduce((s, { r }) => s + r.latitude!, 0) / middle.length
  const trimLon = middle.reduce((s, { r }) => s + r.longitude!, 0) / middle.length

  return { meanLat, meanLon, trimLat, trimLon }
}

function QRModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: '#fff' }} onClick={onClose}>
      <p className="text-xs tracking-widest uppercase mb-8" style={{ color: 'var(--text-muted)' }}>
        Scan to record attendance · tap anywhere to close
      </p>
      <QRCodeSVG value={ATTENDANCE_URL} size={320} level="M" />
      <p className="mt-8 text-sm font-medium" style={{ color: 'var(--navy)' }}>{ATTENDANCE_URL}</p>
    </div>
  )
}

export default function AttendanceResults() {
  const quarter = useQuarterParam()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [permSearch, setPermSearch] = useState('')
  const [locationMode, setLocationMode] = useState<'off' | 'optional' | 'required'>('optional')
  const [savingMode, setSavingMode] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(withQuarter('/api/attendance', quarter))
      if (res.ok) setRecords(await res.json())
    } finally {
      setLoading(false)
    }
  }, [quarter])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => { if (d.location_mode) setLocationMode(d.location_mode) })
      .catch(() => {})
  }, [])

  async function setMode(mode: 'off' | 'optional' | 'required') {
    setSavingMode(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_mode: mode }),
      })
      if (res.ok) {
        const d = await res.json()
        setLocationMode(d.location_mode)
      }
    } finally {
      setSavingMode(false)
    }
  }

  // ── Delete handlers ──────────────────────────────────────────────────────────

  async function deleteAll() {
    if (!confirm('Delete ALL attendance records? This cannot be undone.')) return
    setDeleting(true)
    await fetch('/api/attendance?type=all', { method: 'DELETE' })
    setDeleting(false)
    fetchRecords()
  }

  async function deleteStudent(student_id: string) {
    if (!confirm(`Delete all attendance records for ${student_id}?`)) return
    setDeleting(true)
    await fetch(`/api/attendance?type=student&student_id=${encodeURIComponent(student_id)}`, { method: 'DELETE' })
    setDeleting(false)
    fetchRecords()
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this attendance record?')) return
    setDeleting(true)
    await fetch(`/api/attendance?type=record&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setDeleting(false)
    fetchRecords()
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const codeWordOptions = useMemo(() => {
    const earliest: Record<string, number> = {}
    for (const r of records) {
      const t = new Date(r.submitted_at).getTime()
      if (!(r.code_word in earliest) || t < earliest[r.code_word]) earliest[r.code_word] = t
    }
    return Object.entries(earliest)
      .sort((a, b) => a[1] - b[1])
      .map(([word, ts]) => ({
        word,
        label: `${word} — ${new Date(ts).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' })}`,
      }))
  }, [records])

  // ── Export ───────────────────────────────────────────────────────────────────

  function buildSheet(rows: AttendanceRecord[]) {
    const byCode: Record<string, AttendanceRecord[]> = {}
    for (const r of rows) (byCode[r.code_word] ??= []).push(r)
    const statsCache: Record<string, ReturnType<typeof groupLocationStats>> = {}
    for (const [word, group] of Object.entries(byCode)) statsCache[word] = groupLocationStats(group)
    return rows.map((r) => {
      const { meanLat, meanLon, trimLat, trimLon } = statsCache[r.code_word]
      const distMean =
        meanLat != null && meanLon != null && r.latitude != null && r.longitude != null
          ? haversine(r.latitude, r.longitude, meanLat, meanLon) : null
      const distTrim =
        trimLat != null && trimLon != null && r.latitude != null && r.longitude != null
          ? haversine(r.latitude, r.longitude, trimLat, trimLon) : null
      return {
        'Student ID': r.student_id,
        'Code Word': r.code_word,
        'Timestamp': new Date(r.submitted_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
        'Latitude': r.latitude ?? '',
        'Longitude': r.longitude ?? '',
        'Accuracy (m)': r.accuracy != null ? Number(r.accuracy).toFixed(1) : '',
        'Dist from mean (m)': distMean != null ? distMean.toFixed(1) : '',
        'Dist from IQR mean (m)': distTrim != null ? distTrim.toFixed(1) : '',
      }
    })
  }

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSheet(records)), 'Attendance')
    XLSX.writeFile(wb, 'attendance.xlsx')
  }

  const handleWordOfDayReport = async (word: string) => {
    const rows = records.filter((r) => r.code_word.toLowerCase() === word.toLowerCase())
    if (rows.length === 0) { alert(`No submissions found for code word "${word}".`); return }
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSheet(rows)), 'Attendance')
    XLSX.writeFile(wb, `attendance-${word}.xlsx`)
  }

  // ── render ───────────────────────────────────────────────────────────────────

  const sorted = [...records].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  )

  const filtered = sorted.filter((r) => {
    const wordMatch = !selectedWord || r.code_word.toLowerCase() === selectedWord.toLowerCase()
    const permMatch = !permSearch.trim() || r.student_id.toLowerCase().includes(permSearch.trim().toLowerCase())
    return wordMatch && permMatch
  })

  return (
    <>
      {showQR && <QRModal onClose={() => setShowQR(false)} />}

      {/* Controls card */}
      <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Row 1: word pills + location mode */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Word of the day dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium shrink-0 flex items-center gap-1" style={{ color: 'var(--navy)' }}>
              Word of the day
              <InfoTooltip text={"A secret code word you announce in class. Students enter it when checking in, which proves they're physically present.\n\nFilter by word to see attendance for a specific session. Each word in the list shows the date of first use."} />
            </span>
            <select
              value={selectedWord ?? ''}
              onChange={(e) => setSelectedWord(e.target.value || null)}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ border: '1px solid var(--border)', minWidth: '220px' }}
            >
              <option value="">All dates</option>
              {codeWordOptions.map(({ word, label }) => (
                <option key={word} value={word}>{label}</option>
              ))}
            </select>
            {selectedWord && (
              <button
                onClick={() => handleWordOfDayReport(selectedWord)}
                className="btn-gold rounded-lg px-3 py-1 text-xs"
              >
                ⬇ Export
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="shrink-0" style={{ width: '1px', height: '28px', background: 'var(--border)' }} />

          {/* Location mode segmented control */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--navy)', whiteSpace: 'nowrap' }}>
              Location
              <InfoTooltip text={"Controls whether students share GPS when checking in.\n\nOff — no location collected.\nOptional — students are asked but can skip.\nRequired — students must share location to submit (those who deny GPS cannot check in)."} />
            </span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', opacity: savingMode ? 0.6 : 1 }}>
              {(['off', 'optional', 'required'] as const).map((mode) => {
                const labels = { off: 'Off', optional: 'Optional', required: 'Required' }
                const active = locationMode === mode
                return (
                  <button
                    key={mode}
                    onClick={() => setMode(mode)}
                    disabled={savingMode}
                    className="text-xs px-3 py-1.5 transition-colors"
                    style={{
                      background: active ? 'var(--navy)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-muted)',
                      borderRight: mode !== 'required' ? '1px solid var(--border)' : 'none',
                      fontWeight: active ? 600 : 400,
                      cursor: savingMode ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {labels[mode]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Row 2: PERM search */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-medium shrink-0 flex items-center gap-1" style={{ color: 'var(--navy)' }}>
            Search PERM
            <InfoTooltip text={"Filter the table by a student's PERM number (UCSB student ID). Useful for looking up a specific student's check-in history."} />
          </span>
          <input
            type="text"
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ border: '1px solid var(--border)', width: '200px' }}
            placeholder="Filter by PERM number…"
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
          />
          {permSearch && (
            <button
              onClick={() => setPermSearch('')}
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {filtered.length}{filtered.length !== records.length ? ` of ${records.length}` : ''} submission{records.length !== 1 ? 's' : ''}
          {selectedWord ? ` · word: ${selectedWord}` : ''}
          {permSearch.trim() ? ` · perm: ${permSearch.trim()}` : ''}
        </span>
        <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
          <button onClick={handleExport} disabled={records.length === 0}
            className="btn-ghost text-xs px-3 py-1.5 rounded"
            title="Download all attendance records as a spreadsheet (.xlsx)">
            ⬇ Export All
          </button>
          <span className="flex items-center gap-1">
            <button onClick={deleteAll} disabled={deleting || records.length === 0}
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626' }}>
              {deleting ? 'Deleting…' : 'Delete All'}
            </button>
            <InfoTooltip text={"Permanently removes every attendance record for this quarter. This cannot be undone.\n\nUse this only to clear test data before the real class session."} />
          </span>
          <span className="flex items-center gap-1">
            <button className="btn-gold rounded-lg px-4 py-2 text-sm" onClick={() => setShowQR(true)}>
              Show QR Code
            </button>
            <InfoTooltip text={"Displays a full-screen QR code that students scan with their phones to record attendance.\n\nProject this on screen at the start of class. Each scan submits the student's PERM number, the code word they enter, and their GPS location (if enabled)."} />
          </span>
        </div>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}

      {!loading && records.length === 0 && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attendance submissions yet.</p>
        </div>
      )}

      {!loading && records.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No records match the current filter.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--navy)', color: 'white' }}>
                <Th>PERM</Th>
                <Th>Timestamp</Th>
                <Th>Code</Th>
                <Th>Location</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'white' : 'var(--surface)' }}>
                  <td style={td}>{r.student_id}</td>
                  <td style={{ ...td, color: 'var(--text-muted)' }}>
                    {new Date(r.submitted_at).toLocaleString('en-US', {
                      timeZone: 'America/Los_Angeles',
                      month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </td>
                  <td style={{ ...td, fontWeight: 500 }}>{r.code_word}</td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.latitude != null && r.longitude != null
                      ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
                      : <span style={{ fontStyle: 'italic' }}>unavailable</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => deleteRecord(r.id)} disabled={deleting}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent' }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, fontFamily: 'inherit' }}>
      {children}
    </th>
  )
}

const td: React.CSSProperties = { padding: '0.5rem 1rem', color: 'var(--text)' }
