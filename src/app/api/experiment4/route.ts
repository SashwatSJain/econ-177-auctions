import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getActiveQuarterId, resolveQuarterId } from '@/lib/get-quarter-id'

// GET /api/experiment4 — returns all rows (instructor use)
export async function GET(req: NextRequest) {
  const admin = createAdminSupabaseClient()
  const quarterId = await resolveQuarterId(admin, req.nextUrl.searchParams.get('quarter'))
  const [{ data, error }, { data: allSamples }] = await Promise.all([
    quarterId
      ? admin.from('experiment4_responses').select('*').eq('quarter_id', quarterId).order('created_at', { ascending: true })
      : admin.from('experiment4_responses').select('*').order('created_at', { ascending: true }),
    admin.from('experiment4_samples').select('student_id, ref_id, created_at').order('created_at', { ascending: true }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch the referenced rows for all assigned samples
  const refIds = [...new Set((allSamples ?? []).map((s) => s.ref_id))]
  const { data: refRows } = refIds.length > 0
    ? await admin.from('experiment4_responses').select('id, student_id, estimate, bid_10').in('id', refIds)
    : { data: [] }

  const refMap = new Map((refRows ?? []).map((r) => [r.id, r]))

  // Per-student: download time + ordered sample rows
  const downloadMap = new Map<string, string>()
  const sampleMap = new Map<string, { student_id: string; estimate: number; bid_10: number }[]>()
  for (const s of allSamples ?? []) {
    if (!downloadMap.has(s.student_id)) downloadMap.set(s.student_id, s.created_at)
    const ref = refMap.get(s.ref_id)
    if (ref) {
      if (!sampleMap.has(s.student_id)) sampleMap.set(s.student_id, [])
      sampleMap.get(s.student_id)!.push({ student_id: ref.student_id, estimate: ref.estimate, bid_10: ref.bid_10 })
    }
  }

  return NextResponse.json(
    (data ?? []).map((r) => ({
      ...r,
      downloaded_at: downloadMap.get(r.student_id) ?? null,
      sample: sampleMap.get(r.student_id) ?? null,
    }))
  )
}

// POST /api/experiment4
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { student_id, estimate, bid_2, bid_10, bid_100 } = body

  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  }

  for (const [field, val] of [['estimate', estimate], ['bid_2', bid_2], ['bid_10', bid_10], ['bid_100', bid_100]] as [string, unknown][]) {
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
    }
  }

  const id = student_id.trim().toLowerCase()
  const admin = createAdminSupabaseClient()

  const activeQuarterId = await getActiveQuarterId(admin)
  if (!activeQuarterId) return NextResponse.json({ error: 'No active quarter' }, { status: 500 })

  const { count } = await admin
    .from('experiment4_responses')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', id)
    .eq('quarter_id', activeQuarterId)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('experiment4_responses')
    .insert({ student_id: id, estimate, bid_2, bid_10, bid_100 })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/experiment4?id=<uuid>
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('experiment4_responses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
