import Link from 'next/link'
import Exp3Results from '@/components/instructor/Exp3Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'

export default function Exp3Page() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>← Back to overview</Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 3: Seller Auction</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Seller-role reserve-price auction — 4 treatments × 20 rounds, 2 or 5 bidders
        </p>
      </div>
      <ClassTimeBanner exp={3} />
      <Exp3Results />
    </div>
  )
}
