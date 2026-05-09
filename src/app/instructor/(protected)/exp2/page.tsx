import Link from 'next/link'
import Exp2Results from '@/components/instructor/Exp2Results'

export default function Exp2Page() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>← Back to overview</Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 2: Risk Aversion</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          CRRA risk-aversion elicitation — 9 indifference probabilities per student
        </p>
      </div>
      <Exp2Results />
    </div>
  )
}
