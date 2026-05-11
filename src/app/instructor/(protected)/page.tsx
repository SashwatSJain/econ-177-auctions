'use client'

import Link from 'next/link'
import { useState } from 'react'
import NewQuarterModal from '@/components/instructor/NewQuarterModal'

const ATTENDANCE = {
  href: '/instructor/attendance',
  title: 'Attendance',
  description: 'Student sign-ins with PERM number, code word, timestamp, and GPS location. Grouped by class day.',
  detail: 'All sessions',
}

const EXPERIMENTS = [
  {
    num: 1,
    href: '/instructor/exp1',
    title: 'Auctions',
    description: 'Sealed-bid auction treatments across first/second price, 2/5 bidders, reserve and entry fee variants.',
    detail: '8 treatments · 10 rounds each',
  },
  {
    num: 2,
    href: '/instructor/exp2',
    title: 'Risk Aversion',
    description: 'CRRA risk-aversion elicitation. Students report indifference probabilities across nine prize levels.',
    detail: '9 questions per student',
  },
  {
    num: 3,
    href: '/instructor/exp3',
    title: 'Seller Auction',
    description: 'Students act as sellers choosing a reserve price. Compare behavior across 2/5 bidders and seller values.',
    detail: '4 treatments · 20 rounds each',
  },
  {
    num: 4,
    href: '/instructor/exp4',
    title: 'Jar of Kernels',
    description: 'Common-value auction. Students estimate kernel count and bid against 1, 10, or 100 competitors.',
    detail: '3 bid scenarios per student',
  },
  {
    num: 5,
    href: '/instructor/exp5',
    title: 'Oil Well',
    description: 'Paired common-value auction. Each student observes half the well value and bids against one opponent.',
    detail: 'Integer & continuous variants',
  },
  {
    num: 6,
    href: '/instructor/exp6',
    title: 'All-Pay Auction',
    description: 'Every bidder pays their bid regardless of outcome. Group sizes of 2, 5, and 10.',
    detail: '3 group sizes · $100 prize',
  },
]

export default function InstructorOverview() {
  const [showNewQuarter, setShowNewQuarter] = useState(false)

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Experiments</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Select an experiment to view results, charts, and export data.
          </p>
        </div>
        <button
          onClick={() => setShowNewQuarter(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
          style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', cursor: 'pointer' }}
        >
          New Quarter
        </button>
      </div>

      {/* Attendance card */}
      <div className="mb-4">
        <Link
          href={ATTENDANCE.href}
          className="exp-card group block rounded-xl p-5 transition-all"
          style={{ textDecoration: 'none' }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--gold)', color: 'var(--navy)' }}
            >
              ✓
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>View records →</span>
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--navy)' }}>{ATTENDANCE.title}</h3>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>{ATTENDANCE.description}</p>
          <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: 'rgba(0,54,96,0.45)' }}>{ATTENDANCE.detail}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPERIMENTS.map((exp) => (
          <Link
            key={exp.num}
            href={exp.href}
            className="exp-card group block rounded-xl p-5 transition-all"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                {exp.num}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                View results →
              </span>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--navy)' }}>
              {exp.title}
            </h3>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
              {exp.description}
            </p>
            <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: 'rgba(0,54,96,0.45)' }}>
              {exp.detail}
            </p>
          </Link>
        ))}
      </div>

      {showNewQuarter && <NewQuarterModal onClose={() => setShowNewQuarter(false)} />}
    </div>
  )
}
