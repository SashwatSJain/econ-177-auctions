import { AUCTION_CONFIGS, TOTAL_ROUNDS } from '@/lib/auction-config'
import type { AuctionConfig, Bid } from '@/lib/types'

export interface AuctionResultsSection {
  key: string
  title: string
  shortTitle: string
  nashDescription: string
  bidders: number
  entryFee: number | null
  reservePrice: number | null
  participationThreshold: number | null
  roundsCompleted: number
  roundsExpected: number
  totalClassBids: number
  isAvailable: boolean
  isComplete: boolean
  studentAverageProfit: number | null
  equilibriumAverageProfit: number | null
  classAverageProfit: number | null
}

export interface StudentResultsOverview {
  studentId: string
  totalBidsFound: number
  expectedExperiments: number
  experimentsFound: number
  fullyCompletedExperiments: number
  highestProfitAuctionTitle: string | null
  lowestProfitAuctionTitle: string | null
}

export interface StudentResultsDashboard {
  overview: StudentResultsOverview
  sections: AuctionResultsSection[]
}

interface NormalizedBid {
  id: string
  student_id: string
  auction_type: string
  round: number
  private_value: number
  amount: number
  created_at: string
}

export function buildStudentResultsDashboard(
  studentId: string,
  studentBids: Bid[],
  classBids: Bid[]
): StudentResultsDashboard {
  const normalizedStudentBids = studentBids
    .map(normalizeBid)
    .filter((bid) => AUCTION_CONFIGS.some((config) => config.key === bid.auction_type))

  const normalizedClassBids = classBids
    .map(normalizeBid)
    .filter((bid) => AUCTION_CONFIGS.some((config) => config.key === bid.auction_type))

  const sections = AUCTION_CONFIGS.map((config) =>
    buildAuctionSection(config, normalizedStudentBids, normalizedClassBids, studentId)
  )

  const availableSections = sections.filter((section) => section.isAvailable)
  const rankedByProfit = availableSections
    .filter((section) => section.studentAverageProfit != null)
    .sort((left, right) => (right.studentAverageProfit ?? 0) - (left.studentAverageProfit ?? 0))

  return {
    overview: {
      studentId,
      totalBidsFound: normalizedStudentBids.length,
      expectedExperiments: AUCTION_CONFIGS.length,
      experimentsFound: availableSections.length,
      fullyCompletedExperiments: availableSections.filter((section) => section.isComplete).length,
      highestProfitAuctionTitle: rankedByProfit[0]?.shortTitle ?? null,
      lowestProfitAuctionTitle: rankedByProfit.at(-1)?.shortTitle ?? null,
    },
    sections,
  }
}

function buildAuctionSection(
  config: AuctionConfig,
  studentBids: NormalizedBid[],
  allBids: NormalizedBid[],
  studentId: string
): AuctionResultsSection {
  const sectionStudentBids = studentBids
    .filter((bid) => bid.auction_type === config.key)
    .sort((left, right) => left.round - right.round)
  const sectionClassBids = allBids.filter((bid) => bid.auction_type === config.key)
  const profitStats = computeProfitStats(config, sectionStudentBids, sectionClassBids, studentId)

  return {
    key: config.key,
    title: config.title,
    shortTitle: config.shortTitle,
    nashDescription: config.nashDescription,
    bidders: config.bidders,
    entryFee: config.entryFee,
    reservePrice: config.reservePrice,
    participationThreshold: config.participationThreshold,
    roundsCompleted: sectionStudentBids.length,
    roundsExpected: TOTAL_ROUNDS,
    totalClassBids: sectionClassBids.length,
    isAvailable: sectionStudentBids.length > 0,
    isComplete: sectionStudentBids.length === TOTAL_ROUNDS,
    ...profitStats,
  }
}

// ---------------------------------------------------------------------------
// Profit computation
// ---------------------------------------------------------------------------

interface ProfitStats {
  studentAverageProfit: number | null
  equilibriumAverageProfit: number | null
  classAverageProfit: number | null
}

function computeProfitStats(
  config: AuctionConfig,
  studentBids: NormalizedBid[],
  classBids: NormalizedBid[],
  studentId: string
): ProfitStats {
  const isFirstPrice = config.key.startsWith('first')

  // Group all class bids by round for opponent lookup
  const classByRound = new Map<number, NormalizedBid[]>()
  for (const bid of classBids) {
    const existing = classByRound.get(bid.round)
    if (existing) existing.push(bid)
    else classByRound.set(bid.round, [bid])
  }

  // Student's own profit and equilibrium counterfactual, per round
  const studentProfits: number[] = []
  const equilProfits: number[] = []

  for (const bid of studentBids) {
    const roundBids = classByRound.get(bid.round) ?? []
    const opponentAmounts = roundBids
      .filter((b) => b.student_id !== studentId)
      .map((b) => b.amount)

    if (opponentAmounts.length < config.bidders - 1) continue

    studentProfits.push(
      expectedProfit(config, bid.amount, bid.private_value, opponentAmounts, isFirstPrice)
    )

    const nashBid = config.nashFormula(bid.private_value)
    equilProfits.push(
      expectedProfit(config, nashBid, bid.private_value, opponentAmounts, isFirstPrice)
    )
  }

  // Class average profit: every student in every round vs their classmates
  const classProfits: number[] = []
  for (const roundBids of classByRound.values()) {
    for (const bid of roundBids) {
      const opponentAmounts = roundBids
        .filter((b) => b.student_id !== bid.student_id)
        .map((b) => b.amount)
      if (opponentAmounts.length < config.bidders - 1) continue
      classProfits.push(
        expectedProfit(config, bid.amount, bid.private_value, opponentAmounts, isFirstPrice)
      )
    }
  }

  return {
    studentAverageProfit: average(studentProfits),
    equilibriumAverageProfit: average(equilProfits),
    classAverageProfit: average(classProfits),
  }
}

/**
 * Expected profit for a single bid, computed against an empirical pool of
 * opponents drawn from actual class data.
 *
 * For n=2: expected value averages over each individual opponent (with
 * replacement, so each of the k opponents is equally likely).
 *
 * For n=5: expected value averages over all C(k,4) groups of 4 opponents.
 * Second-price payment uses the combinatorial identity:
 *   beaten[j] is the maximum of exactly C(j,3) four-tuples from beaten[0..j].
 */
function expectedProfit(
  config: AuctionConfig,
  b: number,
  v: number,
  opponents: number[],
  isFirstPrice: boolean
): number {
  if (b <= 0) return 0

  const k = opponents.length
  const n = config.bidders
  const entryFee = config.entryFee ?? 0
  const reserve = config.reservePrice ?? 0

  if (k < n - 1) return -entryFee

  // Student can only win if their bid meets the reserve (if any)
  if (reserve > 0 && b < reserve) return -entryFee

  const beaten = opponents.filter((ob) => ob < b)
  const w = beaten.length

  if (n === 2) {
    const pWin = w / k
    if (isFirstPrice) {
      return (v - b) * pWin - entryFee
    } else {
      // Payment when winning = max(opponent_bid, reserve)
      const totalGrossProfit = beaten.reduce(
        (sum, bj) => sum + (v - Math.max(bj, reserve)),
        0
      )
      return totalGrossProfit / k - entryFee
    }
  } else {
    // n = 5: need 4 opponents, all below b
    const cWin = comb(w, 4)
    const cTotal = comb(k, 4)
    if (cTotal === 0) return -entryFee

    if (isFirstPrice) {
      return (v - b) * (cWin / cTotal) - entryFee
    } else {
      // Expected max of winning 4-tuple, using sorted beaten array
      const sortedBeaten = [...beaten].sort((a, c) => a - c)
      let sumMax = 0
      for (let j = 3; j < sortedBeaten.length; j++) {
        sumMax += sortedBeaten[j] * comb(j, 3)
      }
      return (v * cWin - sumMax) / cTotal - entryFee
    }
  }
}

/** Binomial coefficient C(n, k), iterative. */
function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const kk = Math.min(k, n - k)
  let result = 1
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return Math.round(result)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeBid(bid: Bid): NormalizedBid {
  return {
    id: String(bid.id),
    student_id: String(bid.student_id).toLowerCase(),
    auction_type: String(bid.auction_type),
    round: Number(bid.round),
    private_value: Number(bid.private_value),
    amount: Number(bid.amount),
    created_at: String(bid.created_at),
  }
}


function average(values: number[]) {
  const usable = values.filter((v) => Number.isFinite(v))
  if (usable.length === 0) return null
  return usable.reduce((sum, v) => sum + v, 0) / usable.length
}
