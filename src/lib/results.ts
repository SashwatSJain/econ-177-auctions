import { AUCTION_CONFIGS, TOTAL_ROUNDS } from '@/lib/auction-config'
import type { AuctionConfig, Bid } from '@/lib/types'

const PRIVATE_VALUE_MAX = 100

export interface ResultsScatterPoint {
  x: number
  y: number
  round: number
}

export interface ResultsLinePoint {
  x: number
  y: number
}

export interface AuctionVisualization {
  xMax: number
  yMax: number
  threshold: number | null
  classPoints: ResultsScatterPoint[]
  studentPoints: ResultsScatterPoint[]
  nashLine: ResultsLinePoint[]
}

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
  summary: string
  studentAveragePrivateValue: number | null
  studentAverageBid: number | null
  studentAverageBidRatio: number | null
  studentAverageNashBid: number | null
  studentMeanDeviationFromNash: number | null
  studentMeanAbsoluteDeviationFromNash: number | null
  classAverageBid: number | null
  classMedianBidRatio: number | null
  classMedianAbsoluteDeviationFromNash: number | null
  closerThanPercent: number | null
  studentPositiveBidBelowThresholdRate: number | null
  classPositiveBidBelowThresholdRate: number | null
  studentZeroBidAboveThresholdRate: number | null
  classZeroBidAboveThresholdRate: number | null
  visualization: AuctionVisualization | null
}

export interface StudentResultsOverview {
  studentId: string
  totalBidsFound: number
  expectedExperiments: number
  experimentsFound: number
  fullyCompletedExperiments: number
  strongestAuctionTitle: string | null
  weakestAuctionTitle: string | null
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

interface StudentScore {
  studentId: string
  meanAbsoluteDeviation: number
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
  const rankedSections = availableSections
    .filter((section) => section.studentMeanAbsoluteDeviationFromNash != null)
    .sort((left, right) =>
      (left.studentMeanAbsoluteDeviationFromNash ?? Number.POSITIVE_INFINITY) -
      (right.studentMeanAbsoluteDeviationFromNash ?? Number.POSITIVE_INFINITY)
    )

  return {
    overview: {
      studentId,
      totalBidsFound: normalizedStudentBids.length,
      expectedExperiments: AUCTION_CONFIGS.length,
      experimentsFound: availableSections.length,
      fullyCompletedExperiments: availableSections.filter((section) => section.isComplete).length,
      strongestAuctionTitle: rankedSections[0]?.shortTitle ?? null,
      weakestAuctionTitle: rankedSections.at(-1)?.shortTitle ?? null,
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
  const studentDeviations = sectionStudentBids.map((bid) => computeDeviation(config, bid))
  const classDeviations = sectionClassBids.map((bid) => computeDeviation(config, bid))
  const studentScores = buildStudentScores(sectionClassBids, config)
  const peerScores = studentScores.filter((score) => score.studentId !== studentId)
  const percentileBase = peerScores.length > 0 ? peerScores : studentScores
  const currentStudentScore =
    studentScores.find((score) => score.studentId === studentId)?.meanAbsoluteDeviation ?? null

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
    summary: describeAuction(config),
    studentAveragePrivateValue: average(sectionStudentBids.map((bid) => bid.private_value)),
    studentAverageBid: average(sectionStudentBids.map((bid) => bid.amount)),
    studentAverageBidRatio: average(sectionStudentBids.map((bid) => safeRatio(bid.amount, bid.private_value))),
    studentAverageNashBid: average(sectionStudentBids.map((bid) => config.nashFormula(bid.private_value))),
    studentMeanDeviationFromNash: average(studentDeviations.map((entry) => entry.signed)),
    studentMeanAbsoluteDeviationFromNash: average(studentDeviations.map((entry) => entry.absolute)),
    classAverageBid: average(sectionClassBids.map((bid) => bid.amount)),
    classMedianBidRatio: median(sectionClassBids.map((bid) => safeRatio(bid.amount, bid.private_value))),
    classMedianAbsoluteDeviationFromNash: median(classDeviations.map((entry) => entry.absolute)),
    closerThanPercent:
      currentStudentScore == null
        ? null
        : computeCloserThanPercent(currentStudentScore, percentileBase.map((score) => score.meanAbsoluteDeviation)),
    studentPositiveBidBelowThresholdRate: computeThresholdRate(
      sectionStudentBids,
      config.participationThreshold,
      'positive-below'
    ),
    classPositiveBidBelowThresholdRate: computeThresholdRate(
      sectionClassBids,
      config.participationThreshold,
      'positive-below'
    ),
    studentZeroBidAboveThresholdRate: computeThresholdRate(
      sectionStudentBids,
      config.participationThreshold,
      'zero-above'
    ),
    classZeroBidAboveThresholdRate: computeThresholdRate(
      sectionClassBids,
      config.participationThreshold,
      'zero-above'
    ),
    visualization:
      sectionClassBids.length > 0
        ? buildVisualization(config, sectionClassBids, sectionStudentBids)
        : null,
  }
}

function buildVisualization(
  config: AuctionConfig,
  classBids: NormalizedBid[],
  studentBids: NormalizedBid[]
): AuctionVisualization {
  const nashLine = buildNashLine(config)
  const maxObservedBid = Math.max(
    0,
    ...classBids.map((bid) => bid.amount),
    ...nashLine.map((point) => point.y),
    config.reservePrice ?? 0,
    config.participationThreshold ?? 0
  )
  const yMax = roundUp(Math.max(PRIVATE_VALUE_MAX, maxObservedBid * 1.1 || PRIVATE_VALUE_MAX), 10)

  return {
    xMax: PRIVATE_VALUE_MAX,
    yMax,
    threshold: config.participationThreshold,
    classPoints: classBids.map((bid) => ({ x: bid.private_value, y: bid.amount, round: bid.round })),
    studentPoints: studentBids.map((bid) => ({ x: bid.private_value, y: bid.amount, round: bid.round })),
    nashLine,
  }
}

function buildStudentScores(classBids: NormalizedBid[], config: AuctionConfig): StudentScore[] {
  const byStudent = new Map<string, NormalizedBid[]>()

  for (const bid of classBids) {
    const existing = byStudent.get(bid.student_id)
    if (existing) {
      existing.push(bid)
    } else {
      byStudent.set(bid.student_id, [bid])
    }
  }

  return Array.from(byStudent.entries())
    .map(([studentId, bidsForStudent]) => ({
      studentId,
      meanAbsoluteDeviation: average(
        bidsForStudent.map((bid) => Math.abs(bid.amount - config.nashFormula(bid.private_value)))
      ) ?? 0,
    }))
    .sort((left, right) => left.meanAbsoluteDeviation - right.meanAbsoluteDeviation)
}

function buildNashLine(config: AuctionConfig): ResultsLinePoint[] {
  const points: ResultsLinePoint[] = []

  for (let value = 0; value <= PRIVATE_VALUE_MAX; value += 2) {
    points.push({
      x: value,
      y: config.nashFormula(value),
    })
  }

  return points
}

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

function computeDeviation(config: AuctionConfig, bid: NormalizedBid) {
  const nashBid = config.nashFormula(bid.private_value)
  const signed = bid.amount - nashBid

  return {
    signed,
    absolute: Math.abs(signed),
  }
}

function computeCloserThanPercent(studentScore: number, scores: number[]) {
  if (scores.length === 0) return null

  const worseScores = scores.filter((score) => score > studentScore).length
  return (worseScores / scores.length) * 100
}

function computeThresholdRate(
  bids: NormalizedBid[],
  threshold: number | null,
  mode: 'positive-below' | 'zero-above'
) {
  if (threshold == null) return null

  const relevantBids = bids.filter((bid) =>
    mode === 'positive-below' ? bid.private_value <= threshold : bid.private_value > threshold
  )

  if (relevantBids.length === 0) return null

  const matchingBids = relevantBids.filter((bid) =>
    mode === 'positive-below' ? bid.amount > 0 : bid.amount === 0
  )

  return matchingBids.length / relevantBids.length
}

function describeAuction(config: AuctionConfig) {
  if (config.reservePrice != null || config.entryFee != null) {
    return 'Threshold auctions split the problem in two: values at or below the cutoff should usually stay out, while values above it should track the equilibrium response more closely.'
  }

  if (config.key.startsWith('second')) {
    return 'Second-price auctions reward truthful bidding. The closer your bids stay to value, the closer you are to the dominant-strategy benchmark.'
  }

  return 'First-price auctions require bid shading. The goal is not to match value, but to shade toward the Nash bid for the number of competing bidders.'
}

function average(values: Array<number | null>) {
  const usableValues = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (usableValues.length === 0) return null
  return usableValues.reduce((sum, value) => sum + value, 0) / usableValues.length
}

function median(values: Array<number | null>) {
  const sorted = values
    .filter((value): value is number => value != null && Number.isFinite(value))
    .sort((left, right) => left - right)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function safeRatio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null
  }

  return numerator / denominator
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step
}
