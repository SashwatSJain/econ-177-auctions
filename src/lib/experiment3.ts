import {
  EXPERIMENT3_ROUNDS_PER_TREATMENT,
  EXPERIMENT3_TOTAL_ROUNDS,
  EXPERIMENT3_TREATMENTS,
  getExperiment3TreatmentByIndex,
} from '@/lib/experiment3-config'
import type {
  Experiment3BlockSummary,
  Experiment3OverallSummary,
  Experiment3Round,
  Experiment3RoundContext,
  Experiment3TreatmentConfig,
} from '@/lib/types'

export type Experiment3ProgressPhase = 'round' | 'block-summary' | 'complete'

export interface Experiment3ProgressPayload {
  phase: Experiment3ProgressPhase
  studentId: string
  totalRoundsCompleted: number
  totalRoundsExpected: number
  current: Experiment3RoundContext | null
  next: Experiment3RoundContext | null
  blockSummary: Experiment3BlockSummary | null
  overallSummary: Experiment3OverallSummary | null
}

export interface Experiment3SubmissionResult {
  row: Experiment3Round
  blockComplete: boolean
  blockSummary: Experiment3BlockSummary | null
  overallSummary: Experiment3OverallSummary | null
  next: Experiment3RoundContext | null
}

interface EvaluatedScenario {
  simulatedBids: number[]
  highestBid: number
  secondHighestBid: number
  sold: boolean
  salePrice: number | null
  profit: number
}

export function generateExperiment3Bids(
  studentId: string,
  treatmentKey: string,
  roundInTreatment: number,
  bidderCount: number
) {
  const rng = mulberry32(hashSeed(`${studentId.toLowerCase()}::${treatmentKey}::${roundInTreatment}`))
  return Array.from({ length: bidderCount }, () => roundMoney(rng() * 100))
}

export function evaluateExperiment3Round(
  treatment: Experiment3TreatmentConfig,
  studentId: string,
  roundInTreatment: number,
  reservePrice: number
): EvaluatedScenario {
  const simulatedBids = generateExperiment3Bids(
    studentId,
    treatment.key,
    roundInTreatment,
    treatment.bidderCount
  )
  const sortedBids = [...simulatedBids].sort((left, right) => right - left)
  const highestBid = sortedBids[0] ?? 0
  const secondHighestBid = sortedBids[1] ?? 0
  const sold = highestBid >= reservePrice
  const salePrice = sold ? roundMoney(Math.max(reservePrice, secondHighestBid)) : null
  const profit = sold && salePrice !== null ? roundMoney(salePrice - treatment.sellerValue) : 0

  return {
    simulatedBids,
    highestBid,
    secondHighestBid,
    sold,
    salePrice,
    profit,
  }
}

export function buildExperiment3Progress(
  studentId: string,
  rawRows: Experiment3Round[]
): Experiment3ProgressPayload {
  const rows = rawRows
    .map(normalizeExperiment3Row)
    .sort((left, right) => left.global_round - right.global_round)
  const totalRoundsCompleted = rows.length

  if (totalRoundsCompleted >= EXPERIMENT3_TOTAL_ROUNDS) {
    return {
      phase: 'complete',
      studentId,
      totalRoundsCompleted,
      totalRoundsExpected: EXPERIMENT3_TOTAL_ROUNDS,
      current: null,
      next: null,
      blockSummary: null,
      overallSummary: buildExperiment3OverallSummary(rows),
    }
  }

  if (
    totalRoundsCompleted > 0 &&
    totalRoundsCompleted % EXPERIMENT3_ROUNDS_PER_TREATMENT === 0
  ) {
    const completedIndex =
      totalRoundsCompleted / EXPERIMENT3_ROUNDS_PER_TREATMENT - 1
    const completedTreatment = getExperiment3TreatmentByIndex(completedIndex)!
    const nextTreatment = getExperiment3TreatmentByIndex(completedIndex + 1) ?? null
    const blockRows = rows.filter((row) => row.treatment_key === completedTreatment.key)

    return {
      phase: 'block-summary',
      studentId,
      totalRoundsCompleted,
      totalRoundsExpected: EXPERIMENT3_TOTAL_ROUNDS,
      current: null,
      next: nextTreatment
        ? buildRoundContext(nextTreatment, 1)
        : null,
      blockSummary: buildExperiment3BlockSummary(completedTreatment, blockRows),
      overallSummary: null,
    }
  }

  const treatmentIndex = Math.floor(totalRoundsCompleted / EXPERIMENT3_ROUNDS_PER_TREATMENT)
  const treatment = getExperiment3TreatmentByIndex(treatmentIndex)!
  const roundInTreatment = (totalRoundsCompleted % EXPERIMENT3_ROUNDS_PER_TREATMENT) + 1

  return {
    phase: 'round',
    studentId,
    totalRoundsCompleted,
    totalRoundsExpected: EXPERIMENT3_TOTAL_ROUNDS,
    current: buildRoundContext(treatment, roundInTreatment),
    next: null,
    blockSummary: null,
    overallSummary: null,
  }
}

export function buildExperiment3BlockSummary(
  treatment: Experiment3TreatmentConfig,
  rawRows: Experiment3Round[]
): Experiment3BlockSummary {
  const rows = rawRows
    .map(normalizeExperiment3Row)
    .sort((left, right) => left.round_in_treatment - right.round_in_treatment)

  return {
    treatmentKey: treatment.key,
    title: treatment.title,
    shortTitle: treatment.shortTitle,
    bidderCount: treatment.bidderCount,
    sellerValue: treatment.sellerValue,
    roundsCompleted: rows.length,
    roundsExpected: treatment.rounds,
    totalProfit: roundMoney(rows.reduce((sum, row) => sum + row.profit, 0)),
    averageProfit: average(rows.map((row) => row.profit)),
    saleRate: average(rows.map((row) => (row.sold ? 1 : 0))),
    averageReserve: average(rows.map((row) => row.reserve_price)),
    rows,
  }
}

export function buildExperiment3OverallSummary(
  rawRows: Experiment3Round[]
): Experiment3OverallSummary {
  const rows = rawRows.map(normalizeExperiment3Row)
  const blockSummaries = EXPERIMENT3_TREATMENTS.map((treatment) =>
    buildExperiment3BlockSummary(
      treatment,
      rows.filter((row) => row.treatment_key === treatment.key)
    )
  )

  return {
    totalRoundsCompleted: rows.length,
    totalRoundsExpected: EXPERIMENT3_TOTAL_ROUNDS,
    totalProfit: roundMoney(rows.reduce((sum, row) => sum + row.profit, 0)),
    averageProfit: average(rows.map((row) => row.profit)),
    saleRate: average(rows.map((row) => (row.sold ? 1 : 0))),
    blocksCompleted: blockSummaries.filter(
      (summary) => summary.roundsCompleted === summary.roundsExpected
    ).length,
    blockSummaries,
  }
}

export function buildExperiment3RoundRecord(input: {
  studentId: string
  treatment: Experiment3TreatmentConfig
  roundInTreatment: number
  reservePrice: number
}) {
  const { studentId, treatment, roundInTreatment, reservePrice } = input
  const evaluated = evaluateExperiment3Round(
    treatment,
    studentId,
    roundInTreatment,
    reservePrice
  )

  return {
    student_id: studentId.toLowerCase(),
    treatment_key: treatment.key,
    block_index: treatment.blockIndex,
    round_in_treatment: roundInTreatment,
    global_round:
      (treatment.blockIndex - 1) * EXPERIMENT3_ROUNDS_PER_TREATMENT + roundInTreatment,
    bidder_count: treatment.bidderCount,
    seller_value: treatment.sellerValue,
    reserve_price: roundMoney(reservePrice),
    simulated_bids: evaluated.simulatedBids,
    highest_bid: evaluated.highestBid,
    second_highest_bid: evaluated.secondHighestBid,
    sold: evaluated.sold,
    sale_price: evaluated.salePrice,
    profit: evaluated.profit,
  }
}

export function normalizeExperiment3Row(row: Experiment3Round): Experiment3Round {
  return {
    id: String(row.id),
    student_id: String(row.student_id).toLowerCase(),
    treatment_key: String(row.treatment_key),
    block_index: Number(row.block_index),
    round_in_treatment: Number(row.round_in_treatment),
    global_round: Number(row.global_round),
    bidder_count: Number(row.bidder_count),
    seller_value: Number(row.seller_value),
    reserve_price: Number(row.reserve_price),
    simulated_bids: Array.isArray(row.simulated_bids)
      ? row.simulated_bids.map((value) => Number(value))
      : [],
    highest_bid: Number(row.highest_bid),
    second_highest_bid: Number(row.second_highest_bid),
    sold: Boolean(row.sold),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    profit: Number(row.profit),
    created_at: String(row.created_at),
  }
}

function buildRoundContext(
  treatment: Experiment3TreatmentConfig,
  roundInTreatment: number
): Experiment3RoundContext {
  return {
    treatment,
    roundInTreatment,
    globalRound:
      (treatment.blockIndex - 1) * EXPERIMENT3_ROUNDS_PER_TREATMENT + roundInTreatment,
    sellerValue: treatment.sellerValue,
  }
}

function average(values: number[]) {
  if (values.length === 0) return null
  return roundMoney(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function hashSeed(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
