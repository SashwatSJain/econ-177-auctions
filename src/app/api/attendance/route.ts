import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('attendance_records')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { student_id, latitude, longitude, accuracy, code_word } = body

  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (latitude !== null && latitude !== undefined && typeof latitude !== 'number') {
    return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 })
  }
  if (longitude !== null && longitude !== undefined && typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 })
  }
  if (!code_word || typeof code_word !== 'string') {
    return NextResponse.json({ error: 'Missing code_word' }, { status: 400 })
  }

  const id = student_id.trim().toLowerCase()
  const normalizedCode = code_word.trim().toLowerCase()
  const cookieStore = await cookies()

  // Check if this device has already submitted with this code word
  const usedCodes = (cookieStore.get('att_used_codes')?.value ?? '')
    .split(',')
    .filter(Boolean)
  if (usedCodes.includes(normalizedCode)) {
    return NextResponse.json({ error: 'Device already used for this code' }, { status: 409 })
  }

  const admin = createAdminSupabaseClient()

  // Check for duplicate submission for this student + code word
  const { count } = await admin
    .from('attendance_records')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', id)
    .eq('code_word', normalizedCode)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('attendance_records')
    .insert({
      student_id: id,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      accuracy: accuracy ?? null,
      code_word: normalizedCode,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark this code word as used on this device
  const updatedCodes = [...usedCodes, normalizedCode].join(',')
  const res = NextResponse.json(data, { status: 201 })
  res.cookies.set('att_used_codes', updatedCodes, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 2,
  })
  return res
}
