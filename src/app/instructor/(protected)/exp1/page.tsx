import Exp1Results from '@/components/instructor/Exp1Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function Exp1Page() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 1: Auctions</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Sealed-bid auction treatments — first/second price × 2/5 bidders × variants.
          Select a treatment to view its bids. The scatter chart overlays the Nash equilibrium prediction in real time.
        </p>
      </div>
      <ClassTimeBanner exp={1} />
      <Exp1Results />
    </div>
  )
}
