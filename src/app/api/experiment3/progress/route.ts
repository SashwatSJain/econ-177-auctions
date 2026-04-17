import { NextRequest, NextResponse } from 'next/server'

import { buildExperiment3Progress } from '@/lib/experiment3'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { Experiment3Round } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('student_id')?.trim().toLowerCase()

  if (!studentId) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('experiment3_rounds')
      .select('*')
      .eq('student_id', studentId)
      .order('global_round', { ascending: true })

    if (error) throw error

    const progress = buildExperiment3Progress(studentId, (data ?? []) as Experiment3Round[])
    return NextResponse.json(progress)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load Experiment 3 progress.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
