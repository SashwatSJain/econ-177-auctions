// Widths cycle across cells so rows look like real content, not uniform bars
const CELL_WIDTHS = ['60%', '85%', '45%', '75%', '55%', '70%', '50%', '35%']

function SkeletonBlock({ height = 13, width = '100%' }: { height?: number; width?: string }) {
  return <div className="skeleton" style={{ height, width }} />
}

export function SkeletonStatBar({ cols }: { cols: number }) {
  return (
    <div
      className="rounded-xl p-4 mb-4 grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonBlock height={10} width="45%" />
          <SkeletonBlock height={24} width="65%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({
  statCols,
  tableCols,
  tableRows = 6,
}: {
  statCols?: number
  tableCols: number
  tableRows?: number
}) {
  return (
    <div>
      {statCols !== undefined && <SkeletonStatBar cols={statCols} />}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {/* header */}
        <div
          className="flex gap-4 px-4 py-3"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          {Array.from({ length: tableCols }).map((_, i) => (
            <div key={i} style={{ flex: 1 }}>
              <SkeletonBlock height={11} width={CELL_WIDTHS[i % CELL_WIDTHS.length]} />
            </div>
          ))}
        </div>
        {/* rows */}
        {Array.from({ length: tableRows }).map((_, row) => (
          <div
            key={row}
            className="flex gap-4 px-4 py-3"
            style={{
              background: row % 2 === 0 ? 'white' : 'var(--surface)',
              borderTop: '1px solid var(--border)',
            }}
          >
            {Array.from({ length: tableCols }).map((_, col) => (
              <div key={col} style={{ flex: 1 }}>
                <SkeletonBlock
                  height={13}
                  width={CELL_WIDTHS[(row + col) % CELL_WIDTHS.length]}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
