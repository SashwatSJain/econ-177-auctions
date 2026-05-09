import Link from 'next/link'
import AttendanceResults from '@/components/instructor/AttendanceResults'

export default function AttendancePage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          ← Back to overview
        </Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Attendance</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Submissions grouped by class day — PERM, code word, timestamp, and GPS coordinates.
        </p>
      </div>
      <AttendanceResults />
    </div>
  )
}
