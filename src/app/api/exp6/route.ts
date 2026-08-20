import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId, resolveQuarterId } from '@/lib/get-quarter-id'

const SESSION = 'default'

// GET ?num_bidders=N — instructor: list entries
export async function GET(req: NextRequest) {
  const nb = Number(req.nextUrl.searchParams.get('num_bidders'))
  const admin = createAdminSupabaseClient()
  const quarterId = await resolveQuarterId(admin, req.nextUrl.searchParams.get('quarter'))

  let query = admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .order('created_at', { ascending: true })

  if (quarterId) query = query.eq('quarter_id', quarterId)
  if ([2, 5, 10].includes(nb)) query = query.eq('num_bidders', nb)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST { student_id, bid, num_bidders } — student submits bid (idempotent)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const raw = body?.student_id
  const num_bidders = Number(body?.num_bidders)
  const bidVal = body?.bid

  if (!raw || typeof raw !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }
  if (![2, 5, 10].includes(num_bidders)) {
    return NextResponse.json({ error: 'num_bidders must be 2, 5, or 10' }, { status: 400 })
  }
  const bidNum = Number(bidVal)
  if (!isFinite(bidNum) || bidNum < 0) {
    return NextResponse.json({ error: 'bid must be a non-negative number' }, { status: 400 })
  }

  const student_id = raw.trim().toLowerCase()
  const bid = Math.round(bidNum * 100) / 100
  const admin = createAdminSupabaseClient()
  const quarterId = await getActiveQuarterId(admin)
  if (!quarterId) return NextResponse.json({ error: 'No active quarter' }, { status: 500 })

  // Return existing submission if already recorded for this quarter
  const { data: existing } = await admin
    .from('exp6_allpay')
    .select('*')
    .eq('session_key', SESSION)
    .eq('student_id', student_id)
    .eq('num_bidders', num_bidders)
    .eq('quarter_id', quarterId)
    .maybeSingle()

  if (existing) return NextResponse.json(existing)

  const { data, error } = await admin
    .from('exp6_allpay')
    .insert({ session_key: SESSION, student_id, num_bidders, bid, quarter_id: quarterId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE ?id=<uuid> — delete a single row (un-groups rest of group first)
//         ?num_bidders=N — reset all entries for that num_bidders
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const nb = Number(req.nextUrl.searchParams.get('num_bidders'))
  const admin = createAdminSupabaseClient()

  if (id) {
    const { data: target } = await admin
      .from('exp6_allpay')
      .select('group_id')
      .eq('id', id)
      .maybeSingle()

    if (target?.group_id) {
      await admin
        .from('exp6_allpay')
        .update({ group_id: null, role: null })
        .eq('group_id', target.group_id)
        .neq('id', id)
    }

    const { error } = await admin.from('exp6_allpay').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if ([2, 5, 10].includes(nb)) {
    const quarterId = await getActiveQuarterId(admin)
    let query = admin
      .from('exp6_allpay')
      .delete()
      .eq('session_key', SESSION)
      .eq('num_bidders', nb)
    if (quarterId) query = query.eq('quarter_id', quarterId)
    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide id or num_bidders' }, { status: 400 })
}
