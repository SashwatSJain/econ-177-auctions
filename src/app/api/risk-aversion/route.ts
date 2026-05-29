import { NextRequest, NextResponse } from 'next/server'
import { computeClassResults, invalidateRiskAversionCache } from '@/lib/risk-aversion-results'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId, resolveQuarterId } from '@/lib/get-quarter-id'
import type { RiskAversionResponse } from '@/lib/types'

const C_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90]
const COL_NAMES = ['p_10', 'p_20', 'p_30', 'p_40', 'p_50', 'p_60', 'p_70', 'p_80', 'p_90'] as const

// POST /api/risk-aversion — public, no auth required
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { student_id, probabilities } = body

  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  if (!Array.isArray(probabilities) || probabilities.length !== 9) {
    return NextResponse.json({ error: 'probabilities must be an array of exactly 9 values' }, { status: 400 })
  }

  for (let i = 0; i < 9; i++) {
    const p = probabilities[i]
    if (typeof p !== 'number' || p <= 0 || p > 1) {
      return NextResponse.json(
        { error: `Probability for C=$${C_VALUES[i]} must be between 0 (exclusive) and 1` },
        { status: 400 }
      )
    }
  }

  for (let i = 0; i < 8; i++) {
    if (probabilities[i] > probabilities[i + 1]) {
      return NextResponse.json(
        { error: `Probabilities must be weakly increasing: p for C=$${C_VALUES[i]} exceeds p for C=$${C_VALUES[i + 1]}` },
        { status: 400 }
      )
    }
  }

  const id = student_id.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  const quarterId = await getActiveQuarterId(admin)
  if (!quarterId) return NextResponse.json({ error: 'No active quarter' }, { status: 500 })

  const { count } = await admin
    .from('risk_aversion_responses')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', id)
    .eq('quarter_id', quarterId)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const row: Record<string, string | number> = { student_id: id }
  COL_NAMES.forEach((col, i) => { row[col] = probabilities[i] })

  const { data, error } = await admin
    .from('risk_aversion_responses')
    .insert(row)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  invalidateRiskAversionCache()

  return NextResponse.json(data, { status: 201 })
}

// GET /api/risk-aversion — public
// ?raw=true → returns all individual rows (for instructor view)
// default   → returns class aggregate results
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('raw') === 'true'

    const admin = createAdminSupabaseClient()
    const quarterId = await resolveQuarterId(admin, searchParams.get('quarter'))

    let query = admin
      .from('risk_aversion_responses')
      .select('*')
      .order('created_at', { ascending: true })
    if (quarterId) query = query.eq('quarter_id', quarterId)

    const { data, error } = await query
    if (error) throw error

    if (raw) {
      return NextResponse.json(data ?? [])
    }

    const results = computeClassResults((data ?? []) as RiskAversionResponse[])
    return NextResponse.json(results)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
