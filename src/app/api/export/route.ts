import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const netid = searchParams.get('netid')?.trim().toLowerCase()

  if (!netid) {
    return NextResponse.json({ error: 'Missing netid' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  const { data: bidRows, error: bidError } = await supabase
    .from('bids')
    .select('*')
    .eq('student_id', netid)
    .order('created_at', { ascending: true })

  if (bidError) {
    return NextResponse.json({ error: bidError.message ?? 'Export failed.' }, { status: 500 })
  }

  if (!bidRows || bidRows.length === 0) {
    return NextResponse.json({ empty: true }, { status: 404 })
  }

  const headers = [
    'id',
    'student_id',
    'auction_type',
    'round',
    'private_value',
    'amount',
    'created_at',
  ]
  const rows = bidRows.map((row) =>
    serializeCsvRow(headers, {
      id: row.id,
      student_id: row.student_id,
      auction_type: row.auction_type,
      round: row.round,
      private_value: row.private_value,
      amount: row.amount,
      created_at: row.created_at,
    })
  )
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
