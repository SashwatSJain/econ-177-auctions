import Link from 'next/link'
import ParticipationTable from '@/components/instructor/ParticipationTable'

export default function ParticipationPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          ← Back to overview
        </Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Participation by Student</h2>

      </div>
      <ParticipationTable />
    </div>
  )
}
