import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// GET  — instructor: list entries (optionally filter by variant)
export async function GET(req: NextRequest) {
  const variant = req.nextUrl.searchParams.get('variant')
  const admin = createAdminSupabaseClient()
  let query = admin
    .from('beta_cv_auction')
    .select('*')
    .eq('session_key', SESSION)
    .order('created_at', { ascending: true })

  if (variant === 'integer' || variant === 'continuous') {
    query = query.eq('variant', variant)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — instructor: pair all unpaired bidders within a variant
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const variant = body?.variant === 'continuous' ? 'continuous' : 'integer'
  const admin = createAdminSupabaseClient()

  const { data: unpaired } = await admin
    .from('beta_cv_auction')
    .select('id')
    .eq('session_key', SESSION)
    .eq('variant', variant)
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

// DELETE — instructor: reset session (optionally by variant)
export async function DELETE(req: NextRequest) {
  const variant = req.nextUrl.searchParams.get('variant')
  const admin = createAdminSupabaseClient()
  let query = admin.from('beta_cv_auction').delete().eq('session_key', SESSION)

  if (variant === 'integer' || variant === 'continuous') {
    query = query.eq('variant', variant)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
