'use client'

import { useSearchParams } from 'next/navigation'

export function useQuarterParam(): string | null {
  const sp = useSearchParams()
  return sp.get('quarter')
}

export function withQuarter(url: string, quarter: string | null): string {
  if (!quarter) return url
  return url + (url.includes('?') ? '&' : '?') + 'quarter=' + encodeURIComponent(quarter)
}
