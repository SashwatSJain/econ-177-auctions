import 'server-only'

import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { RiskAversionClassResults, RiskAversionResponse } from '@/lib/types'

const C_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const
const COL_NAMES = [
  'p_10', 'p_20', 'p_30', 'p_40', 'p_50',
  'p_60', 'p_70', 'p_80', 'p_90',
] as const

export function computeClassResults(rows: RiskAversionResponse[]): RiskAversionClassResults {
  if (rows.length === 0) {
    return {
      submission_count: 0,
      means: [
        ...C_VALUES.map((c) => ({ c_value: c, mean_p: 0 })),
        { c_value: 100, mean_p: 1 },
      ],
      alpha_estimate: null,
    }
  }

  const means: { c_value: number; mean_p: number }[] = C_VALUES.map((c, i) => ({
    c_value: c,
    mean_p: rows.reduce((s, r) => s + Number(r[COL_NAMES[i]]), 0) / rows.length,
  }))
  means.push({ c_value: 100, mean_p: 1 })

  // No-intercept OLS: α = Σ(x·y) / Σ(x²)
  // where y = ln(p_i), x = ln(C_i / 100)
  let sumXY = 0
  let sumX2 = 0
  for (const row of rows) {
    for (let i = 0; i < 9; i++) {
      const p = Number(row[COL_NAMES[i]])
      if (p <= 0) continue
      const x = Math.log(C_VALUES[i] / 100)
      const y = Math.log(p)
      sumXY += x * y
      sumX2 += x * x
    }
  }

  return {
    submission_count: rows.length,
    means,
    alpha_estimate: sumX2 > 0 ? sumXY / sumX2 : null,
  }
}

const TTL_MS = 60_000
let cache: { promise: Promise<RiskAversionClassResults>; expiresAt: number } | null = null

export function fetchRiskAversionClassResults(): Promise<RiskAversionClassResults> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.promise
  }
  const supabase = createAdminSupabaseClient()
  const promise = Promise.resolve(
    supabase
      .from('risk_aversion_responses')
      .select('*')
      .order('created_at', { ascending: true })
  )
    .then(({ data, error }) => {
      if (error) throw error
      return computeClassResults((data ?? []) as RiskAversionResponse[])
    })
    .catch((err: unknown) => {
      cache = null
      throw err
    })
  cache = { promise, expiresAt: Date.now() + TTL_MS }
  return promise
}

export function invalidateRiskAversionCache() {
  cache = null
}
