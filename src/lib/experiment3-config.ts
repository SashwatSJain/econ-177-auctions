import type { Experiment3TreatmentConfig } from './types'

export const EXPERIMENT3_ROUNDS_PER_TREATMENT = 20

export const EXPERIMENT3_TREATMENTS: Experiment3TreatmentConfig[] = [
  {
    key: 'exp3-1',
    title: 'Experiment 3.1 — 2 Bidders, Seller Value 0',
    shortTitle: 'Exp 3.1 · 2 Bidders · Seller Value 0',
    bidderCount: 2,
    sellerValue: 0,
    blockIndex: 1,
    rounds: EXPERIMENT3_ROUNDS_PER_TREATMENT,
  },
  {
    key: 'exp3-2',
    title: 'Experiment 3.2 — 5 Bidders, Seller Value 0',
    shortTitle: 'Exp 3.2 · 5 Bidders · Seller Value 0',
    bidderCount: 5,
    sellerValue: 0,
    blockIndex: 2,
    rounds: EXPERIMENT3_ROUNDS_PER_TREATMENT,
  },
  {
    key: 'exp3-3',
    title: 'Experiment 3.3 — 2 Bidders, Seller Value 30',
    shortTitle: 'Exp 3.3 · 2 Bidders · Seller Value 30',
    bidderCount: 2,
    sellerValue: 30,
    blockIndex: 3,
    rounds: EXPERIMENT3_ROUNDS_PER_TREATMENT,
  },
  {
    key: 'exp3-4',
    title: 'Experiment 3.4 — 5 Bidders, Seller Value 30',
    shortTitle: 'Exp 3.4 · 5 Bidders · Seller Value 30',
    bidderCount: 5,
    sellerValue: 30,
    blockIndex: 4,
    rounds: EXPERIMENT3_ROUNDS_PER_TREATMENT,
  },
]

export const EXPERIMENT3_TOTAL_ROUNDS = EXPERIMENT3_TREATMENTS.reduce(
  (sum, treatment) => sum + treatment.rounds,
  0
)

export function getExperiment3Treatment(key: string) {
  return EXPERIMENT3_TREATMENTS.find((treatment) => treatment.key === key)
}

export function getExperiment3TreatmentByIndex(index: number) {
  return EXPERIMENT3_TREATMENTS[index]
}
