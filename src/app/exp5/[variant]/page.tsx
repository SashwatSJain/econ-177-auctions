import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import BetaCVAuction, { type CVVariant } from '@/components/BetaCVAuction'

interface Props {
  params: Promise<{ variant: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant } = await params
  const label = variant === 'continuous' ? 'Continuous' : 'Integer'
  return {
    title: `Experiment 5: Oil Well Auction (${label}) · UCSB Econ 177`,
  }
}

export default async function Exp5Page({ params }: Props) {
  const { variant } = await params
  if (variant !== 'integer' && variant !== 'continuous') notFound()
  return <BetaCVAuction variant={variant as CVVariant} />
}

export function generateStaticParams() {
  return [{ variant: 'integer' }, { variant: 'continuous' }]
}
