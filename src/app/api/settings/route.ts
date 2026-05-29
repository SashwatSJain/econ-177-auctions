import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export type LocationMode = 'off' | 'optional' | 'required'

export type ClassSchedule = {
  days: number[]  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  start: string   // "HH:MM" 24-hour
  end: string     // "HH:MM" 24-hour
}

export async function GET() {
  const admin = createAdminSupabaseClient()

  const [{ data: settings, error }, { data: quarter }] = await Promise.all([
    admin.from('app_settings').select('location_mode').single(),
    admin.from('quarters').select('class_schedule').eq('is_active', true).single(),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    location_mode: settings.location_mode as LocationMode,
    class_schedule: (quarter?.class_schedule ?? null) as ClassSchedule | null,
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const admin = createAdminSupabaseClient()

  if ('location_mode' in body) {
    const valid: LocationMode[] = ['off', 'optional', 'required']
    if (!valid.includes(body.location_mode)) {
      return NextResponse.json({ error: 'location_mode must be off, optional, or required' }, { status: 400 })
    }
    const { error } = await admin
      .from('app_settings')
      .update({ location_mode: body.location_mode })
      .eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ('class_schedule' in body) {
    const s = body.class_schedule
    if (s !== null) {
      if (
        !Array.isArray(s.days) ||
        s.days.some((d: unknown) => typeof d !== 'number' || d < 0 || d > 6) ||
        typeof s.start !== 'string' ||
        typeof s.end !== 'string'
      ) {
        return NextResponse.json({ error: 'Invalid class_schedule format' }, { status: 400 })
      }
    }
    const { error } = await admin
      .from('quarters')
      .update({ class_schedule: s })
      .eq('is_active', true)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return merged state
  const [{ data: settings, error: e2 }, { data: quarter }] = await Promise.all([
    admin.from('app_settings').select('location_mode').single(),
    admin.from('quarters').select('class_schedule').eq('is_active', true).single(),
  ])

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  return NextResponse.json({
    location_mode: settings.location_mode as LocationMode,
    class_schedule: (quarter?.class_schedule ?? null) as ClassSchedule | null,
  })
}
