export interface Bid {
  id: string
  student_id: string
  auction_type: string
  round: number
  private_value: number
  amount: number
  created_at: string
}

export interface Experiment3Round {
  id: string
  student_id: string
  treatment_key: string
  block_index: number
  round_in_treatment: number
  global_round: number
  bidder_count: number
  seller_value: number
  reserve_price: number
  simulated_bids: number[]
  highest_bid: number
  second_highest_bid: number
  sold: boolean
  sale_price: number | null
  profit: number
  created_at: string
}

export interface Experiment4Response {
  id: string
  student_id: string
  estimate: number
  bid_2: number
  bid_10: number
  bid_100: number
  created_at: string
}

export interface RiskAversionResponse {
  id: string
  student_id: string
  p_10: number
  p_20: number
  p_30: number
  p_40: number
  p_50: number
  p_60: number
  p_70: number
  p_80: number
  p_90: number
  created_at: string
}

export interface RiskAversionClassResults {
  submission_count: number
  means: { c_value: number; mean_p: number }[]
  alpha_estimate: number | null
}

export interface AuctionConfig {
  key: string
  title: string
  shortTitle: string
  bidders: number
  entryFee: number | null
  reservePrice: number | null
  nashDescription: string
  nashSlope: number | null // null = piecewise
  participationThreshold: number | null // private value below which bid = 0
  nashFormula: (v: number) => number
}

export interface Experiment3TreatmentConfig {
  key: string
  title: string
  shortTitle: string
  bidderCount: number
  sellerValue: number
  blockIndex: number
  rounds: number
}

export interface Experiment3RoundContext {
  treatment: Experiment3TreatmentConfig
  roundInTreatment: number
  globalRound: number
  sellerValue: number
}

export interface Experiment3BlockSummary {
  treatmentKey: string
  title: string
  shortTitle: string
  bidderCount: number
  sellerValue: number
  roundsCompleted: number
  roundsExpected: number
  totalProfit: number
  averageProfit: number | null
  saleRate: number | null
  averageReserve: number | null
  rows: Experiment3Round[]
}

export interface Experiment3OverallSummary {
  totalRoundsCompleted: number
  totalRoundsExpected: number
  totalProfit: number
  averageProfit: number | null
  saleRate: number | null
  blocksCompleted: number
  blockSummaries: Experiment3BlockSummary[]
}
