import ParticipationTable from '@/components/instructor/ParticipationTable'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function ParticipationPage() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Participation by Student</h2>
      </div>
      <ParticipationTable />
    </div>
  )
}
