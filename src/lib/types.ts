export interface Bid {
  id: string
  student_id: string
  auction_type: string
  round: number
  private_value: number
  amount: number
  created_at: string
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
