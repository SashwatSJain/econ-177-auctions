import { NextRequest, NextResponse } from 'next/server'

import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveQuarterId } from '@/lib/get-quarter-id'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const treatmentKey = searchParams.get('treatment_key')

  try {
    const admin = createAdminSupabaseClient()
    const quarterId = await resolveQuarterId(admin, searchParams.get('quarter'))

    let query = admin
      .from('experiment3_rounds')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(10000)

    if (quarterId) query = query.eq('quarter_id', quarterId)
    if (treatmentKey) query = query.eq('treatment_key', treatmentKey)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load Experiment 3 rows.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
