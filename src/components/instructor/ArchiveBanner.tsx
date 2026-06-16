'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuarterParam } from '@/lib/use-quarter-param'
import type { Quarter } from '@/app/api/admin/quarters/route'

export default function ArchiveBanner() {
  const quarter = useQuarterParam()
  const router = useRouter()
  const [quarterName, setQuarterName] = useState<string | null>(null)

  useEffect(() => {
    if (!quarter) return
    fetch('/api/admin/quarters')
      .then((r) => r.json())
      .then((list: Quarter[]) => {
        const q = list.find((x) => x.id === quarter)
        if (q && !q.is_active) setQuarterName(q.name)
      })
      .catch(() => {})
  }, [quarter])

  if (!quarterName) return null

  return (
    <div
      className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
    >
      <span style={{ color: '#92400e', fontSize: 14 }}>📦</span>
      <p className="text-xs font-medium" style={{ color: '#92400e' }}>
        Viewing archived quarter: <strong>{quarterName}</strong>
      </p>
      <button
        onClick={() => router.push('/instructor')}
        className="ml-auto text-xs px-3 py-1 rounded-lg"
        style={{ background: '#92400e', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        Back to current
      </button>
    </div>
  )
}
