import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { ClassSchedule } from '../route'

const LA_TZ = 'America/Los_Angeles'

// Interpret a UTC timestamp as a local Date in LA timezone.
// `new Date(dt.toLocaleString('en-US', { timeZone }))` creates a Date whose
// getFullYear/getMonth/getDate/getHours/getMinutes reflect LA local time,
// sidestepping all Intl hour12/h23/h24 quirks.
function laLocalDate(ts: string): Date {
  const dt = new Date(ts)
  return new Date(dt.toLocaleString('en-US', { timeZone: LA_TZ }))
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

// Mode date by unique student count — one student = one vote for the date,
// even if they have many rows (e.g. 10 rounds in exp1).
function getModeDate(rows: { student_id: string; created_at: string }[]): { date: string; studentCount: number } | null {
  if (!rows.length) return null
  // For each student, collect the dates they submitted on
  const studentDates = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!studentDates.has(r.student_id)) studentDates.set(r.student_id, new Set())
    studentDates.get(r.student_id)!.add(dateInLA(r.created_at))
  }
  // Count unique students per date
  const dateCounts = new Map<string, number>()
  for (const dates of studentDates.values()) {
    for (const d of dates) {
      dateCounts.set(d, (dateCounts.get(d) ?? 0) + 1)
    }
  }
  const [date, studentCount] = [...dateCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  return { date, studentCount }
}

function dayOfWeekForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  // 15:00 UTC is 7–8am LA time — safely within the day in any LA DST state
  const dt = new Date(Date.UTC(y, m - 1, d, 15))
  const name = new Intl.DateTimeFormat('en-US', { timeZone: LA_TZ, weekday: 'long' }).format(dt)
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(name)
}

// Count unique students on the given date who have at least one submission inside [start, end]
function studentsInWindow(
  rows: { student_id: string; created_at: string }[],
  date: string,
  start: string,
  end: string,
): number {
  const startMin = timeToMinutes(start)
  const endMin = timeToMinutes(end)
  const seen = new Set<string>()
  for (const r of rows) {
    if (dateInLA(r.created_at) !== date) continue
    if (minutesInDay(r.created_at) >= startMin && minutesInDay(r.created_at) <= endMin) {
      seen.add(r.student_id)
    }
  }
  return seen.size
}


export type InferredDateResult = {
  exp: number
  inferredDate: string | null
  dayOfWeek: number | null
  totalStudents: number
  onTimeStudents: number | null
  outOfWindowStudents: number | null
  inClass: boolean | null
  scheduleStart: string | null
  scheduleEnd: string | null
}

// For high-volume tables (bids, experiment3_rounds), use compact views so we
// never hit PostgREST's default 1000-row cap on the raw tables.
const TABLES: { exp: number; table: string; daysView: string | null }[] = [
  { exp: 1, table: 'bids',                     daysView: 'v_bids_student_days' },
  { exp: 2, table: 'risk_aversion_responses',   daysView: null },
  { exp: 3, table: 'experiment3_rounds',        daysView: 'v_exp3_student_days' },
  { exp: 4, table: 'experiment4_responses',     daysView: null },
  { exp: 5, table: 'beta_cv_auction',           daysView: null },
  { exp: 6, table: 'exp6_allpay',              daysView: null },
]

export async function GET(req: NextRequest) {
  const expParam = req.nextUrl.searchParams.get('exp')
  const expFilter = expParam ? Number(expParam) : null
  const quarterParam = req.nextUrl.searchParams.get('quarter')

  const admin = createAdminSupabaseClient()

  const quarterQuery = quarterParam
    ? admin.from('quarters').select('id, class_schedule').eq('id', quarterParam).single()
    : admin.from('quarters').select('id, class_schedule').eq('is_active', true).single()
  const { data: quarterData } = await quarterQuery
  const quarterId = quarterData?.id ?? null
  const schedule = (quarterData?.class_schedule ?? null) as ClassSchedule | null

  if (!quarterId) {
    const empty = (TABLES.filter(t => !expFilter || t.exp === expFilter)).map(({ exp }) => ({
      exp, inferredDate: null, dayOfWeek: null, totalStudents: 0,
      onTimeStudents: null, outOfWindowStudents: null, inClass: null,
      scheduleStart: null, scheduleEnd: null,
    }))
    return NextResponse.json(expFilter ? (empty[0] ?? null) : empty)
  }

  const targets = expFilter ? TABLES.filter((t) => t.exp === expFilter) : TABLES

  const results: InferredDateResult[] = await Promise.all(
    targets.map(async ({ exp, table, daysView }) => {
      if (daysView) {
        // Step 1: compact view → (student_id, date_la) rows, well under 1000-row cap
        const { data: dayRows } = await admin
          .from(daysView)
          .select('student_id, date_la')
          .eq('quarter_id', quarterId)
        const days: { student_id: string; date_la: string }[] = dayRows ?? []

        const totalStudents = new Set(days.map((r) => r.student_id)).size
        if (!totalStudents) {
          return { exp, inferredDate: null, dayOfWeek: null, totalStudents: 0, onTimeStudents: null, outOfWindowStudents: null, inClass: null, scheduleStart: schedule?.start ?? null, scheduleEnd: schedule?.end ?? null }
        }

        // Mode date by unique student count
        const dateCounts = new Map<string, number>()
        for (const r of days) {
          dateCounts.set(r.date_la, (dateCounts.get(r.date_la) ?? 0) + 1)
        }
        const [[modeDate, modeCount]] = [...dateCounts.entries()].sort((a, b) => b[1] - a[1])
        const dow = dayOfWeekForDate(modeDate)

        let onTimeStudents: number | null = null
        let outOfWindowStudents: number | null = null
        let inClass: boolean | null = null

        if (schedule) {
          // Step 2: fetch only rows from the mode date + within window — small result set
          const { data: windowRows } = await admin
            .from(table)
            .select('student_id, created_at')
            .eq('quarter_id', quarterId)
            .gte('created_at', new Date(`${modeDate}T00:00:00-08:00`).toISOString())
            .lte('created_at', new Date(`${modeDate}T23:59:59-07:00`).toISOString())
          const modeRows: { student_id: string; created_at: string }[] = windowRows ?? []
          onTimeStudents = studentsInWindow(modeRows, modeDate, schedule.start, schedule.end)
          outOfWindowStudents = totalStudents - onTimeStudents
          const dayMatches = schedule.days.includes(dow)
          inClass = dayMatches && onTimeStudents / modeCount >= 0.5
        }

        return { exp, inferredDate: modeDate, dayOfWeek: dow, totalStudents, onTimeStudents, outOfWindowStudents, inClass, scheduleStart: schedule?.start ?? null, scheduleEnd: schedule?.end ?? null }
      }

      // Low-volume tables: fetch all rows directly (always under 1000-row cap)
      const { data } = await admin.from(table).select('student_id, created_at').eq('quarter_id', quarterId)
      const rows: { student_id: string; created_at: string }[] = data ?? []

      const totalStudents = new Set(rows.map((r) => r.student_id)).size
      const mode = getModeDate(rows)

      if (!mode) {
        return { exp, inferredDate: null, dayOfWeek: null, totalStudents, onTimeStudents: null, outOfWindowStudents: null, inClass: null, scheduleStart: schedule?.start ?? null, scheduleEnd: schedule?.end ?? null }
      }

      const dow = dayOfWeekForDate(mode.date)
      let onTimeStudents: number | null = null
      let outOfWindowStudents: number | null = null
      let inClass: boolean | null = null

      if (schedule) {
        onTimeStudents = studentsInWindow(rows, mode.date, schedule.start, schedule.end)
        outOfWindowStudents = totalStudents - onTimeStudents
        const dayMatches = schedule.days.includes(dow)
        inClass = dayMatches && onTimeStudents / mode.studentCount >= 0.5
      }

      return { exp, inferredDate: mode.date, dayOfWeek: dow, totalStudents, onTimeStudents, outOfWindowStudents, inClass, scheduleStart: schedule?.start ?? null, scheduleEnd: schedule?.end ?? null }
    })
  )

  if (expFilter) {
    return NextResponse.json(results[0] ?? null)
  }
  return NextResponse.json(results)
}
