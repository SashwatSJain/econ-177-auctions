import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// GET  — instructor: list all entries
export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — instructor: pair all unpaired bidders
export async function POST() {
  const admin = createAdminSupabaseClient()

  const { data: unpaired } = await admin
    .from('beta_cv_auction')
    .select('id')
    .eq('session_key', SESSION)
    .is('pair_id', null)
    .not('bid', 'is', null)
    .order('created_at', { ascending: true })

  const pool = [...(unpaired ?? [])].sort(() => Math.random() - 0.5)
  let paired = 0

  for (let i = 0; i + 1 < pool.length; i += 2) {
    const pair_id = crypto.randomUUID()
    await admin.from('beta_cv_auction').update({ pair_id, role: 'a' }).eq('id', pool[i].id)
    await admin.from('beta_cv_auction').update({ pair_id, role: 'b' }).eq('id', pool[i + 1].id)
    paired += 2
  }

  return NextResponse.json({ paired, unpaired: pool.length - paired })
}

// DELETE — instructor: reset session (clear all entries)
export async function DELETE() {
  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('beta_cv_auction')
    .delete()
    .eq('session_key', SESSION)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
