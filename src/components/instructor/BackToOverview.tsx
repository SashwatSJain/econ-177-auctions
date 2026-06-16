'use client'

import Link from 'next/link'
import { useQuarterParam } from '@/lib/use-quarter-param'

export default function BackToOverview() {
  const quarter = useQuarterParam()
  const href = quarter ? `/instructor?quarter=${encodeURIComponent(quarter)}` : '/instructor'
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
      ← Back to overview
    </Link>
  )
}
