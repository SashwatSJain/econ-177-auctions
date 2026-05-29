import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId } from '@/lib/get-quarter-id'

const SESSION = 'default'

// GET /api/beta/cv-auction/result?student_id=...&variant=...
export async function GET(req: NextRequest) {
  const student_id = req.nextUrl.searchParams.get('student_id')?.trim().toLowerCase()
  const variant = req.nextUrl.searchParams.get('variant') === 'continuous' ? 'continuous' : 'integer'
  if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const quarterId = await getActiveQuarterId(admin)
  if (!quarterId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: own } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('variant', variant)
    .eq('quarter_id', quarterId)
    .maybeSingle()

  if (!own) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!own.pair_id) {
    const { data: anyPaired } = await admin
      .from('beta_cv_auction')
      .select('id')
      .eq('session_key', SESSION)
      .eq('variant', variant)
      .eq('quarter_id', quarterId)
      .not('pair_id', 'is', null)
      .limit(1)
      .maybeSingle()

    if (anyPaired) return NextResponse.json({ status: 'unmatched' })
    return NextResponse.json({ status: 'waiting' })
  }

  const { data: partner } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('pair_id', own.pair_id)
    .neq('id', own.id)
    .maybeSingle()

  if (!partner || partner.bid === null) return NextResponse.json({ status: 'waiting' })

  return NextResponse.json({ status: 'ready', own, partner })
}
