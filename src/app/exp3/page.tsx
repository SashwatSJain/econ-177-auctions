import type { Metadata } from 'next'
import Experiment3Flow from '@/components/Experiment3Flow'

export const metadata: Metadata = {
  title: 'Experiment 3: Seller Reserve Auction — UCSB Econ 177',
  description: 'Choose reserve prices as a seller across four auction blocks.',
}

export default function Exp3Page() {
  return <Experiment3Flow />
}
