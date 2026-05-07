import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// POST /api/beta/cv-auction/bid
// Body: { student_id, bid }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const raw = body?.student_id
  const bid = body?.bid

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (!Number.isInteger(bid) || bid < 0 || bid > 6) {
    return NextResponse.json({ error: 'bid must be an integer 0–6' }, { status: 400 })
  }

  const student_id = raw.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  const { data: entry } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .maybeSingle()

  if (!entry) return NextResponse.json({ error: 'Not joined yet' }, { status: 404 })
  if (entry.bid !== null) return NextResponse.json(entry)

  const { data, error } = await admin
    .from('beta_cv_auction')
    .update({ bid })
    .eq('id', entry.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
