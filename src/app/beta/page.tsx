import type { Metadata } from 'next'
import BetaCVAuction from '@/components/BetaCVAuction'

export const metadata: Metadata = {
  title: 'Beta — Oil Well Auction · UCSB Econ 177',
  // Prevent indexing of beta experiments
  robots: { index: false, follow: false },
}

export default function BetaPage() {
  return <BetaCVAuction />
}
