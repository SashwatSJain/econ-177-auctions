import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const GROUP_SIZE = 10

// POST — assign ungrouped students into groups of 10
export async function POST() {
  const admin = createAdminSupabaseClient()

  const { data: ungrouped } = await admin
    .from('experiment4_responses')
    .select('id')
    .is('group_id', null)
    .order('created_at', { ascending: true })

  const pool = [...(ungrouped ?? [])].sort(() => Math.random() - 0.5)
  let grouped = 0

  for (let i = 0; i + GROUP_SIZE <= pool.length; i += GROUP_SIZE) {
    const group_id = crypto.randomUUID()
    const ids = pool.slice(i, i + GROUP_SIZE).map((r) => r.id)
    await admin.from('experiment4_responses').update({ group_id }).in('id', ids)
    grouped += GROUP_SIZE
  }

  return NextResponse.json({ grouped, ungrouped: pool.length - grouped })
}
