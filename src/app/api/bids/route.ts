import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuctionConfig, TOTAL_ROUNDS } from '@/lib/auction-config'

// POST /api/bids — public, no auth required
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { student_id, auction_type, round, private_value, amount } = body

  if (!student_id || !auction_type || !round || private_value == null || amount == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!getAuctionConfig(auction_type)) {
    return NextResponse.json({ error: 'Invalid auction type' }, { status: 400 })
  }

  if (round < 1 || round > TOTAL_ROUNDS) {
    return NextResponse.json({ error: 'Round out of range' }, { status: 400 })
  }

  if (amount < 0) {
    return NextResponse.json({ error: 'Bid amount must be non-negative' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Check student hasn't already submitted this round
  const { count } = await supabase
    .from('bids')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', student_id.toLowerCase())
    .eq('auction_type', auction_type)
    .eq('round', round)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Already submitted for this round' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('bids')
    .insert({
      student_id: student_id.toLowerCase(),
      auction_type,
      round,
      private_value,
      amount,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/bids?id=<uuid> — delete a single bid
// DELETE /api/bids?student_id=<id>&auction_type=<type> — delete all bids by a student in an auction
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const studentId = searchParams.get('student_id')
  const auctionType = searchParams.get('auction_type')

  const supabase = await createServerSupabaseClient()

  if (id) {
    const { error } = await supabase.from('bids').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: 1 })
  }

  if (studentId && auctionType) {
    const { error, count } = await supabase
      .from('bids')
      .delete({ count: 'exact' })
      .eq('student_id', studentId.toLowerCase())
      .eq('auction_type', auctionType)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: count ?? 0 })
  }

  return NextResponse.json({ error: 'Provide id or student_id+auction_type' }, { status: 400 })
}

// GET /api/bids?auction_type=... — requires auth (enforced by RLS)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auctionType = searchParams.get('auction_type')

  const supabase = await createServerSupabaseClient()

  let query = supabase.from('bids').select('*').order('created_at', { ascending: true }).limit(10000)
  if (auctionType) query = query.eq('auction_type', auctionType)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
