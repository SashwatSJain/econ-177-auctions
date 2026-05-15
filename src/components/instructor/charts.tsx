'use client'

import { useState, useRef } from 'react'

// ── Shared stat display ──────────────────────────────────────────────────────

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="serif text-2xl" style={{ color: 'var(--navy)' }}>{value}</p>
    </div>
  )
}

// ── Experiment 3 line chart ──────────────────────────────────────────────────

export type ChartProps = {
  data: { x: number; y: number }[]
  yLabel: string
  color: string
  yMin?: number
  yMax?: number
  referenceLine?: number
  referenceLabel?: string
  formatY?: (v: number) => string
}

export function Exp3LineChart({
  data,
  yLabel,
  yMin,
  yMax,
  referenceLine,
  referenceLabel,
  formatY = (v) => v.toFixed(1),
}: ChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 480; const H = 200
  const PAD = { top: 20, right: 56, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg"
        style={{ height: `${H}px`, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const xs = data.map((d) => d.x)
  const ys = data.map((d) => d.y)
  const xMin = Math.min(...xs); const xMax = Math.max(...xs)
  const rawYMin = yMin ?? Math.min(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const rawYMax = yMax ?? Math.max(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const yPadding = (rawYMax - rawYMin) * 0.12 || 5
  const computedYMin = rawYMin - yPadding
  const computedYMax = rawYMax + yPadding

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW
  const sy = (y: number) => PAD.top + (1 - (y - computedYMin) / (computedYMax - computedYMin || 1)) * innerH

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    let best = 0; let bestDist = Infinity
    data.forEach((d, i) => {
      const dist = Math.abs(sx(d.x) - mouseX)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    setHoveredIdx(best)
  }

  const poly = data.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ')
  const yTicks = 4
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    computedYMin + (i / yTicks) * (computedYMax - computedYMin)
  )
  const hov = hoveredIdx != null ? data[hoveredIdx] : null
  const TW = 72; const TH = 34
  const tooltipX = hov ? Math.min(Math.max(sx(hov.x) - TW / 2, PAD.left), PAD.left + innerW - TW) : 0
  const tooltipY = hov ? (sy(hov.y) - TH - 10 < PAD.top ? sy(hov.y) + 10 : sy(hov.y) - TH - 10) : 0

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
      style={{ display: 'block', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
      {yTickVals.map((v, i) => (
        <line key={i} x1={PAD.left} y1={sy(v)} x2={PAD.left + innerW} y2={sy(v)}
          stroke="var(--border)" strokeWidth={1} />
      ))}
      {yTickVals.map((v, i) => (
        <text key={i} x={PAD.left - 5} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
          {formatY(v)}
        </text>
      ))}
      {data.map((d) => (
        <text key={d.x} x={sx(d.x)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
          {[1, 5, 10, 15, 20].includes(d.x) ? d.x : ''}
        </text>
      ))}
      {referenceLine != null && (
        <>
          <line x1={PAD.left} y1={sy(referenceLine)} x2={PAD.left + innerW} y2={sy(referenceLine)}
            stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" />
          {referenceLabel && (
            <text x={PAD.left + innerW + 4} y={sy(referenceLine) + 4}
              fontSize={8} fill="var(--gold)" fontWeight={600}>{referenceLabel}</text>
          )}
        </>
      )}
      <polyline points={poly} fill="none" stroke="var(--navy)" strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.x)} cy={sy(d.y)}
          r={hoveredIdx === i ? 5 : 3}
          fill={hoveredIdx === i ? '#fff' : 'var(--navy)'}
          stroke="var(--navy)" strokeWidth={hoveredIdx === i ? 2 : 0} />
      ))}
      <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)"
        transform={`rotate(-90, 10, ${H / 2})`}>{yLabel}</text>
      <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Round</text>
      {hov && (
        <g>
          <rect x={tooltipX} y={tooltipY} width={TW} height={TH} rx={4} fill="var(--navy)" opacity={0.93} />
          <text x={tooltipX + TW / 2} y={tooltipY + 12} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.65)">R{hov.x}</text>
          <text x={tooltipX + TW / 2} y={tooltipY + 27} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">{formatY(hov.y)}</text>
        </g>
      )}
    </svg>
  )
}

// ── Experiment 3 dual-line chart ─────────────────────────────────────────────

export function Exp3DualLineChart({
  dataA,
  dataB,
  labelA,
  labelB,
  yLabel,
  referenceLine,
  referenceLabel,
  formatY = (v: number) => v.toFixed(1),
}: {
  dataA: { x: number; y: number }[]
  dataB: { x: number; y: number }[]
  labelA: string
  labelB: string
  yLabel: string
  referenceLine?: number
  referenceLabel?: string
  formatY?: (v: number) => string
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [hoveredSet, setHoveredSet] = useState<'A' | 'B' | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 480; const H = 200
  const PAD = { top: 20, right: 56, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allData = [...dataA, ...dataB]
  if (allData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg"
        style={{ height: `${H}px`, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const xs = allData.map((d) => d.x)
  const ys = allData.map((d) => d.y)
  const xMin = Math.min(...xs); const xMax = Math.max(...xs)
  const rawYMin = Math.min(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const rawYMax = Math.max(...ys, ...(referenceLine != null ? [referenceLine] : []))
  const yPadding = (rawYMax - rawYMin) * 0.14 || 5
  const computedYMin = rawYMin - yPadding
  const computedYMax = rawYMax + yPadding

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW
  const sy = (y: number) => PAD.top + (1 - (y - computedYMin) / (computedYMax - computedYMin || 1)) * innerH

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    const mouseY = ((e.clientY - rect.top) / rect.height) * H
    let bestA = 0; let bestDistA = Infinity
    dataA.forEach((d, i) => {
      const dist = Math.hypot(sx(d.x) - mouseX, sy(d.y) - mouseY)
      if (dist < bestDistA) { bestDistA = dist; bestA = i }
    })
    let bestB = 0; let bestDistB = Infinity
    dataB.forEach((d, i) => {
      const dist = Math.hypot(sx(d.x) - mouseX, sy(d.y) - mouseY)
      if (dist < bestDistB) { bestDistB = dist; bestB = i }
    })
    if (bestDistA <= bestDistB) { setHoveredSet('A'); setHoveredIdx(bestA) }
    else { setHoveredSet('B'); setHoveredIdx(bestB) }
  }

  const polyA = dataA.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ')
  const polyB = dataB.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ')
  const yTicks = 4
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    computedYMin + (i / yTicks) * (computedYMax - computedYMin)
  )
  const xLabelSet = new Set([1, 5, 10, 15, 20])
  const hovered = hoveredIdx != null && hoveredSet
    ? (hoveredSet === 'A' ? dataA[hoveredIdx] : dataB[hoveredIdx])
    : null
  const shortLabelA = labelA.split(' · ')[0]
  const shortLabelB = labelB.split(' · ')[0]
  const hoveredShortLabel = hoveredSet === 'A' ? shortLabelA : shortLabelB
  const TW = 80; const TH = 36
  const tooltipX = hovered ? Math.min(Math.max(sx(hovered.x) - TW / 2, PAD.left), PAD.left + innerW - TW) : 0
  const tooltipY = hovered ? (sy(hovered.y) - TH - 10 < PAD.top ? sy(hovered.y) + 10 : sy(hovered.y) - TH - 10) : 0

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => { setHoveredIdx(null); setHoveredSet(null) }}>
        {yTickVals.map((v, i) => (
          <line key={i} x1={PAD.left} y1={sy(v)} x2={PAD.left + innerW} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
        ))}
        {yTickVals.map((v, i) => (
          <text key={i} x={PAD.left - 5} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">{formatY(v)}</text>
        ))}
        {Array.from(new Set([...dataA.map(d => d.x), ...dataB.map(d => d.x)])).map((x) =>
          xLabelSet.has(x) ? (
            <text key={x} x={sx(x)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{x}</text>
          ) : null
        )}
        {referenceLine != null && (
          <>
            <line x1={PAD.left} y1={sy(referenceLine)} x2={PAD.left + innerW} y2={sy(referenceLine)}
              stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" />
            {referenceLabel && (
              <text x={PAD.left + innerW + 4} y={sy(referenceLine) + 4} fontSize={8} fill="var(--gold)" fontWeight={600}>{referenceLabel}</text>
            )}
          </>
        )}
        <polyline points={polyA} fill="none" stroke="var(--navy)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polyB} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {dataA.map((d, i) => (
          <circle key={`a${i}`} cx={sx(d.x)} cy={sy(d.y)} r={hoveredSet === 'A' && hoveredIdx === i ? 5 : 3}
            fill={hoveredSet === 'A' && hoveredIdx === i ? '#fff' : 'var(--navy)'}
            stroke="var(--navy)" strokeWidth={hoveredSet === 'A' && hoveredIdx === i ? 2 : 0} />
        ))}
        {dataB.map((d, i) => (
          <circle key={`b${i}`} cx={sx(d.x)} cy={sy(d.y)} r={hoveredSet === 'B' && hoveredIdx === i ? 5 : 3}
            fill={hoveredSet === 'B' && hoveredIdx === i ? '#fff' : 'var(--gold)'}
            stroke="var(--gold)" strokeWidth={hoveredSet === 'B' && hoveredIdx === i ? 2 : 0} />
        ))}
        <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)" transform={`rotate(-90, 10, ${H / 2})`}>{yLabel}</text>
        <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Round</text>
        {hovered && (
          <g>
            <rect x={tooltipX} y={tooltipY} width={TW} height={TH} rx={4} fill="var(--navy)" opacity={0.93} />
            <text x={tooltipX + TW / 2} y={tooltipY + 12} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.65)">{hoveredShortLabel} · R{hovered.x}</text>
            <text x={tooltipX + TW / 2} y={tooltipY + 27} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">{formatY(hovered.y)}</text>
          </g>
        )}
      </svg>
      <div className="flex items-center gap-5 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--navy)', flexShrink: 0 }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{labelA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{labelB}</span>
        </div>
      </div>
    </div>
  )
}

// ── Experiment 4 scatter chart ───────────────────────────────────────────────

function filterExp4Outliers(data: { id: string; x: number; y: number }[]) {
  if (data.length < 4) return data
  const fence = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b)
    const q1 = s[Math.floor(s.length * 0.25)]
    const q3 = s[Math.floor(s.length * 0.75)]
    const iqr = q3 - q1
    return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr }
  }
  const { lo: xLo, hi: xHi } = fence(data.map((d) => d.x))
  const { lo: yLo, hi: yHi } = fence(data.map((d) => d.y))
  return data.filter((d) => d.x >= xLo && d.x <= xHi && d.y >= yLo && d.y <= yHi)
}

export function Exp4ScatterChart({ data }: { data: { x: number; y: number; id: string }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 560; const H = 260
  const PAD = { top: 20, right: 60, bottom: 40, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg"
        style={{ height: `${H}px`, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No data yet</span>
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.x, d.y))) * 1.08 || 100
  const sx = (v: number) => PAD.left + (v / maxVal) * innerW
  const sy = (v: number) => PAD.top + (1 - v / maxVal) * innerH

  // OLS: bid = intercept + slope * estimate
  const n = data.length
  const sumX = data.reduce((s, d) => s + d.x, 0)
  const sumY = data.reduce((s, d) => s + d.y, 0)
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0)
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0)
  const denom = n * sumX2 - sumX * sumX
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 1
  const intercept = (sumY - slope * sumX) / n
  const meanY = sumY / n
  const ssTot = data.reduce((s, d) => s + (d.y - meanY) ** 2, 0)
  const ssRes = data.reduce((s, d) => s + (d.y - (intercept + slope * d.x)) ** 2, 0)
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1
  // clamp regression line to chart domain [0, maxVal]
  const regX0 = 0; const regY0 = intercept
  const regX1 = maxVal; const regY1 = intercept + slope * maxVal

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * W
    const my = ((e.clientY - rect.top) / rect.height) * H
    let best = 0; let bestDist = Infinity
    data.forEach((d, i) => {
      const dist = Math.hypot(sx(d.x) - mx, sy(d.y) - my)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    setHoveredIdx(best)
  }

  const ticks = Array.from({ length: 5 }, (_, i) => (i / 4) * maxVal)
  const hov = hoveredIdx != null ? data[hoveredIdx] : null
  const TW = 96; const TH = 44
  const tooltipX = hov ? Math.min(Math.max(sx(hov.x) - TW / 2, PAD.left), PAD.left + innerW - TW) : 0
  const tooltipY = hov ? (sy(hov.y) - TH - 8 < PAD.top ? sy(hov.y) + 8 : sy(hov.y) - TH - 8) : 0
  const fmtStat = (v: number) => Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2)

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={sy(v)} x2={PAD.left + innerW} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
            <line x1={sx(v)} y1={PAD.top} x2={sx(v)} y2={PAD.top + innerH} stroke="var(--border)" strokeWidth={1} />
          </g>
        ))}
        {ticks.map((v, i) => (
          <text key={i} x={PAD.left - 5} y={sy(v) + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          </text>
        ))}
        {ticks.map((v, i) => (
          <text key={i} x={sx(v)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          </text>
        ))}
        <line x1={sx(0)} y1={sy(0)} x2={sx(maxVal * 0.96)} y2={sy(maxVal * 0.96)}
          stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={sx(regX0)} y1={sy(regY0)} x2={sx(regX1)} y2={sy(regY1)}
          stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" />
        {hov && (
          <line x1={sx(hov.x)} y1={PAD.top} x2={sx(hov.x)} y2={PAD.top + innerH}
            stroke="var(--navy)" strokeWidth={1} strokeOpacity={0.2} strokeDasharray="3 2" />
        )}
        {data.map((d, i) => (
          <circle key={i} cx={sx(d.x)} cy={sy(d.y)}
            r={hoveredIdx === i ? 5 : 3}
            fill={hoveredIdx === i ? '#fff' : 'var(--navy)'}
            stroke="var(--navy)" strokeWidth={hoveredIdx === i ? 2 : 0}
            opacity={hoveredIdx === i ? 1 : 0.65} />
        ))}
        <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)" transform={`rotate(-90, 10, ${H / 2})`}>Bid ($)</text>
        <text x={PAD.left + innerW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Estimate ($)</text>
        {hov && (
          <g>
            <rect x={tooltipX} y={tooltipY} width={TW} height={TH} rx={4} fill="var(--navy)" opacity={0.93} />
            <text x={tooltipX + TW / 2} y={tooltipY + 12} textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.6)">{hov.id}</text>
            <text x={tooltipX + TW / 2} y={tooltipY + 23} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.8)">
              est: {hov.x.toLocaleString()}  bid: ${hov.y.toFixed(0)}
            </text>
            <text x={tooltipX + TW / 2} y={tooltipY + 36} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#fff">
              ratio: {hov.x > 0 ? (hov.y / hov.x).toFixed(3) : '—'}
            </text>
          </g>
        )}
      </svg>
      {/* Legend + OLS stats */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 px-1" style={{ fontSize: 11 }}>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          <span style={{ color: 'var(--text-muted)' }}>bid = estimate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" /></svg>
          <span style={{ color: 'var(--text-muted)' }}>OLS fit</span>
        </div>
        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
          bid = <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmtStat(slope)}</span> · est
          {intercept >= 0
            ? <> + <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmtStat(intercept)}</span></>
            : <> − <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmtStat(-intercept)}</span></>}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          R² = <span style={{ color: 'var(--text)', fontWeight: 500 }}>{r2.toFixed(3)}</span>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          n = <span style={{ color: 'var(--text)', fontWeight: 500 }}>{n}</span>
        </span>
      </div>
    </div>
  )
}

export { filterExp4Outliers }

// ── Experiment 5 Bid CDF chart ───────────────────────────────────────────────

const E5_X_MAX = 6
const E5_W = 370
const E5_H = 260
const E5_PAD = { top: 32, right: 16, bottom: 44, left: 52 }
const E5_IW = E5_W - E5_PAD.left - E5_PAD.right
const E5_IH = E5_H - E5_PAD.top - E5_PAD.bottom

const e5sx = (x: number) => E5_PAD.left + (x / E5_X_MAX) * E5_IW
const e5sy = (p: number) => E5_PAD.top + (1 - p) * E5_IH

function e5CdfPts(bids: number[]): [number, number][] {
  if (bids.length === 0) return []
  const sorted = [...bids].sort((a, b) => a - b)
  const n = sorted.length
  const pts: [number, number][] = [[0, 0]]
  let i = 0
  while (i < n) {
    const val = sorted[i]
    let j = i
    while (j < n && sorted[j] === val) j++
    pts.push([val, i / n])
    pts.push([val, j / n])
    i = j
  }
  pts.push([E5_X_MAX, 1])
  return pts
}

function e5Poly(pts: [number, number][]): string {
  return pts.map(([x, p]) => `${e5sx(x).toFixed(1)},${e5sy(p).toFixed(1)}`).join(' ')
}

function e5FillPoly(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  const last = pts[pts.length - 1]
  return [
    ...pts.map(([x, p]) => `${e5sx(x).toFixed(1)},${e5sy(p).toFixed(1)}`),
    `${e5sx(last[0]).toFixed(1)},${e5sy(0).toFixed(1)}`,
    `${e5sx(0).toFixed(1)},${e5sy(0).toFixed(1)}`,
  ].join(' ')
}

const E5_Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
const E5_X_TICKS = [0, 1, 2, 3, 4, 5, 6]
const E5_GREEN = '#2a9d5c'

function E5CdfPanel({
  title,
  empColor,
  n,
  empPts,
  eqPts,
  showYLabel,
}: {
  title: string
  empColor: string
  n: number
  empPts: [number, number][]
  eqPts: [number, number][]
  showYLabel: boolean
}) {
  const hasData = empPts.length > 0
  return (
    <svg viewBox={`0 0 ${E5_W} ${E5_H}`} style={{ display: 'block', width: '100%' }}>
      <text x={E5_W / 2} y={18} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--navy)">
        {title}
      </text>

      {E5_Y_TICKS.map((p) => (
        <line key={p} x1={E5_PAD.left} y1={e5sy(p)} x2={E5_PAD.left + E5_IW} y2={e5sy(p)}
          stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {E5_X_TICKS.map((x) => (
        <line key={x} x1={e5sx(x)} y1={E5_PAD.top} x2={e5sx(x)} y2={E5_PAD.top + E5_IH}
          stroke="#f0f1f3" strokeWidth={0.5} />
      ))}

      {E5_Y_TICKS.map((p) => (
        <text key={p} x={E5_PAD.left - 6} y={e5sy(p) + 4}
          textAnchor="end" fontSize={9} fill="#6b7280">
          {(p * 100).toFixed(0)}%
        </text>
      ))}
      {E5_X_TICKS.map((x) => (
        <text key={x} x={e5sx(x)} y={E5_PAD.top + E5_IH + 14}
          textAnchor="middle" fontSize={9} fill="#6b7280">
          {x}
        </text>
      ))}

      {showYLabel && (
        <text x={10} y={E5_PAD.top + E5_IH / 2}
          textAnchor="middle" fontSize={9} fill="#6b7280"
          transform={`rotate(-90, 10, ${E5_PAD.top + E5_IH / 2})`}>
          Cumulative probability
        </text>
      )}
      <text x={E5_PAD.left + E5_IW / 2} y={E5_H - 4}
        textAnchor="middle" fontSize={9} fill="#6b7280">
        Bid ($)
      </text>

      {hasData && (
        <polygon points={e5FillPoly(empPts)} fill={empColor} opacity={0.12} />
      )}

      <polyline points={e5Poly(eqPts)} fill="none"
        stroke={E5_GREEN} strokeWidth={2} strokeDasharray="7 3" />

      {hasData && (
        <polyline points={e5Poly(empPts)} fill="none"
          stroke={empColor} strokeWidth={2.5}
          strokeLinejoin="miter" strokeLinecap="square" />
      )}

      {!hasData && (
        <text x={E5_PAD.left + E5_IW / 2} y={E5_PAD.top + E5_IH / 2}
          textAnchor="middle" fontSize={11} fill="#9ca3af">
          No bids yet
        </text>
      )}

      <g transform={`translate(${E5_PAD.left + 6}, ${E5_PAD.top + 6})`}>
        <rect x={0} y={0} width={120} height={46} rx={3}
          fill="white" fillOpacity={0.9} stroke="#e5e7eb" strokeWidth={0.5} />
        <line x1={6} y1={13} x2={22} y2={13} stroke={empColor} strokeWidth={2.5} />
        <text x={27} y={17} fontSize={9} fill="#374151">Empirical (n={n})</text>
        <line x1={6} y1={32} x2={22} y2={32} stroke={E5_GREEN} strokeWidth={2} strokeDasharray="6 2.5" />
        <text x={27} y={36} fontSize={9} fill="#374151">Equilibrium</text>
      </g>
    </svg>
  )
}

export function Exp5BidCdfChart({ bids0, bids3 }: { bids0: number[]; bids3: number[] }) {
  // Integer type-0 equilibrium: mass at 0 → instant step to 100%
  const eq0: [number, number][] = [[0, 0], [0, 1], [E5_X_MAX, 1]]

  // Type-3 equilibrium: F(b) = b/(6−b) on [0,3] (symmetric BNE mixed strategy)
  const eq3: [number, number][] = []
  for (let i = 0; i <= 80; i++) {
    const b = (i / 80) * 3
    eq3.push([b, b / (6 - b)])
  }
  eq3.push([E5_X_MAX, 1])

  const emp0 = e5CdfPts(bids0)
  const emp3 = e5CdfPts(bids3)

  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-3 text-center" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
        Empirical vs Equilibrium Bid CDFs
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <E5CdfPanel title="Half Value = $0" empColor="#3b82f6" n={bids0.length}
          empPts={emp0} eqPts={eq0} showYLabel />
        <E5CdfPanel title="Half Value = $3" empColor="#c2410c" n={bids3.length}
          empPts={emp3} eqPts={eq3} showYLabel={false} />
      </div>
    </div>
  )
}

// ── Experiment 6 Bid CDF chart ───────────────────────────────────────────────

const E6_X_MAX = 100
const E6_W = 520
const E6_H = 300
const E6_PAD = { top: 32, right: 24, bottom: 48, left: 52 }
const E6_IW = E6_W - E6_PAD.left - E6_PAD.right
const E6_IH = E6_H - E6_PAD.top - E6_PAD.bottom

const e6sx = (x: number) => E6_PAD.left + (x / E6_X_MAX) * E6_IW
const e6sy = (p: number) => E6_PAD.top + (1 - p) * E6_IH

function e6CdfPts(bids: number[]): [number, number][] {
  if (bids.length === 0) return []
  const sorted = [...bids].sort((a, b) => a - b)
  const n = sorted.length
  const pts: [number, number][] = [[0, 0]]
  let i = 0
  while (i < n) {
    const val = sorted[i]
    let j = i
    while (j < n && sorted[j] === val) j++
    pts.push([val, i / n])
    pts.push([val, j / n])
    i = j
  }
  pts.push([E6_X_MAX, 1])
  return pts
}

function e6Poly(pts: [number, number][]): string {
  return pts.map(([x, p]) => `${e6sx(x).toFixed(1)},${e6sy(p).toFixed(1)}`).join(' ')
}

// F(b) = (b/100)^(1/(N-1)) for b in [0,100]
function e6EqPts(n: number): [number, number][] {
  const exp = 1 / (n - 1)
  const pts: [number, number][] = []
  for (let i = 0; i <= 200; i++) {
    const b = (i / 200) * E6_X_MAX
    pts.push([b, Math.pow(b / E6_X_MAX, exp)])
  }
  return pts
}

const E6_SERIES = [
  { n: 2,  empColor: '#111827', label: '2 bidders' },
  { n: 5,  empColor: '#dc2626', label: '5 bidders' },
  { n: 10, empColor: '#0891b2', label: '10 bidders' },
] as const

const E6_Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
const E6_X_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const E6_EQ_COLOR = '#9ca3af'

export function Exp6BidCdfChart({ bids2, bids5, bids10 }: { bids2: number[]; bids5: number[]; bids10: number[] }) {
  const allBids = [bids2, bids5, bids10]
  const hasAny = allBids.some((b) => b.length > 0)

  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-3 text-center"
        style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
        Empirical Bid CDFs by Auction Size
      </p>
      <svg viewBox={`0 0 ${E6_W} ${E6_H}`} style={{ display: 'block', width: '100%' }}>
        {/* Grid lines */}
        {E6_Y_TICKS.map((p) => (
          <line key={p} x1={E6_PAD.left} y1={e6sy(p)} x2={E6_PAD.left + E6_IW} y2={e6sy(p)}
            stroke="#e5e7eb" strokeWidth={1} />
        ))}
        {E6_X_TICKS.map((x) => (
          <line key={x} x1={e6sx(x)} y1={E6_PAD.top} x2={e6sx(x)} y2={E6_PAD.top + E6_IH}
            stroke="#f0f1f3" strokeWidth={0.5} />
        ))}

        {/* Y-axis labels */}
        {E6_Y_TICKS.map((p) => (
          <text key={p} x={E6_PAD.left - 6} y={e6sy(p) + 4}
            textAnchor="end" fontSize={9} fill="#6b7280">
            {(p * 100).toFixed(0)}%
          </text>
        ))}
        {/* X-axis labels */}
        {E6_X_TICKS.map((x) => (
          <text key={x} x={e6sx(x)} y={E6_PAD.top + E6_IH + 14}
            textAnchor="middle" fontSize={9} fill="#6b7280">
            {x}
          </text>
        ))}

        {/* Axis titles */}
        <text x={10} y={E6_PAD.top + E6_IH / 2}
          textAnchor="middle" fontSize={9} fill="#6b7280"
          transform={`rotate(-90, 10, ${E6_PAD.top + E6_IH / 2})`}>
          Cumulative probability
        </text>
        <text x={E6_PAD.left + E6_IW / 2} y={E6_H - 4}
          textAnchor="middle" fontSize={9} fill="#6b7280">
          Bid ($)
        </text>

        {/* Equilibrium curves (dashed) */}
        {E6_SERIES.map(({ n }) => (
          <polyline key={`eq-${n}`}
            points={e6Poly(e6EqPts(n))}
            fill="none" stroke={E6_EQ_COLOR} strokeWidth={1.5} strokeDasharray="6 3" />
        ))}

        {/* Empirical CDF curves */}
        {E6_SERIES.map(({ n, empColor }, i) => {
          const pts = e6CdfPts(allBids[i])
          if (pts.length === 0) return null
          return (
            <polyline key={`emp-${n}`}
              points={e6Poly(pts)}
              fill="none" stroke={empColor} strokeWidth={2.5}
              strokeLinejoin="miter" strokeLinecap="square" />
          )
        })}

        {!hasAny && (
          <text x={E6_PAD.left + E6_IW / 2} y={E6_PAD.top + E6_IH / 2}
            textAnchor="middle" fontSize={11} fill="#9ca3af">
            No bids yet
          </text>
        )}

        {/* Legend */}
        <g transform={`translate(${E6_PAD.left + 6}, ${E6_PAD.top + 6})`}>
          <rect x={0} y={0} width={118} height={84} rx={3}
            fill="white" fillOpacity={0.92} stroke="#e5e7eb" strokeWidth={0.5} />
          {E6_SERIES.map(({ empColor, label }, i) => (
            <g key={label} transform={`translate(0, ${i * 20})`}>
              <line x1={6} y1={13} x2={22} y2={13} stroke={empColor} strokeWidth={2.5} />
              <text x={27} y={17} fontSize={9} fill="#374151">{label}</text>
            </g>
          ))}
          <g transform="translate(0, 60)">
            <line x1={6} y1={13} x2={22} y2={13} stroke={E6_EQ_COLOR} strokeWidth={1.5} strokeDasharray="6 3" />
            <text x={27} y={17} fontSize={9} fill="#374151">Equilibrium</text>
          </g>
        </g>
      </svg>
    </div>
  )
}
