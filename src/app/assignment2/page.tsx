import type { Metadata } from 'next'
import RiskAversionFlow from '@/components/RiskAversionFlow'

export const metadata: Metadata = {
  title: 'Assignment 2: Risk Aversion — UCSB Econ 177',
  description: 'Enter indifference probabilities to elicit your risk preferences.',
}

export default function Assignment2Page() {
  return <RiskAversionFlow />
}
