import Exp6Results from '@/components/instructor/Exp6Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function Exp6Page() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 6: All-Pay Auction</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          All-pay auction of $100 — every bidder pays their bid, highest bid wins
        </p>
      </div>
      <ClassTimeBanner exp={6} />
      <Exp6Results />
    </div>
  )
}
