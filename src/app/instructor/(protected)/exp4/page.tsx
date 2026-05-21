import Link from 'next/link'
import Exp4Results from '@/components/instructor/Exp4Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'

export default function Exp4Page() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>← Back to overview</Link>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--navy)' }}>Experiment 4: Penny Jar Experiment</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Common-value auction — students estimate kernel count and bid against 1, 10, or 100 competitors
        </p>
      </div>
      <ClassTimeBanner exp={4} />
      <Exp4Results />
    </div>
  )
}
