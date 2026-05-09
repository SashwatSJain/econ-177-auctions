import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { student_id, latitude, longitude, accuracy, code_word } = body

  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Missing or invalid latitude/longitude' }, { status: 400 })
  }
  if (!code_word || typeof code_word !== 'string') {
    return NextResponse.json({ error: 'Missing code_word' }, { status: 400 })
  }

  const id = student_id.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  // Check for duplicate submission today (Pacific time)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const { count } = await admin
    .from('attendance_records')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', id)
    .gte('submitted_at', `${today}T00:00:00-08:00`)
    .lt('submitted_at', `${today}T23:59:59-08:00`)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('attendance_records')
    .insert({
      student_id: id,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      code_word: code_word.trim(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
