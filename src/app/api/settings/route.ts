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
  const { data, error } = await admin
    .from('app_settings')
    .select('location_mode, class_schedule')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    location_mode: data.location_mode as LocationMode,
    class_schedule: (data.class_schedule ?? null) as ClassSchedule | null,
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const admin = createAdminSupabaseClient()

  const update: Record<string, unknown> = {}

  if ('location_mode' in body) {
    const valid: LocationMode[] = ['off', 'optional', 'required']
    if (!valid.includes(body.location_mode)) {
      return NextResponse.json({ error: 'location_mode must be off, optional, or required' }, { status: 400 })
    }
    update.location_mode = body.location_mode
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
    update.class_schedule = s
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('app_settings')
    .update(update)
    .eq('id', 1)
    .select('location_mode, class_schedule')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    location_mode: data.location_mode as LocationMode,
    class_schedule: (data.class_schedule ?? null) as ClassSchedule | null,
  })
}
