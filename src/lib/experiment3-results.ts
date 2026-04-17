import {
  EXPERIMENT3_ROUNDS_PER_TREATMENT,
  EXPERIMENT3_TREATMENTS,
} from '@/lib/experiment3-config'
import type { Experiment3Round } from '@/lib/types'

export interface Experiment3StudentResultsSection {
  key: string
  title: string
  shortTitle: string
  bidderCount: number
  sellerValue: number
  roundsCompleted: number
  roundsExpected: number
  isAvailable: boolean
  isComplete: boolean
  totalProfit: number | null
  averageProfit: number | null
  averageReserve: number | null
  saleRate: number | null
}

export interface Experiment3StudentResultsDashboard {
  totalRoundsFound: number
  expectedRounds: number
  completedBlocks: number
  sections: Experiment3StudentResultsSection[]
  bestBlockTitle: string | null
  lowestBlockTitle: string | null
}

export function buildExperiment3StudentResultsDashboard(
  rows: Experiment3Round[]
): Experiment3StudentResultsDashboard {
  const normalizedRows = rows
    .map(normalizeExperiment3Row)
    .filter((row) => EXPERIMENT3_TREATMENTS.some((treatment) => treatment.key === row.treatment_key))

  const sections = EXPERIMENT3_TREATMENTS.map((treatment) => {
    const treatmentRows = normalizedRows
      .filter((row) => row.treatment_key === treatment.key)
      .sort((left, right) => left.round_in_treatment - right.round_in_treatment)

    return {
      key: treatment.key,
      title: treatment.title,
      shortTitle: treatment.shortTitle,
      bidderCount: treatment.bidderCount,
      sellerValue: treatment.sellerValue,
      roundsCompleted: treatmentRows.length,
      roundsExpected: EXPERIMENT3_ROUNDS_PER_TREATMENT,
      isAvailable: treatmentRows.length > 0,
      isComplete: treatmentRows.length === EXPERIMENT3_ROUNDS_PER_TREATMENT,
      totalProfit: sum(treatmentRows.map((row) => row.profit)),
      averageProfit: average(treatmentRows.map((row) => row.profit)),
      averageReserve: average(treatmentRows.map((row) => row.reserve_price)),
      saleRate: average(treatmentRows.map((row) => (row.sold ? 1 : 0))),
    }
  })

  const availableSections = sections.filter(
    (section) => section.isAvailable && section.averageProfit != null
  )
  const rankedByProfit = [...availableSections].sort(
    (left, right) => (right.averageProfit ?? 0) - (left.averageProfit ?? 0)
  )

  return {
    totalRoundsFound: normalizedRows.length,
    expectedRounds: EXPERIMENT3_TREATMENTS.length * EXPERIMENT3_ROUNDS_PER_TREATMENT,
    completedBlocks: sections.filter((section) => section.isComplete).length,
    sections,
    bestBlockTitle: rankedByProfit[0]?.shortTitle ?? null,
    lowestBlockTitle: rankedByProfit.at(-1)?.shortTitle ?? null,
  }
}

function normalizeExperiment3Row(row: Experiment3Round): Experiment3Round {
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

function average(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value))
  if (usable.length === 0) return null
  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

function sum(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((accumulator, value) => accumulator + value, 0)
}
