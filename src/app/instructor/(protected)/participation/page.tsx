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
        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>
          Each row is a student; each column is an experiment. Click a column header to sort.
        </p>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>✓</span>
            Submitted on time (within class window)
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: '#ea580c', fontWeight: 700 }}>✓</span>
            Submitted late (outside class window)
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: 'var(--border)' }}>—</span>
            No submission
          </span>
        </div>
      </div>
      <ParticipationTable />
    </div>
  )
}
