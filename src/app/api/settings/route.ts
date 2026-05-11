import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export type LocationMode = 'off' | 'optional' | 'required'

export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('app_settings')
    .select('location_mode')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location_mode: data.location_mode as LocationMode })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const valid: LocationMode[] = ['off', 'optional', 'required']
  if (!valid.includes(body.location_mode)) {
    return NextResponse.json({ error: 'location_mode must be off, optional, or required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('app_settings')
    .update({ location_mode: body.location_mode })
    .eq('id', 1)
    .select('location_mode')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location_mode: data.location_mode as LocationMode })
}
