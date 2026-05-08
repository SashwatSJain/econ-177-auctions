import { notFound } from 'next/navigation'
import { getAuctionConfig, AUCTION_CONFIGS } from '@/lib/auction-config'
import BidFlow from '@/components/BidFlow'

interface Props {
  params: Promise<{ type: string }>
}

export default async function Exp1Page({ params }: Props) {
  const { type } = await params
  const config = getAuctionConfig(type)
  if (!config) notFound()
  return <BidFlow auctionKey={type} />
}

export async function generateStaticParams() {
  return AUCTION_CONFIGS.map((a) => ({ type: a.key }))
}
