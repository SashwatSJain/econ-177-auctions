import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// POST /api/beta/cv-auction/bid
// Body: { student_id, bid, variant? }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const raw = body?.student_id
  const bid = body?.bid
  const variant = body?.variant === 'continuous' ? 'continuous' : 'integer'

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  const bidNum = Number(bid)
  if (!isFinite(bidNum) || bidNum < 0 || bidNum > 6) {
    return NextResponse.json({ error: 'bid must be a number 0–6' }, { status: 400 })
  }
  if (variant === 'integer' && !Number.isInteger(bidNum)) {
    return NextResponse.json({ error: 'bid must be a whole number 0–6' }, { status: 400 })
  }

  const student_id = raw.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  const { data: entry } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('variant', variant)
    .maybeSingle()

  if (!entry) return NextResponse.json({ error: 'Not joined yet' }, { status: 404 })
  if (entry.bid !== null) return NextResponse.json(entry)

  const roundedBid = variant === 'continuous' ? Math.round(bidNum * 100) / 100 : bidNum

  const { data, error } = await admin
    .from('beta_cv_auction')
    .update({ bid: roundedBid })
    .eq('id', entry.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
