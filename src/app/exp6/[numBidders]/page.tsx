import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import AllPayAuction from '@/components/AllPayAuction'

interface Props {
  params: Promise<{ numBidders: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numBidders } = await params
  return {
    title: `Experiment 6: All-Pay Auction ($100 Bill, ${numBidders} Bidders) · UCSB Econ 177`,
  }
}

export default async function Exp6Page({ params }: Props) {
  const { numBidders } = await params
  const n = parseInt(numBidders, 10)
  if (![2, 5, 10].includes(n)) notFound()
  return <AllPayAuction numBidders={n as 2 | 5 | 10} />
}

export function generateStaticParams() {
  return [{ numBidders: '2' }, { numBidders: '5' }, { numBidders: '10' }]
}
