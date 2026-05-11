import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// GET ?num_bidders=N — instructor: list entries
export async function GET(req: NextRequest) {
  const nb = Number(req.nextUrl.searchParams.get('num_bidders'))
  const admin = createAdminSupabaseClient()

  let query = admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .order('created_at', { ascending: true })

  if ([2, 5, 10].includes(nb)) {
    query = query.eq('num_bidders', nb)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST { student_id, bid, num_bidders } — student submits bid (idempotent)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const raw = body?.student_id
  const num_bidders = Number(body?.num_bidders)
  const bidVal = body?.bid

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }
  const bidNum = Number(bidVal)
  if (!isFinite(bidNum) || bidNum < 0) {
    return NextResponse.json({ error: 'bid must be a non-negative number' }, { status: 400 })
  }

  const student_id = raw.trim().toLowerCase()
  const bid = Math.round(bidNum * 100) / 100
  const admin = createAdminSupabaseClient()

  // Return existing submission if already recorded
  const { data: existing } = await admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('num_bidders', num_bidders)
    .maybeSingle()

  if (existing) return NextResponse.json(existing)

  const { data, error } = await admin
    .from('exp6_allpay')
    .insert({ session_key: SESSION, student_id, num_bidders, bid })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
