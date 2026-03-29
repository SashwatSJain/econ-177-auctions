import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuctionConfig } from '@/lib/auction-config'

// GET /api/progress?student_id=...&auction_type=...  — public
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('student_id')
  const auctionType = searchParams.get('auction_type')

  if (!studentId || !auctionType) {
    return NextResponse.json({ error: 'Missing student_id or auction_type' }, { status: 400 })
  }

  if (!getAuctionConfig(auctionType)) {
    return NextResponse.json({ error: 'Invalid auction type' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { count, error } = await supabase
    .from('bids')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId.toLowerCase())
    .eq('auction_type', auctionType)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rounds_completed: count ?? 0 })
}
