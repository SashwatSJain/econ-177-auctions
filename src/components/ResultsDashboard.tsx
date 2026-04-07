'use client'

import { useState } from 'react'
import Link from 'next/link'

import type {
  AuctionResultsSection,
  ResultsLinePoint,
  ResultsScatterPoint,
  StudentResultsDashboard,
} from '@/lib/results'

interface Props {
  dashboard: StudentResultsDashboard
}

export default function ResultsDashboard({ dashboard }: Props) {
  const { overview, sections } = dashboard
  const [hideExtremeOutliers, setHideExtremeOutliers] = useState(true)

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
            How your bidding compares to Nash and to the rest of the class.
          </h2>
          <p className="mt-2 text-sm leading-6 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Each auction shows what the benchmark strategy predicted, where your bids landed, and how tightly you tracked the same logic as your classmates.
          </p>

          <div className="mt-5 grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            <OverviewStat label="Perm" value={overview.studentId} />
            <OverviewStat
              label="Experiments Found"
              value={`${overview.experimentsFound} / ${overview.expectedExperiments}`}
            />
            <OverviewStat label="Fully Completed" value={String(overview.fullyCompletedExperiments)} />
            <OverviewStat label="Total Bids" value={String(overview.totalBidsFound)} />
            <OverviewStat label="Strongest Fit" value={overview.strongestAuctionTitle ?? 'Not enough data'} />
            <OverviewStat label="Weakest Fit" value={overview.weakestAuctionTitle ?? 'Not enough data'} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Chart Controls
          </p>
          <label className="inline-flex cursor-pointer items-center gap-3 text-sm" style={{ color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={hideExtremeOutliers}
              onChange={(event) => setHideExtremeOutliers(event.target.checked)}
              className="h-4 w-4 accent-[var(--navy)]"
            />
            Hide extreme class outliers in charts
          </label>
        </div>
      </section>

      <div className="space-y-6">
        {sections.map((section) => (
          <AuctionSection key={section.key} section={section} hideExtremeOutliers={hideExtremeOutliers} />
        ))}
      </div>

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

function AuctionSection({
  section,
  hideExtremeOutliers,
}: {
  section: AuctionResultsSection
  hideExtremeOutliers: boolean
}) {
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
            <MetaPill label="Benchmark" value={section.nashDescription} />
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
          {/* Metric cards — full width, 4-up */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              eyebrow="Your Bid / Value"
              value={formatMaybePercent(section.studentAverageBidRatio)}
              detail={`Class median ${formatMaybePercent(section.classMedianBidRatio)}`}
            />
            <MetricCard
              eyebrow="Signed Gap"
              value={formatSignedMaybeMoney(section.studentMeanDeviationFromNash)}
              detail="Positive means you overbid the benchmark"
            />
            <MetricCard
              eyebrow="Abs Nash Error"
              value={formatMaybeMoney(section.studentMeanAbsoluteDeviationFromNash)}
              detail="Your avg dollar distance from benchmark"
            />
            <MetricCard
              eyebrow="Closer Than"
              value={section.closerThanPercent == null ? 'n/a' : `${Math.round(section.closerThanPercent)}%`}
              detail="of classmates by Nash accuracy"
            />
          </div>

          {/* Chart + insight panels side by side */}
          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            {section.visualization ? (
              <BidChart section={section} hideExtremeOutliers={hideExtremeOutliers} />
            ) : <div />}

            <div className="space-y-4">
              <InsightPanel
                title="Against Nash"
                lines={[
                  `Class median absolute deviation: ${formatMaybeMoney(section.classMedianAbsoluteDeviationFromNash)}`,
                  section.closerThanPercent == null
                    ? 'Need more class data to rank your deviation cleanly.'
                    : `You were closer to the benchmark than roughly ${Math.round(section.closerThanPercent)}% of comparable students.`,
                ]}
              />

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
          </div>
        </div>
      )}
    </section>
  )
}

function BidChart({
  section,
  hideExtremeOutliers,
}: {
  section: AuctionResultsSection
  hideExtremeOutliers: boolean
}) {
  const visualization = section.visualization
  if (!visualization) return null

  const chartPoints = hideExtremeOutliers
    ? filterExtremeClassOutliers(visualization.classPoints)
    : visualization.classPoints
  const filteredCount = visualization.classPoints.length - chartPoints.length

  const width = 720
  const height = 360
  const left = 48
  const right = 18
  const top = 18
  const bottom = 34
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const yMax = computeChartYMax({
    classPoints: chartPoints,
    studentPoints: visualization.studentPoints,
    nashLine: visualization.nashLine,
    threshold: visualization.threshold,
    fallback: visualization.yMax,
  })

  const scaleX = (value: number) => left + (value / visualization.xMax) * plotWidth
  const scaleY = (value: number) => top + plotHeight - (value / yMax) * plotHeight

  const nashPath = buildPath(visualization.nashLine, scaleX, scaleY)

  return (
    <div
      className="rounded-[24px] border p-4"
      style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, #fcfdff 0%, #f8fafc 100%)' }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Bid Map
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Gold dots are your bids. The navy line is the benchmark strategy for this model.
          </p>
          {hideExtremeOutliers && filteredCount > 0 ? (
            <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--navy)' }}>
              Hiding {filteredCount} extreme class outlier{filteredCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
          <LegendSwatch color="rgba(0,54,96,0.16)" label="Class" />
          <LegendSwatch color="rgba(254,188,17,0.92)" label="You" />
          <LegendSwatch color="rgba(0,54,96,0.95)" label="Nash" />
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${section.title} bid comparison chart`}>
        <rect x={0} y={0} width={width} height={height} rx={20} fill="transparent" />

        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const yValue = yMax * tick
          const y = scaleY(yValue)
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="rgba(107,114,128,0.12)" strokeWidth="1" />
              <text x={10} y={y + 4} fontSize="11" fill="rgba(107,114,128,0.9)">
                {formatAxisMoney(yValue)}
              </text>
            </g>
          )
        })}

        {[0, 25, 50, 75, 100].map((tick) => {
          const x = scaleX(tick)
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={top} y2={height - bottom} stroke="rgba(107,114,128,0.12)" strokeWidth="1" />
              <text x={x} y={height - 8} textAnchor="middle" fontSize="11" fill="rgba(107,114,128,0.9)">
                {tick}
              </text>
            </g>
          )
        })}

        {visualization.threshold != null ? (
          <line
            x1={scaleX(visualization.threshold)}
            x2={scaleX(visualization.threshold)}
            y1={top}
            y2={height - bottom}
            stroke="rgba(239,68,68,0.55)"
            strokeDasharray="6 6"
            strokeWidth="1.5"
          />
        ) : null}

        <path d={nashPath} fill="none" stroke="rgba(0,54,96,0.95)" strokeWidth="3" strokeLinecap="round" />

        {chartPoints.map((point, index) => (
          <circle
            key={`class-${index}`}
            cx={scaleX(point.x)}
            cy={scaleY(point.y)}
            r="4"
            fill="rgba(0,54,96,0.15)"
          />
        ))}

        {visualization.studentPoints.map((point, index) => (
          <g key={`student-${index}`}>
            <circle cx={scaleX(point.x)} cy={scaleY(point.y)} r="6.5" fill="rgba(254,188,17,0.92)" />
            <circle cx={scaleX(point.x)} cy={scaleY(point.y)} r="2.5" fill="rgba(0,54,96,0.92)" />
          </g>
        ))}

        <text x={left} y={12} fontSize="11" fill="rgba(107,114,128,0.9)">
          Bid
        </text>
        <text x={width - right} y={height - 8} textAnchor="end" fontSize="11" fill="rgba(107,114,128,0.9)">
          Private value
        </text>
      </svg>
    </div>
  )
}

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

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function buildPath(points: ResultsLinePoint[], scaleX: (value: number) => number, scaleY: (value: number) => number) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(point.x).toFixed(1)} ${scaleY(point.y).toFixed(1)}`)
    .join(' ')
}

function filterExtremeClassOutliers(points: ResultsScatterPoint[]) {
  if (points.length < 4) return points

  const amounts = [...points].map((point) => point.y).sort((left, right) => left - right)
  const q1 = quantile(amounts, 0.25)
  const q3 = quantile(amounts, 0.75)
  const iqr = q3 - q1

  if (!Number.isFinite(iqr) || iqr <= 0) return points

  const lower = q1 - iqr * 1.5
  const upper = q3 + iqr * 1.5

  return points.filter((point) => point.y >= lower && point.y <= upper)
}

function quantile(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) return 0
  const index = (sortedValues.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

function computeChartYMax({
  classPoints,
  studentPoints,
  nashLine,
  threshold,
  fallback,
}: {
  classPoints: ResultsScatterPoint[]
  studentPoints: ResultsScatterPoint[]
  nashLine: ResultsLinePoint[]
  threshold: number | null
  fallback: number
}) {
  const values = [
    ...classPoints.map((point) => point.y),
    ...studentPoints.map((point) => point.y),
    ...nashLine.map((point) => point.y),
    threshold ?? 0,
  ]
  const maxValue = Math.max(...values, 0)
  return Math.max(100, roundUp(maxValue * 1.1 || fallback, 10))
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step
}

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

function formatSignedMaybeMoney(value: number | null) {
  if (value == null) return 'n/a'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatMoney(value)}`
}

function formatMaybePercent(value: number | null) {
  if (value == null) return 'n/a'
  return `${(value * 100).toFixed(1)}%`
}

function formatAxisMoney(value: number) {
  return `$${Math.round(value)}`
}
