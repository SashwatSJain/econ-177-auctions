import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { ClassSchedule } from '../../settings/route'

// ts: ISO timestamp of first submission (null only if DB has no data at all)
// late: true = submitted but outside class window; false = in-window or no schedule configured
export type ExpParticipation = false | { ts: string | null; late: boolean }

export type ParticipationRow = {
  student_id: string
  exp1: ExpParticipation
  exp2: ExpParticipation
  exp3: ExpParticipation
  exp4: ExpParticipation
  exp5: ExpParticipation
  exp6: ExpParticipation
}

const LA_TZ = 'America/Los_Angeles'

function laLocalDate(ts: string): Date {
  return new Date(new Date(ts).toLocaleString('en-US', { timeZone: LA_TZ }))
}

function dateInLA(ts: string): string {
  const d = laLocalDate(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function minutesInDay(ts: string): number {
  const d = laLocalDate(ts)
  return d.getHours() * 60 + d.getMinutes()
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function modeDateFromDays(days: { student_id: string; date_la: string }[]): string | null {
  if (!days.length) return null
  const counts = new Map<string, number>()
  for (const r of days) counts.set(r.date_la, (counts.get(r.date_la) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function modeDateFromRows(rows: { student_id: string; created_at: string }[]): string | null {
  if (!rows.length) return null
  const studentDates = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!studentDates.has(r.student_id)) studentDates.set(r.student_id, new Set())
    studentDates.get(r.student_id)!.add(dateInLA(r.created_at))
  }
  const counts = new Map<string, number>()
  for (const dates of studentDates.values()) {
    for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  if (!counts.size) return null
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

type StudentMap = Map<string, { ts: string | null; late: boolean }>

export async function GET() {
  const admin = createAdminSupabaseClient()

  const { data: settings } = await admin.from('app_settings').select('class_schedule').single()
  const schedule = (settings?.class_schedule ?? null) as ClassSchedule | null

  const [
    { data: e1Days },
    { data: e2Rows },
    { data: e3Days },
    { data: e4Rows },
    { data: e5Rows },
    { data: e6Rows },
  ] = await Promise.all([
    admin.from('v_bids_student_days').select('student_id, date_la'),
    admin.from('risk_aversion_responses').select('student_id, created_at'),
    admin.from('v_exp3_student_days').select('student_id, date_la'),
    admin.from('experiment4_responses').select('student_id, created_at'),
    admin.from('beta_cv_auction').select('student_id, created_at').not('bid', 'is', null),
    admin.from('exp6_allpay').select('student_id, created_at').not('bid', 'is', null),
  ])

  // High-volume tables: use the day-first view (one row per student-day) to avoid row cap.
  // The view stores the first submission per student per LA calendar day.
  async function resolveHighVolume(
    days: { student_id: string; date_la: string }[],
    dayFirstView: string,
  ): Promise<StudentMap> {
    if (!schedule) {
      const m: StudentMap = new Map()
      for (const r of days) if (!m.has(r.student_id)) m.set(r.student_id, { ts: null, late: false })
      return m
    }
    const modeDate = modeDateFromDays(days)
    if (!modeDate) return new Map()
    const startMin = timeToMinutes(schedule.start)
    const endMin = timeToMinutes(schedule.end)

    // Step 1: first submission per student on mode date (~students rows, well under cap)
    const { data: modeDateFirst } = await admin
      .from(dayFirstView)
      .select('student_id, first_at')
      .eq('date_la', modeDate)

    const result: StudentMap = new Map()
    for (const r of (modeDateFirst ?? []) as { student_id: string; first_at: string }[]) {
      const mins = minutesInDay(r.first_at)
      result.set(r.student_id, { ts: r.first_at, late: !(mins >= startMin && mins <= endMin) })
    }

    // Step 2: students who submitted on a different date — get their earliest submission
    const nonModeDateIds = [...new Set(
      days.filter(r => !result.has(r.student_id)).map(r => r.student_id)
    )]
    if (nonModeDateIds.length > 0) {
      const { data: nonModeFirst } = await admin
        .from(dayFirstView)
        .select('student_id, first_at')
        .in('student_id', nonModeDateIds)
        .order('first_at', { ascending: true })
      const earliest = new Map<string, string>()
      for (const r of (nonModeFirst ?? []) as { student_id: string; first_at: string }[]) {
        if (!earliest.has(r.student_id)) earliest.set(r.student_id, r.first_at)
      }
      for (const id of nonModeDateIds) {
        result.set(id, { ts: earliest.get(id) ?? null, late: true })
      }
    }

    return result
  }

  // Low-volume tables: all rows already in memory, compute everything in JS
  function resolveLowVolume(rows: { student_id: string; created_at: string }[]): StudentMap {
    const firstTs = new Map<string, string>()
    for (const r of rows) if (!firstTs.has(r.student_id)) firstTs.set(r.student_id, r.created_at)

    if (!schedule) {
      const m: StudentMap = new Map()
      for (const [id, ts] of firstTs) m.set(id, { ts, late: false })
      return m
    }

    const modeDate = modeDateFromRows(rows)
    if (!modeDate) return new Map()
    const startMin = timeToMinutes(schedule.start)
    const endMin = timeToMinutes(schedule.end)

    const onModeDate = new Map<string, string>()
    for (const r of rows) {
      if (dateInLA(r.created_at) === modeDate && !onModeDate.has(r.student_id)) {
        onModeDate.set(r.student_id, r.created_at)
      }
    }

    const result: StudentMap = new Map()
    for (const [id, ts] of onModeDate) {
      const mins = minutesInDay(ts)
      result.set(id, { ts, late: !(mins >= startMin && mins <= endMin) })
    }
    for (const [id, ts] of firstTs) {
      if (!result.has(id)) result.set(id, { ts, late: true })
    }
    return result
  }

  const [exp1Map, exp3Map] = await Promise.all([
    resolveHighVolume(e1Days ?? [], 'v_bids_student_day_first'),
    resolveHighVolume(e3Days ?? [], 'v_exp3_student_day_first'),
  ])
  const exp2Map = resolveLowVolume(e2Rows ?? [])
  const exp4Map = resolveLowVolume(e4Rows ?? [])
  const exp5Map = resolveLowVolume(e5Rows ?? [])
  const exp6Map = resolveLowVolume(e6Rows ?? [])

  const maps = { exp1: exp1Map, exp2: exp2Map, exp3: exp3Map, exp4: exp4Map, exp5: exp5Map, exp6: exp6Map }
  const allIds = new Set([
    ...exp1Map.keys(), ...exp2Map.keys(), ...exp3Map.keys(),
    ...exp4Map.keys(), ...exp5Map.keys(), ...exp6Map.keys(),
  ])

  const rows: ParticipationRow[] = [...allIds]
    .sort()
    .map((id) => ({
      student_id: id,
      exp1: maps.exp1.get(id) ?? false,
      exp2: maps.exp2.get(id) ?? false,
      exp3: maps.exp3.get(id) ?? false,
      exp4: maps.exp4.get(id) ?? false,
      exp5: maps.exp5.get(id) ?? false,
      exp6: maps.exp6.get(id) ?? false,
    }))

  return NextResponse.json(rows)
}
