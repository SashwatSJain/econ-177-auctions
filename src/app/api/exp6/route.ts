import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const SESSION = 'default'

// GET ?num_bidders=N — instructor: list entries
export async function GET(req: NextRequest) {
  const nb = Number(req.nextUrl.searchParams.get('num_bidders'))
  const admin = createAdminSupabaseClient()

  let query = admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .order('created_at', { ascending: true })

  if ([2, 5, 10].includes(nb)) {
    query = query.eq('num_bidders', nb)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST { num_bidders } — instructor: group ungrouped bidders into groups of N
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const num_bidders = Number(body?.num_bidders)

  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  const { data: ungrouped } = await admin
    .from('exp6_allpay')
    .select('id')
    .eq('session_key', SESSION)
    .eq('num_bidders', num_bidders)
    .is('group_id', null)
    .not('bid', 'is', null)
    .order('created_at', { ascending: true })

  const pool = [...(ungrouped ?? [])].sort(() => Math.random() - 0.5)
  let grouped = 0

  for (let i = 0; i + num_bidders <= pool.length; i += num_bidders) {
    const group_id = crypto.randomUUID()
    for (let j = 0; j < num_bidders; j++) {
      await admin
        .from('exp6_allpay')
        .update({ group_id, role: j + 1 })
        .eq('id', pool[i + j].id)
    }
    grouped += num_bidders
  }

  return NextResponse.json({ grouped, leftover: pool.length - grouped })
}

// DELETE ?num_bidders=N — instructor: reset session
export async function DELETE(req: NextRequest) {
  const nb = Number(req.nextUrl.searchParams.get('num_bidders'))
  const admin = createAdminSupabaseClient()

  let query = admin.from('exp6_allpay').delete().eq('session_key', SESSION)

  if ([2, 5, 10].includes(nb)) {
    query = query.eq('num_bidders', nb)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
