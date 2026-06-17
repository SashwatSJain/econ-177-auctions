import Exp3Results from '@/components/instructor/Exp3Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function Exp3Page() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 3: Seller Auction</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Seller-role reserve-price auction — 4 treatments × 20 rounds, 2 or 5 bidders.
          Select a treatment to view per-round charts. Use "Compare" to overlay the paired treatment side by side.
        </p>
      </div>
      <ClassTimeBanner exp={3} />
      <Exp3Results />
    </div>
  )
}
