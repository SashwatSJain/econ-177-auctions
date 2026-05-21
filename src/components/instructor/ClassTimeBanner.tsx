'use client'

import { useEffect, useState } from 'react'
import type { InferredDateResult } from '@/app/api/settings/inferred-dates/route'

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ClassTimeBanner({ exp }: { exp: number }) {
  const [data, setData] = useState<InferredDateResult | null>(null)

  useEffect(() => {
    fetch(`/api/settings/inferred-dates?exp=${exp}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
  }, [exp])

  if (!data || !data.inferredDate) return null

  const dayName = data.dayOfWeek !== null ? DOW[data.dayOfWeek] : ''
  const dateLabel = `${dayName}, ${formatDate(data.inferredDate)}`

  let badge: React.ReactNode = null
  if (data.inClass === true && data.onTimeStudents !== null) {
    badge = (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: '#dcfce7', color: '#15803d' }}>
        ✓ {data.onTimeStudents} in class · {data.outOfWindowStudents} outside
      </span>
    )
  } else if (data.inClass === false && data.onTimeStudents !== null) {
    badge = (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: '#fef9c3', color: '#854d0e' }}>
        ⚠ {data.onTimeStudents} in class · {data.outOfWindowStudents} outside
      </span>
    )
  } else {
    badge = (
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Set class times in Settings to verify in-class usage
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 mb-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Conducted</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>{dateLabel}</span>
      <span style={{ color: 'var(--border)' }}>·</span>
      {badge}
    </div>
  )
}
