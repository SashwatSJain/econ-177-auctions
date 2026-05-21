import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getAuctionConfig } from '@/lib/auction-config'

// Public (no auth) — returns only private_value and amount for charting.
// student_id is intentionally excluded.
export async function GET(req: NextRequest) {
  const auctionType = req.nextUrl.searchParams.get('auction_type')

  if (!auctionType || !getAuctionConfig(auctionType)) {
    return NextResponse.json({ error: 'Invalid auction_type' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('bids')
    .select('private_value, amount')
    .eq('auction_type', auctionType)
    .order('created_at', { ascending: true })
    .limit(10000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
