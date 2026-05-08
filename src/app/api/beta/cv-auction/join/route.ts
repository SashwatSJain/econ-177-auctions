import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// POST /api/beta/cv-auction/join
// Body: { student_id, variant? }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const raw = body?.student_id
  const variant = body?.variant === 'continuous' ? 'continuous' : 'integer'

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  const student_id = raw.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  const { data: existing } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('variant', variant)
    .maybeSingle()

  if (existing) return NextResponse.json(existing)

  const half_value =
    variant === 'continuous'
      ? Math.round(Math.random() * 300) / 100  // U[0,3] to 2 decimal places
      : Math.random() < 0.5 ? 0 : 3

  const { data, error } = await admin
    .from('beta_cv_auction')
    .insert({ session_key: SESSION, student_id, variant, half_value })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
