'use client'

import { useState, useEffect } from 'react'
import type { ClassSchedule } from '@/app/api/settings/route'

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
]

export default function ClassScheduleSettings() {
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('10:50')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [hasSchedule, setHasSchedule] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const s = d.class_schedule as ClassSchedule | null
        if (s) {
          setDays(s.days)
          setStart(s.start)
          setEnd(s.end)
          setHasSchedule(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleDay(v: number) {
    setDays((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v].sort((a, b) => a - b))
  }

  async function handleSave() {
    if (days.length === 0) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_schedule: { days, start, end } }),
      })
      if (res.ok) { setSaved(true); setHasSchedule(true); setTimeout(() => setSaved(false), 2000) }
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!confirm('Remove the class schedule?')) return
    setClearing(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_schedule: null }),
      })
      if (res.ok) {
        setDays([]); setStart('10:00'); setEnd('10:50'); setHasSchedule(false)
      }
    } finally {
      setClearing(false)
    }
  }

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>

  return (
    <div className="max-w-md">
      <p className="text-xs mb-5" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
        Set when your class meets. Each experiment&apos;s detail page will show whether student submissions align with class time.
      </p>

      {/* Day selector */}
      <div className="mb-4">
        <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Days</p>
        <div className="flex gap-2">
          {DAYS.map(({ label, value }) => {
            const active = days.includes(value)
            return (
              <button
                key={value}
                onClick={() => toggleDay(value)}
                className="text-xs px-3 py-2 rounded-lg font-medium transition-all"
                style={{
                  background: active ? 'var(--navy)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time range */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Start</p>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>End</p>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || days.length === 0}
          className="btn-gold text-xs px-4 py-2 rounded-lg font-medium"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save schedule'}
        </button>
        {hasSchedule && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'transparent' }}
          >
            {clearing ? 'Clearing…' : 'Remove'}
          </button>
        )}
        {days.length === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Select at least one day</span>
        )}
      </div>
    </div>
  )
}
