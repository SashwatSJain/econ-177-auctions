import Link from 'next/link'
import Exp6Results from '@/components/instructor/Exp6Results'

export default function Exp6Page() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>← Back to overview</Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 6: All-Pay Auction</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          All-pay auction of $100 — every bidder pays their bid, highest bid wins
        </p>
      </div>
      <Exp6Results />
    </div>
  )
}
