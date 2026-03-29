import { notFound } from 'next/navigation'
import { getAuctionConfig, AUCTION_CONFIGS } from '@/lib/auction-config'
import BidFlow from '@/components/BidFlow'

interface Props {
  params: Promise<{ type: string }>
}

export default async function AuctionPage({ params }: Props) {
  const { type } = await params
  const config = getAuctionConfig(type)
  if (!config) notFound()

  // Pass only the key — BidFlow looks up the full config (with functions) client-side
  return <BidFlow auctionKey={type} />
}

export async function generateStaticParams() {
  return AUCTION_CONFIGS.map((a) => ({ type: a.key }))
}
