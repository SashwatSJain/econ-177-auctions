import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { Experiment3Round } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const netid = searchParams.get('netid')?.trim().toLowerCase()

  if (!netid) {
    return NextResponse.json({ error: 'Missing netid' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  const [
    { data: bidRows, error: bidError },
    { data: experiment3Rows, error: experiment3Error },
  ] = await Promise.all([
    supabase
      .from('bids')
      .select('*')
      .eq('student_id', netid)
      .order('created_at', { ascending: true }),
    supabase
      .from('experiment3_rounds')
      .select('*')
      .eq('student_id', netid)
      .order('created_at', { ascending: true }),
  ])

  if (bidError || experiment3Error) {
    return NextResponse.json(
      { error: bidError?.message ?? experiment3Error?.message ?? 'Export failed.' },
      { status: 500 }
    )
  }

  if ((!bidRows || bidRows.length === 0) && (!experiment3Rows || experiment3Rows.length === 0)) {
    return NextResponse.json({ empty: true }, { status: 404 })
  }

  const headers = [
    'record_type',
    'id',
    'student_id',
    'auction_type',
    'round',
    'private_value',
    'amount',
    'treatment_key',
    'block_index',
    'round_in_treatment',
    'global_round',
    'bidder_count',
    'seller_value',
    'reserve_price',
    'simulated_bids',
    'highest_bid',
    'second_highest_bid',
    'sold',
    'sale_price',
    'profit',
    'created_at',
  ]
  const rows = [
    ...(bidRows ?? []).map((row) =>
      serializeCsvRow(headers, {
        record_type: 'bid',
        id: row.id,
        student_id: row.student_id,
        auction_type: row.auction_type,
        round: row.round,
        private_value: row.private_value,
        amount: row.amount,
        created_at: row.created_at,
      })
    ),
    ...((experiment3Rows ?? []) as Experiment3Round[]).map((row) =>
      serializeCsvRow(headers, {
        record_type: 'experiment3',
        id: row.id,
        student_id: row.student_id,
        treatment_key: row.treatment_key,
        block_index: row.block_index,
        round_in_treatment: row.round_in_treatment,
        global_round: row.global_round,
        bidder_count: row.bidder_count,
        seller_value: row.seller_value,
        reserve_price: row.reserve_price,
        simulated_bids: JSON.stringify(row.simulated_bids),
        highest_bid: row.highest_bid,
        second_highest_bid: row.second_highest_bid,
        sold: row.sold,
        sale_price: row.sale_price,
        profit: row.profit,
        created_at: row.created_at,
      })
    ),
  ]
  const csv = [headers.join(','), ...rows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${netid}-bids.csv"`,
    },
  })
}

function serializeCsvRow(headers: string[], row: Record<string, unknown>) {
  return headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')
}
