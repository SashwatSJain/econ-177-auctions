import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const netid = searchParams.get('netid')?.trim().toLowerCase()

  if (!netid) {
    return NextResponse.json({ error: 'Missing netid' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('student_id', netid)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ empty: true }, { status: 404 })
  }

  const headers = ['id', 'student_id', 'auction_type', 'round', 'private_value', 'amount', 'created_at']
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
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
