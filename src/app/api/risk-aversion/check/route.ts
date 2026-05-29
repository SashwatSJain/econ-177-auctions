import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId } from '@/lib/get-quarter-id'

// GET /api/risk-aversion/check?student_id=... — public
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const student_id = searchParams.get('student_id')

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const quarterId = await getActiveQuarterId(admin)
  if (!quarterId) return NextResponse.json({ submitted: false })

  const { count } = await admin
    .from('risk_aversion_responses')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', student_id.trim().toLowerCase())
    .eq('quarter_id', quarterId)

  return NextResponse.json({ submitted: (count ?? 0) > 0 })
}
