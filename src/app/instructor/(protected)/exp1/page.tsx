import Link from 'next/link'
import Exp1Results from '@/components/instructor/Exp1Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'

export default function Exp1Page() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>← Back to overview</Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 1: Auctions</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Sealed-bid auction treatments — first/second price × 2/5 bidders × variants
        </p>
      </div>
      <ClassTimeBanner exp={1} />
      <Exp1Results />
    </div>
  )
}
