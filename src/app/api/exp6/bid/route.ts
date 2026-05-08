import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// POST /api/exp6/bid
// Body: { student_id, bid, num_bidders }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const raw = body?.student_id
  const bid = body?.bid
  const num_bidders = Number(body?.num_bidders)

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }

  const bidNum = Number(bid)
  if (!isFinite(bidNum) || bidNum < 0) {
    return NextResponse.json({ error: 'bid must be a non-negative number' }, { status: 400 })
  }

  const student_id = raw.trim().toLowerCase()
  const roundedBid = Math.round(bidNum * 100) / 100
  const admin = createAdminSupabaseClient()

  const { data: entry } = await admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('num_bidders', num_bidders)
    .maybeSingle()

  if (!entry) return NextResponse.json({ error: 'Not joined yet' }, { status: 404 })
  if (entry.bid !== null) return NextResponse.json(entry)

  const { data, error } = await admin
    .from('exp6_allpay')
    .update({ bid: roundedBid })
    .eq('id', entry.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
