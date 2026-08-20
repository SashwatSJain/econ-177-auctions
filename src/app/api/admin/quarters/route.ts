import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { ClassSchedule } from '@/app/api/settings/route'

export type Quarter = {
  id: string
  name: string
  is_active: boolean
  class_schedule: ClassSchedule | null
  created_at: string
}

export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('quarters')
    .select('id, name, is_active, class_schedule, created_at')
    .order('created_at', { ascending: false })

  // Return empty list gracefully if the table doesn't exist yet (pre-migration)
  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const schedule = body?.class_schedule ?? null
  if (schedule !== null) {
    if (
      !Array.isArray(schedule.days) ||
      schedule.days.some((d: unknown) => typeof d !== 'number' || d < 0 || d > 6) ||
      typeof schedule.start !== 'string' ||
      typeof schedule.end !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid class_schedule format' }, { status: 400 })
    }
  }

  const admin = createAdminSupabaseClient()

  // Deactivate-then-insert runs as a single DB transaction (create_quarter is a
  // plpgsql function), so a failure can never leave the system with zero active
  // quarters — see supabase/quarter-fixes-migration.sql.
  const { data, error } = await admin
    .rpc('create_quarter', { p_name: name, p_class_schedule: schedule })
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
