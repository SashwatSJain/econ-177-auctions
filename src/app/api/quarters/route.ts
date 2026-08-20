import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// Public (no auth) — minimal quarter list for the public Charts page's quarter
// selector. Deliberately excludes class_schedule and any admin-only fields so
// this can stay unauthenticated even after /api/admin/* gets an auth check.
export type PublicQuarter = {
  id: string
  name: string
  is_active: boolean
}

export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('quarters')
    .select('id, name, is_active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}
