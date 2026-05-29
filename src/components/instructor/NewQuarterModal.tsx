'use client'

import { useState } from 'react'
import type { ClassSchedule } from '@/app/api/settings/route'

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
]

export default function NewQuarterModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (name: string) => void
}) {
  const [name, setName] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('10:50')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = name.trim().length > 0

  function toggleDay(v: number) {
    setDays((prev) => prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v].sort((a, b) => a - b))
  }

  async function handleCreate() {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const schedule: ClassSchedule | null = days.length > 0 ? { days, start, end } : null
      const res = await fetch('/api/admin/quarters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), class_schedule: schedule }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to create quarter')
      }
      onCreated(name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Start New Quarter</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Current data is archived. The new quarter starts empty.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Quarter name */}
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>
            Quarter name
          </label>
          <input
            type="text"
            className="w-full rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Fall 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleCreate() }}
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            autoFocus
          />
        </div>

        {/* Class schedule (optional) */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Class schedule (optional)
          </p>

          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Days</p>
            <div className="flex gap-2">
              {DAYS.map(({ label, value }) => {
                const active = days.includes(value)
                return (
                  <button
                    key={value}
                    onClick={() => toggleDay(value)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: active ? 'var(--navy)' : 'transparent',
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

          {days.length > 0 && (
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Start</p>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg px-3 py-1.5 text-sm"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>End</p>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-lg px-3 py-1.5 text-sm"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={!canSubmit || saving}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
            style={{
              background: canSubmit ? 'var(--navy)' : 'var(--border)',
              color: canSubmit ? '#fff' : 'var(--text-muted)',
              border: 'none',
              cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Creating…' : 'Start Quarter'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-lg"
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
