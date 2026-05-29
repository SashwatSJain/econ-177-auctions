import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId } from '@/lib/get-quarter-id'

const SESSION = 'default'

// POST { num_bidders } — instructor: group all unmatched bidders into groups of num_bidders
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const num_bidders = Number(body?.num_bidders)
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const quarterId = await getActiveQuarterId(admin)

  let ungroupedQuery = admin
    .from('exp6_allpay')
    .select('id')
    .eq('session_key', SESSION)
    .eq('num_bidders', num_bidders)
    .is('group_id', null)
    .not('bid', 'is', null)
    .order('created_at', { ascending: true })
  if (quarterId) ungroupedQuery = ungroupedQuery.eq('quarter_id', quarterId)

  const { data: ungrouped } = await ungroupedQuery

  const pool = [...(ungrouped ?? [])].sort(() => Math.random() - 0.5)
  let grouped = 0

  for (let i = 0; i + num_bidders <= pool.length; i += num_bidders) {
    const group_id = crypto.randomUUID()
    const slice = pool.slice(i, i + num_bidders)
    for (let role = 0; role < slice.length; role++) {
      await admin.from('exp6_allpay').update({ group_id, role }).eq('id', slice[role].id)
    }
    grouped += num_bidders
  }

  return NextResponse.json({ grouped, ungrouped: pool.length - grouped })
}

// DELETE ?num_bidders=N — instructor: un-group all entries for a given num_bidders
export async function DELETE(req: NextRequest) {
  const num_bidders = Number(req.nextUrl.searchParams.get('num_bidders'))
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('exp6_allpay')
    .update({ group_id: null, role: null })
    .eq('session_key', SESSION)
    .eq('num_bidders', num_bidders)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
