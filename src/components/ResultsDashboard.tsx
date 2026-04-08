'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import type { AuctionResultsSection, StudentResultsDashboard } from '@/lib/results'

interface Props {
  dashboard: StudentResultsDashboard
}

export default function ResultsDashboard({ dashboard }: Props) {
  const { overview, sections } = dashboard

  return (
    <div className="space-y-8">
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
          <p className="mt-2 text-sm leading-6 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Each auction shows your average profit, computed by matching your bids against all of your classmates&rsquo; actual bids across every round. The equilibrium column shows what you would have earned by bidding the theoretical benchmark strategy instead.
          </p>

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

      <div className="space-y-6">
        {sections.map((section) => (
          <AuctionSection key={section.key} section={section} />
        ))}
      </div>

      <MethodologyNote />

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
      className="rounded-[26px] border p-5 shadow-[0_18px_50px_rgba(17,24,39,0.05)] sm:p-6"
      style={{ background: '#fff', borderColor: 'rgba(17,24,39,0.08)' }}
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
          <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
            {section.summary}
          </p>

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
          className="rounded-3xl border px-4 py-4 text-sm lg:min-w-[16rem]"
          style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, #fbfcfe 0%, #f4f7fb 100%)' }}
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
          className="mt-6 rounded-3xl border border-dashed px-5 py-6 text-sm"
          style={{ borderColor: 'rgba(17,24,39,0.12)', color: 'var(--text-muted)', background: 'var(--surface)' }}
        >
          No data was found for this auction form under the perm you entered. The rest of the dashboard still uses any experiments that were found.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {/* Profit comparison cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              eyebrow="Your Avg Profit"
              value={formatMaybeMoney(section.studentAverageProfit)}
              detail="Average per round across all pairings"
            />
            <MetricCard
              eyebrow="Equilibrium Bidder"
              value={formatMaybeMoney(section.equilibriumAverageProfit)}
              detail="What you'd have earned bidding the benchmark strategy"
            />
            <MetricCard
              eyebrow="Class Avg Profit"
              value={formatMaybeMoney(section.classAverageProfit)}
              detail="Average across all students and rounds"
            />
          </div>

          {/* Profit gap insight */}
          <ProfitInsightPanel section={section} />

          {/* Threshold discipline (only for auctions with a participation cutoff) */}
          {section.participationThreshold != null ? (
            <InsightPanel
              title="Threshold Discipline"
              lines={[
                `Your positive bids at or below threshold: ${formatMaybePercent(section.studentPositiveBidBelowThresholdRate)}`,
                `Class positive bids at or below threshold: ${formatMaybePercent(section.classPositiveBidBelowThresholdRate)}`,
                `Your zero bids above threshold: ${formatMaybePercent(section.studentZeroBidAboveThresholdRate)}`,
                `Class zero bids above threshold: ${formatMaybePercent(section.classZeroBidAboveThresholdRate)}`,
              ]}
            />
          ) : null}
        </div>
      )}
    </section>
  )
}

function ProfitInsightPanel({ section }: { section: AuctionResultsSection }) {
  const { studentAverageProfit, equilibriumAverageProfit, classAverageProfit } = section

  const lines: string[] = []

  if (studentAverageProfit != null && equilibriumAverageProfit != null) {
    const diff = studentAverageProfit - equilibriumAverageProfit
    const absDiff = formatMoney(Math.abs(diff))
    if (Math.abs(diff) < 0.01) {
      lines.push('Your profit was essentially identical to the equilibrium benchmark.')
    } else if (diff > 0) {
      lines.push(`You outearned the equilibrium strategy by ${absDiff} on average — your bidding worked better than theory against this class.`)
    } else {
      lines.push(`The equilibrium strategy would have earned ${absDiff} more per round on average. Consider how your bids deviated from the benchmark.`)
    }
  }

  if (studentAverageProfit != null && classAverageProfit != null) {
    const diff = studentAverageProfit - classAverageProfit
    const absDiff = formatMoney(Math.abs(diff))
    if (Math.abs(diff) < 0.01) {
      lines.push('Your profit matched the class average closely.')
    } else if (diff > 0) {
      lines.push(`You earned ${absDiff} more per round than the class average.`)
    } else {
      lines.push(`You earned ${absDiff} less per round than the class average.`)
    }
  }

  if (lines.length === 0) {
    lines.push('Not enough data to compare profits.')
  }

  return <InsightPanel title="Profit Breakdown" lines={lines} />
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

function MetricCard({ eyebrow, value, detail }: { eyebrow: string; value: string; detail: string }) {
  return (
    <div
      className="rounded-3xl border p-4 min-w-0"
      style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
        {eyebrow}
      </p>
      <p className="serif mt-3 text-2xl break-words min-w-0" style={{ color: 'var(--text)' }}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
        {detail}
      </p>
    </div>
  )
}

function InsightPanel({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--navy)' }}>
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
            {line}
          </p>
        ))}
      </div>
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
      style={{ background: 'rgba(17,24,39,0.04)', border: '1px solid rgba(17,24,39,0.06)' }}
    >
      <span style={{ color: 'var(--text)' }}>{label}:</span> {value}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Methodology note
// ---------------------------------------------------------------------------

function MethodologyNote() {
  return (
    <details
      className="rounded-2xl border text-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <summary
        className="cursor-pointer select-none px-5 py-4 text-xs uppercase tracking-widest list-none flex items-center justify-between gap-2"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>How profits are computed</span>
        <span className="text-base leading-none transition-transform details-open:rotate-90" aria-hidden>›</span>
      </summary>

      <div className="px-5 pb-5 space-y-4 leading-7" style={{ color: 'var(--text-muted)' }}>
        <Section heading="Matching against classmates">
          For each round you played, your bid is compared against the actual bids submitted by every other student in that same round. Rather than using your one real opponent, your profit is averaged across <em>all possible pairings</em> — so the number reflects your bidding strategy, not luck of the draw.
        </Section>

        <Section heading="First-price auctions">
          You win a pairing if your bid strictly exceeds your opponent&rsquo;s. Your profit when you win is your private value minus your bid (you pay what you bid). Expected profit per round is your win-probability times that surplus.
        </Section>

        <Section heading="Second-price auctions">
          You win if your bid is the highest, but you pay the highest losing bid (or the reserve price, whichever is larger). Expected profit is the average of <em>(your value − opponent&rsquo;s bid)</em> over all opponents you beat, divided by the total number of opponents.
        </Section>

        <Section heading="5-bidder auctions">
          When there are 5 bidders you need to beat 4 opponents. The win probability is the fraction of all possible 4-opponent groups (drawn without replacement from your classmates in that round) in which you have the highest bid. For second-price, the expected payment uses the exact combinatorial sum over those same groups.
        </Section>

        <Section heading="Entry fees and reserve prices">
          If an auction has an entry fee, it is subtracted from your profit whenever you submit a positive bid (regardless of outcome). If there is a reserve price, your bid must meet or exceed it to be eligible to win; a bid below the reserve earns nothing and still costs any entry fee paid.
        </Section>

        <Section heading="Equilibrium bidder">
          The equilibrium column answers: <em>what would your profit have been if you had bid the theoretical benchmark for every private value you were assigned?</em> It uses your actual private values and the same classmates as opponents, so the only thing that changes is the bid amount.
        </Section>

        <Section heading="Class average">
          Every student&rsquo;s profit for every round is computed the same way and then averaged together. This gives a sense of how the class as a whole performed in each auction format.
        </Section>
      </div>
    </details>
  )
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--navy)' }}>
        {heading}
      </p>
      <p>{children}</p>
    </div>
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

function formatMaybePercent(value: number | null) {
  if (value == null) return 'n/a'
  return `${(value * 100).toFixed(1)}%`
}
