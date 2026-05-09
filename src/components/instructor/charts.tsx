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
