import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const TABLES = [
  'bids',
  'risk_aversion_responses',
  'experiment3_rounds',
  'experiment4_responses',
  'beta_cv_auction',
  'exp6_allpay',
  'attendance_records',
] as const

export async function POST() {
  const admin = createAdminSupabaseClient()

  const results = await Promise.all(
    TABLES.map(async (table) => {
      // Delete all rows by matching id != '' (a safe always-true predicate)
      const { error, count } = await admin
        .from(table)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000')
      return { table, error: error?.message ?? null, count }
    })
  )

  const failed = results.filter((r) => r.error)
  if (failed.length > 0) {
    return NextResponse.json({ ok: false, errors: failed }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tables: results })
}
