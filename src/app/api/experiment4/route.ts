import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// GET /api/experiment4 — returns all rows (instructor use)
export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('experiment4_responses')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/experiment4
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { student_id, estimate, bid_2, bid_10, bid_100 } = body

  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  for (const [field, val] of [['estimate', estimate], ['bid_2', bid_2], ['bid_10', bid_10], ['bid_100', bid_100]] as [string, unknown][]) {
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
    }
  }

  const id = student_id.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  const { count } = await admin
    .from('experiment4_responses')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', id)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('experiment4_responses')
    .insert({ student_id: id, estimate, bid_2, bid_10, bid_100 })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
