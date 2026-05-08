import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// POST /api/exp6/join
// Body: { student_id, num_bidders }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const raw = body?.student_id
  const num_bidders = Number(body?.num_bidders)

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }

  const student_id = raw.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

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
    .insert({ session_key: SESSION, student_id, num_bidders })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
