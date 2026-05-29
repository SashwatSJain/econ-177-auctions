import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { ClassSchedule } from '@/app/api/settings/route'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  if (!('class_schedule' in body)) {
    return NextResponse.json({ error: 'class_schedule is required' }, { status: 400 })
  }

  const s = body.class_schedule as ClassSchedule | null
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

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('quarters')
    .update({ class_schedule: s })
    .eq('id', id)
    .select('id, name, is_active, class_schedule, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
