import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId } from '@/lib/get-quarter-id'

const SESSION = 'default'

// GET ?student_id=...&num_bidders=N
// Returns status: 'waiting' | 'unmatched' | 'ready'
// When ready: { own, group } where group = all members sorted by role
export async function GET(req: NextRequest) {
  const student_id = req.nextUrl.searchParams.get('student_id')?.trim().toLowerCase()
  const num_bidders = Number(req.nextUrl.searchParams.get('num_bidders'))

  if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const quarterId = await getActiveQuarterId(admin)
  if (!quarterId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: own } = await admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('num_bidders', num_bidders)
    .eq('quarter_id', quarterId)
    .maybeSingle()

  if (!own) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!own.group_id) {
    // Check if any grouping has happened at all — if so, this student was left out
    const { data: anyGrouped } = await admin
      .from('exp6_allpay')
      .select('id')
      .eq('session_key', SESSION)
      .eq('num_bidders', num_bidders)
      .eq('quarter_id', quarterId)
      .not('group_id', 'is', null)
      .limit(1)
      .maybeSingle()

    if (anyGrouped) return NextResponse.json({ status: 'unmatched' })
    return NextResponse.json({ status: 'waiting' })
  }

  const { data: group } = await admin
    .from('exp6_allpay')
    .select('*')
    .eq('group_id', own.group_id)
    .order('role', { ascending: true })

  if (!group || group.some((m) => m.bid === null)) {
    return NextResponse.json({ status: 'waiting' })
  }

  return NextResponse.json({ status: 'ready', own, group })
}
