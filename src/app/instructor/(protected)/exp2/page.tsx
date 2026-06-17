import Exp2Results from '@/components/instructor/Exp2Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function Exp2Page() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 2: Risk Aversion</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          CRRA risk-aversion elicitation — 9 indifference probabilities per student.
          Responses appear automatically as students submit. The Class α stat updates live.
        </p>
      </div>
      <ClassTimeBanner exp={2} />
      <Exp2Results />
    </div>
  )
}
