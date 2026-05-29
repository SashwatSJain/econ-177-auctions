import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { resolveQuarterId } from '@/lib/get-quarter-id'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const admin = createAdminSupabaseClient()
  const quarterParam = req.nextUrl.searchParams.get('quarter')
  const quarterId = await resolveQuarterId(admin, quarterParam)
  if (!quarterId) {
    return NextResponse.json({ error: 'No active quarter' }, { status: 404 })
  }

  const [
    { data: bids },
    { data: riskAversion },
    { data: exp3 },
    { data: exp4 },
    { data: exp5 },
    { data: exp6 },
    { data: attendance },
  ] = await Promise.all([
    admin.from('bids').select('*').eq('quarter_id', quarterId).order('created_at', { ascending: true }),
    admin.from('risk_aversion_responses').select('*').eq('quarter_id', quarterId).order('created_at', { ascending: true }),
    admin.from('experiment3_rounds').select('*').eq('quarter_id', quarterId).order('global_round', { ascending: true }),
    admin.from('experiment4_responses').select('*').eq('quarter_id', quarterId).order('created_at', { ascending: true }),
    admin.from('beta_cv_auction').select('*').eq('quarter_id', quarterId).order('created_at', { ascending: true }),
    admin.from('exp6_allpay').select('*').eq('quarter_id', quarterId).order('created_at', { ascending: true }),
    admin.from('attendance_records').select('*').eq('quarter_id', quarterId).order('submitted_at', { ascending: true }),
  ])

  const wb = XLSX.utils.book_new()

  const sheets: [string, Record<string, unknown>[] | null][] = [
    ['Exp1 - Bids', bids],
    ['Exp2 - Risk Aversion', riskAversion],
    ['Exp3 - Seller Auction', exp3],
    ['Exp4 - Penny Jar Experiment', exp4],
    ['Exp5 - Oil Well', exp5],
    ['Exp6 - All-Pay', exp6],
    ['Attendance', attendance],
  ]

  for (const [name, rows] of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows ?? [])
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="econ177-${date}.xlsx"`,
    },
  })
}
