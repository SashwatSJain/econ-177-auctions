import AttendanceResults from '@/components/instructor/AttendanceResults'
import BackToOverview from '@/components/instructor/BackToOverview'
import ArchiveBanner from '@/components/instructor/ArchiveBanner'

export default function AttendancePage() {
  return (
    <div>
      <ArchiveBanner />
      <div className="mb-6">
        <BackToOverview />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Attendance</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Submissions grouped by class day — PERM, code word, timestamp, and GPS coordinates.
        </p>
      </div>
      <AttendanceResults />
    </div>
  )
}
