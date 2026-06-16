import Exp5Results from '@/components/instructor/Exp5Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function Exp5Page() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 5: Oil Well</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Common-value auction — paired bidders each observe half the well value
        </p>
      </div>
      <ClassTimeBanner exp={5} />
      <Exp5Results />
    </div>
  )
}
