'use client'

import Link from 'next/link'

import type { Experiment3StudentResultsDashboard, Experiment3StudentResultsSection } from '@/lib/experiment3-results'
import type { AuctionResultsSection, StudentResultsDashboard } from '@/lib/results'

interface Props {
  dashboard: StudentResultsDashboard | null
  experiment3Dashboard: Experiment3StudentResultsDashboard | null
}

export default function ResultsDashboard({ dashboard, experiment3Dashboard }: Props) {
  const overview = dashboard?.overview ?? null
  const sections = dashboard?.sections ?? []

  return (
    <div className="space-y-8">
      {overview ? (
        <section
          className="rounded-lg border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)' }}>
              Retro Feedback
            </p>
            <h2 className="serif text-2xl leading-snug" style={{ color: 'var(--text)' }}>
              How much profit did your bids earn?
            </h2>
            <div className="mt-5 grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
              <OverviewStat label="Perm" value={overview.studentId} />
              <OverviewStat
                label="Experiments Found"
                value={`${overview.experimentsFound} / ${overview.expectedExperiments}`}
              />
              <OverviewStat label="Fully Completed" value={String(overview.fullyCompletedExperiments)} />
              <OverviewStat label="Total Bids" value={String(overview.totalBidsFound)} />
              <OverviewStat
                label="Best Profit In"
                value={overview.highestProfitAuctionTitle ?? 'Not enough data'}
              />
            </div>
          </div>
        </section>
      ) : null}

      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <AuctionSection key={section.key} section={section} />
          ))}
        </div>
      ) : null}

      {experiment3Dashboard ? (
        <section
          className="rounded-lg border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--navy)' }}>
              Experiment 3
            </p>
            <h2 className="serif text-2xl leading-snug" style={{ color: 'var(--text)' }}>
              How much profit did your reserve prices earn?
            </h2>
            <div className="mt-5 grid gap-2 grid-cols-2 sm:grid-cols-4">
              <OverviewStat label="Total Rounds" value={String(experiment3Dashboard.totalRoundsFound)} />
              <OverviewStat
                label="Blocks Complete"
                value={String(experiment3Dashboard.completedBlocks)}
              />
              <OverviewStat
                label="Best Block"
                value={experiment3Dashboard.bestBlockTitle ?? 'Not enough data'}
              />
              <OverviewStat
                label="Lowest Block"
                value={experiment3Dashboard.lowestBlockTitle ?? 'Not enough data'}
              />
            </div>
          </div>
        </section>
      ) : null}

      {experiment3Dashboard ? (
        <div className="space-y-6">
          {experiment3Dashboard.sections.map((section) => (
            <Experiment3Section key={section.key} section={section} />
          ))}
        </div>
      ) : null}

      <div
        className="border-t pt-5 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link href="/" className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          ← Back to Experiments
        </Link>
        <Link href="/export" className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          Download My Raw Data →
        </Link>
      </div>
    </div>
  )
}

function AuctionSection({ section }: { section: AuctionResultsSection }) {
  return (
    <section
      className="rounded-lg border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]"
              style={{ background: 'rgba(0,54,96,0.08)', color: 'var(--navy)' }}
            >
              {section.shortTitle}
            </span>
            <span
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]"
              style={{
                background: section.isComplete ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.16)',
                color: section.isComplete ? '#047857' : '#b45309',
              }}
            >
              {section.isAvailable ? (section.isComplete ? 'Complete' : 'Partial') : 'Missing'}
            </span>
          </div>
          <h3 className="serif mt-4 text-2xl break-words" style={{ color: 'var(--text)' }}>
            {section.title}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MetaPill label="Equilibrium" value={section.nashDescription} />
            <MetaPill label="Bidders" value={String(section.bidders)} />
            {section.reservePrice != null ? <MetaPill label="Reserve" value={formatMoney(section.reservePrice)} /> : null}
            {section.entryFee != null ? <MetaPill label="Entry Fee" value={formatMoney(section.entryFee)} /> : null}
            {section.participationThreshold != null ? (
              <MetaPill label="Threshold" value={formatMoney(section.participationThreshold)} />
            ) : null}
          </div>
        </div>

        <div
          className="rounded-lg border px-4 py-4 text-sm lg:min-w-[16rem]"
          style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
        >
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Completion Snapshot
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniStat label="Your Rounds" value={`${section.roundsCompleted} / ${section.roundsExpected}`} />
            <MiniStat label="Class Bids" value={String(section.totalClassBids)} />
          </div>
        </div>
      </div>

      {!section.isAvailable ? (
        <div
          className="mt-6 rounded-lg border border-dashed px-5 py-6 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface2)' }}
        >
          No data found.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {/* Profit comparison cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              eyebrow="Your Avg Profit"
              value={formatMaybeMoney(section.studentAverageProfit)}
            />
            <MetricCard
              eyebrow="Equilibrium Bidder"
              value={formatMaybeMoney(section.equilibriumAverageProfit)}
            />
            <MetricCard
              eyebrow="Class Avg Profit"
              value={formatMaybeMoney(section.classAverageProfit)}
            />
          </div>

        </div>
      )}
    </section>
  )
}

function Experiment3Section({ section }: { section: Experiment3StudentResultsSection }) {
  return (
    <section
      className="rounded-lg border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]"
              style={{ background: 'rgba(0,54,96,0.08)', color: 'var(--navy)' }}
            >
              {section.shortTitle}
            </span>
            <span
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]"
              style={{
                background: section.isComplete ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.16)',
                color: section.isComplete ? '#047857' : '#b45309',
              }}
            >
              {section.isAvailable ? (section.isComplete ? 'Complete' : 'Partial') : 'Missing'}
            </span>
          </div>
          <h3 className="serif mt-4 text-2xl break-words" style={{ color: 'var(--text)' }}>
            {section.title}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MetaPill label="Bidders" value={String(section.bidderCount)} />
            <MetaPill label="Seller Value" value={formatMoney(section.sellerValue)} />
          </div>
        </div>

        <div
          className="rounded-lg border px-4 py-4 text-sm lg:min-w-[16rem]"
          style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
        >
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Completion Snapshot
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniStat label="Your Rounds" value={`${section.roundsCompleted} / ${section.roundsExpected}`} />
            <MiniStat label="Completion" value={section.isComplete ? 'Ready' : 'In Progress'} />
          </div>
        </div>
      </div>

      {!section.isAvailable ? (
        <div
          className="mt-6 rounded-lg border border-dashed px-5 py-6 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface2)' }}
        >
          No data found.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <MetricCard eyebrow="Total Profit" value={formatMaybeMoney(section.totalProfit)} />
          <MetricCard eyebrow="Avg Profit" value={formatMaybeMoney(section.averageProfit)} />
          <MetricCard eyebrow="Avg Reserve" value={formatMaybeMoney(section.averageReserve)} />
          <MetricCard eyebrow="Sale Rate" value={formatPercent(section.saleRate)} />
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border px-3 py-3"
      style={{ borderColor: 'var(--border)', background: '#fff' }}
    >
      <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium leading-5" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  )
}

function MetricCard({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div
      className="rounded-lg border p-4 min-w-0"
      style={{ borderColor: 'var(--border)', background: '#fff' }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
        {eyebrow}
      </p>
      <p className="serif mt-3 text-2xl break-words min-w-0" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}


function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="rounded-full px-3 py-1"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      <span style={{ color: 'var(--text)' }}>{label}:</span> {value}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatMaybeMoney(value: number | null) {
  return value == null ? 'n/a' : formatMoney(value)
}

function formatPercent(value: number | null) {
  return value == null ? 'n/a' : `${(value * 100).toFixed(1)}%`
}
