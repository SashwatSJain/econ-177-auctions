import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { resolveQuarterId } from '@/lib/get-quarter-id'

// Public (no auth) — returns only the fields needed for per-round chart aggregation.
// student_id is intentionally excluded.
export async function GET(req: NextRequest) {
  const treatmentKey = req.nextUrl.searchParams.get('treatment_key')
  const admin = createAdminSupabaseClient()
  const quarterId = await resolveQuarterId(admin, req.nextUrl.searchParams.get('quarter'))
  if (!quarterId) return NextResponse.json([])

  let query = admin
    .from('experiment3_rounds')
    .select('round_in_treatment, reserve_price, profit, sold')
    .eq('quarter_id', quarterId)
    .order('created_at', { ascending: true })
    .limit(10000)

  if (treatmentKey) {
    query = query.eq('treatment_key', treatmentKey)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
