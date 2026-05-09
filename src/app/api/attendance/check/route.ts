import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const student_id = searchParams.get('student_id')

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  const id = student_id.trim().toLowerCase()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const admin = createAdminSupabaseClient()

  const { count } = await admin
    .from('attendance_records')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', id)
    .gte('submitted_at', `${today}T00:00:00-08:00`)
    .lt('submitted_at', `${today}T23:59:59-08:00`)

  return NextResponse.json({ submitted: (count ?? 0) > 0 })
}
