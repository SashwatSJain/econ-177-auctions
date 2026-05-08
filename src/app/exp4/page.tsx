import type { Metadata } from 'next'
import Experiment4Flow from '@/components/Experiment4Flow'

export const metadata: Metadata = {
  title: 'Experiment 4: Jar of Kernels — UCSB Econ 177',
  description: 'Estimate the jar value and submit bids for first-price common-value auctions.',
}

export default function Exp4Page() {
  return <Experiment4Flow />
}
