import Exp4Results from '@/components/instructor/Exp4Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function Exp4Page() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 4: Penny Jar Experiment</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Common-value auction — students estimate kernel count and bid in groups of 2, 10, or 100 bidders.
          Each student submits one estimate and three bids. The scatter chart shows how bid shading changes with competition.
        </p>
      </div>
      <ClassTimeBanner exp={4} />
      <Exp4Results />
    </div>
  )
}
