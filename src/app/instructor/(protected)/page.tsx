'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import NewQuarterModal from '@/components/instructor/NewQuarterModal'
import ClassScheduleSettings from '@/components/instructor/ClassScheduleSettings'
import InfoTooltip from '@/components/instructor/InfoTooltip'
import type { Quarter } from '@/app/api/admin/quarters/route'

const ATTENDANCE = {
  href: '/instructor/attendance',
  title: 'Attendance',
  description: 'Student sign-ins with PERM number and code word. Display the QR code in class — students scan it to check in.',
  detail: 'All sessions',
}

const PARTICIPATION = {
  href: '/instructor/participation',
  title: 'Participation',
  description: 'A grid showing every student versus every experiment. See at a glance who has submitted and whether submissions were on time.',
  detail: 'All students × all experiments',
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
    title: 'Penny Jar Experiment',
    description: 'Common-value auction. Students estimate kernel count and bid in groups of 2, 10, or 100 bidders.',
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

type Tab = 'experiments' | 'settings'

export default function InstructorOverview() {
  const [showNewQuarter, setShowNewQuarter] = useState(false)
  const [tab, setTab] = useState<Tab>('experiments')
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const searchParams = useSearchParams()
  const router = useRouter()

  const quarterParam = searchParams.get('quarter')

  useEffect(() => {
    fetch('/api/admin/quarters')
      .then((r) => r.json())
      .then((data) => setQuarters(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const activeQuarter = quarters.find((q) => q.is_active)
  const viewingQuarter = quarterParam
    ? quarters.find((q) => q.id === quarterParam)
    : activeQuarter
  const isArchiveView = viewingQuarter && !viewingQuarter.is_active

  function quarterHref(base: string): string {
    if (!isArchiveView || !viewingQuarter) return base
    const url = new URL(base, 'http://x')
    url.searchParams.set('quarter', viewingQuarter.id)
    return url.pathname + url.search
  }

  function handleQuarterChange(id: string) {
    const selected = quarters.find((q) => q.id === id)
    if (!selected) return
    if (selected.is_active) {
      router.push('/instructor')
    } else {
      router.push(`/instructor?quarter=${id}`)
    }
  }

  function handleQuarterCreated() {
    // Refresh quarters list and clear the quarter param (switch to new active)
    fetch('/api/admin/quarters')
      .then((r) => r.json())
      .then((data) => setQuarters(Array.isArray(data) ? data : []))
      .catch(() => {})
    setShowNewQuarter(false)
    router.push('/instructor')
  }

  return (
    <div>
      {/* Quarter banner (archive mode) */}
      {isArchiveView && (
        <div
          className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <span style={{ color: '#92400e', fontSize: 14 }}>📦</span>
          <p className="text-xs font-medium" style={{ color: '#92400e' }}>
            Viewing archived quarter: <strong>{viewingQuarter?.name}</strong>
          </p>
          <button
            onClick={() => router.push('/instructor')}
            className="ml-auto text-xs px-3 py-1 rounded-lg"
            style={{ background: '#92400e', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Back to current
          </button>
        </div>
      )}

      {/* Tab bar + actions */}
      <div className="flex items-center justify-between mb-8 gap-3">
        <div className="flex gap-1 items-center">
          {(['experiments', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all"
              style={{
                background: tab === t ? 'var(--navy)' : 'var(--surface)',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${tab === t ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Quarter selector */}
          {quarters.length > 0 && (
            <span className="flex items-center gap-1">
              <select
                value={viewingQuarter?.id ?? ''}
                onChange={(e) => handleQuarterChange(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {quarters.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}{q.is_active ? ' (current)' : ''}
                  </option>
                ))}
              </select>
              <InfoTooltip text={"Switch between the current quarter and past archived quarters.\n\nArchived quarters are read-only — you can view data but not add or delete anything."} />
            </span>
          )}

          {/* Export all raw data for the viewed quarter */}
          {viewingQuarter && (
            <span className="flex items-center gap-1">
              <a
                href={`/api/admin/quarter-export${viewingQuarter.is_active ? '' : `?quarter=${viewingQuarter.id}`}`}
                download
                className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'none' }}
              >
                Export all data ↓
              </a>
              <InfoTooltip text={"Downloads a single .xlsx spreadsheet with raw data from every experiment for the selected quarter.\n\nUse this for a full backup or for analysis outside the app."} />
            </span>
          )}

          {/* New Quarter button — only in experiments tab, not in archive mode */}
          {tab === 'experiments' && !isArchiveView && (
            <span className="flex items-center gap-1">
              <button
                onClick={() => setShowNewQuarter(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                New Quarter
              </button>
              <InfoTooltip text={"Archive the current quarter and start a fresh one.\n\nAll existing experiment data moves to the archive and remains viewable from the quarter dropdown. The new quarter starts completely empty."} />
            </span>
          )}
        </div>
      </div>

      {tab === 'settings' && (
        <div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--navy)' }}>Settings</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Configure class schedule and other instructor preferences.
          </p>
          <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--navy)' }}>Class schedule</h3>
            <ClassScheduleSettings />
          </div>
        </div>
      )}

      {tab === 'experiments' && (
        <>

      {/* Workflow intro */}
      <div className="mb-6 p-4 rounded-xl text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <span style={{ color: 'var(--navy)', fontWeight: 600 }}>How this works: </span>
        Students visit the class website on their phones and submit experiment data in real time. Each card below opens a results page for that experiment. Use{' '}
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>Attendance</span> to take roll (display the QR code in class), and{' '}
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>Participation</span> to see at a glance which students completed which experiments.
      </div>

      {/* Attendance + Participation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {[ATTENDANCE, PARTICIPATION].map((card) => (
          <Link
            key={card.href}
            href={quarterHref(card.href)}
            className="exp-card group block rounded-xl p-5 transition-all"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {card === ATTENDANCE ? '✓' : '≡'}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>View records →</span>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--navy)' }}>{card.title}</h3>
            <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>{card.description}</p>
            <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: 'rgba(0,54,96,0.45)' }}>{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPERIMENTS.map((exp) => (
          <Link
            key={exp.num}
            href={quarterHref(exp.href)}
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
      </>
      )}

      {showNewQuarter && (
        <NewQuarterModal
          onClose={() => setShowNewQuarter(false)}
          onCreated={handleQuarterCreated}
        />
      )}
    </div>
  )
}
