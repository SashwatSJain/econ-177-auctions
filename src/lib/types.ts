export interface Bid {
  id: string
  student_id: string
  auction_type: string
  round: number
  private_value: number
  amount: number
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
