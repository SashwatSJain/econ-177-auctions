import { NextRequest, NextResponse } from 'next/server'

import {
  EXPERIMENT3_ROUNDS_PER_TREATMENT,
  EXPERIMENT3_TOTAL_ROUNDS,
  EXPERIMENT3_TREATMENTS,
  getExperiment3Treatment,
  getExperiment3TreatmentByIndex,
} from '@/lib/experiment3-config'
import {
  buildExperiment3BlockSummary,
  buildExperiment3OverallSummary,
  buildExperiment3RoundRecord,
  normalizeExperiment3Row,
} from '@/lib/experiment3'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { Experiment3Round } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const studentId = String(body.student_id ?? '').trim().toLowerCase()
    const treatmentKey = String(body.treatment_key ?? '').trim()
    const roundInTreatment = Number(body.round_in_treatment)
    const reservePrice = Number(body.reserve_price)

    if (!studentId || !treatmentKey || !Number.isInteger(roundInTreatment)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Number.isFinite(reservePrice) || reservePrice < 0 || reservePrice > 100) {
      return NextResponse.json(
        { error: 'Reserve price must be between 0 and 100.' },
        { status: 400 }
      )
    }

    const treatment = getExperiment3Treatment(treatmentKey)
    if (!treatment) {
      return NextResponse.json({ error: 'Invalid treatment key' }, { status: 400 })
    }

    if (roundInTreatment < 1 || roundInTreatment > EXPERIMENT3_ROUNDS_PER_TREATMENT) {
      return NextResponse.json({ error: 'Round out of range' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const { data: existingRows, error: existingError } = await admin
      .from('experiment3_rounds')
      .select('*')
      .eq('student_id', studentId)
      .order('global_round', { ascending: true })

    if (existingError) throw existingError

    const rows = (existingRows ?? []) as Experiment3Round[]

    if (rows.length >= EXPERIMENT3_TOTAL_ROUNDS) {
      return NextResponse.json({ error: 'Experiment 3 is already complete.' }, { status: 409 })
    }

    const expectedTreatmentIndex = Math.floor(
      rows.length / EXPERIMENT3_ROUNDS_PER_TREATMENT
    )
    const expectedTreatment = getExperiment3TreatmentByIndex(expectedTreatmentIndex)
    const expectedRoundInTreatment =
      (rows.length % EXPERIMENT3_ROUNDS_PER_TREATMENT) + 1

    if (!expectedTreatment || expectedTreatment.key !== treatment.key) {
      return NextResponse.json(
        { error: 'This treatment is not currently available.' },
        { status: 409 }
      )
    }

    if (roundInTreatment !== expectedRoundInTreatment) {
      return NextResponse.json(
        { error: 'This round has already been recorded or is out of order.' },
        { status: 409 }
      )
    }

    const duplicate = rows.find(
      (row) =>
        row.treatment_key === treatment.key &&
        Number(row.round_in_treatment) === roundInTreatment
    )
    if (duplicate) {
      return NextResponse.json({ error: 'Already submitted for this round.' }, { status: 409 })
    }

    const record = buildExperiment3RoundRecord({
      studentId,
      treatment,
      roundInTreatment,
      reservePrice,
    })

    const { data: insertedRow, error: insertError } = await admin
      .from('experiment3_rounds')
      .insert(record)
      .select()
      .single()

    if (insertError) throw insertError

    const normalizedRow = normalizeExperiment3Row(insertedRow as Experiment3Round)
    const allRows = [...rows.map(normalizeExperiment3Row), normalizedRow]
    const blockRows = allRows.filter((row) => row.treatment_key === treatment.key)
    const blockComplete =
      blockRows.length === EXPERIMENT3_ROUNDS_PER_TREATMENT

    const nextTreatment = blockComplete
      ? EXPERIMENT3_TREATMENTS[treatment.blockIndex] ?? null
      : treatment

    const nextRoundInTreatment = blockComplete
      ? 1
      : roundInTreatment + 1

    return NextResponse.json({
      row: normalizedRow,
      blockComplete,
      blockSummary: blockComplete
        ? buildExperiment3BlockSummary(treatment, blockRows)
        : null,
      overallSummary:
        allRows.length >= EXPERIMENT3_TOTAL_ROUNDS
          ? buildExperiment3OverallSummary(allRows)
          : null,
      next: nextTreatment
        ? {
            treatment: nextTreatment,
            roundInTreatment: nextRoundInTreatment,
            globalRound:
              (nextTreatment.blockIndex - 1) * EXPERIMENT3_ROUNDS_PER_TREATMENT +
              nextRoundInTreatment,
            sellerValue: nextTreatment.sellerValue,
          }
        : null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to submit Experiment 3 round.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
