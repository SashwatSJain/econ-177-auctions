import Link from 'next/link'
import Exp5Results from '@/components/instructor/Exp5Results'
import ClassTimeBanner from '@/components/instructor/ClassTimeBanner'

export default function Exp5Page() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>← Back to overview</Link>
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
