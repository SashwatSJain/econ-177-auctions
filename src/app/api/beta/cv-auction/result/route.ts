import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// GET /api/beta/cv-auction/result?student_id=...
// Returns { status: 'waiting' } until paired + partner has bid.
// Returns { status: 'ready', own, partner } once results are available.
export async function GET(req: NextRequest) {
  const student_id = req.nextUrl.searchParams.get('student_id')?.trim().toLowerCase()
  if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  const { data: own } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .maybeSingle()

  if (!own) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!own.pair_id) return NextResponse.json({ status: 'waiting' })

  const { data: partner } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('pair_id', own.pair_id)
    .neq('id', own.id)
    .maybeSingle()

  if (!partner || partner.bid === null) return NextResponse.json({ status: 'waiting' })

  return NextResponse.json({ status: 'ready', own, partner })
}
