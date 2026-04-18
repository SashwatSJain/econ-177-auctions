'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  EXPORT_DATASETS,
  getExportDataset,
  type ExportDatasetKey,
} from '@/lib/export-datasets'

export default function ExportPage() {
  const [netid, setNetid] = useState('')
  const [activeDownload, setActiveDownload] = useState<ExportDatasetKey | null>(null)
  const [status, setStatus] = useState<{
    kind: 'idle' | 'empty' | 'error'
    datasetKey: ExportDatasetKey | null
    message: string
  }>({
    kind: 'idle',
    datasetKey: null,
    message: '',
  })

  async function handleDownload(datasetKey: ExportDatasetKey) {
    const trimmed = netid.trim()
    if (!trimmed) return

    setActiveDownload(datasetKey)
    setStatus({ kind: 'idle', datasetKey: null, message: '' })

    try {
      const res = await fetch(
        `/api/export?netid=${encodeURIComponent(trimmed)}&dataset=${encodeURIComponent(datasetKey)}`
      )

      if (res.status === 404) {
        setStatus({
          kind: 'empty',
          datasetKey,
          message: `No data found for perm number ${trimmed.toLowerCase()}.`,
        })
        return
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setStatus({
          kind: 'error',
          datasetKey,
          message: json.error ?? 'Something went wrong.',
        })
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dataset = getExportDataset(datasetKey)
      a.href = url
      a.download = `${trimmed.toLowerCase()}-${dataset?.filenameSuffix ?? 'experiment-data'}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ kind: 'idle', datasetKey: null, message: '' })
    } catch {
      setStatus({
        kind: 'error',
        datasetKey,
        message: 'Unable to download the export right now.',
      })
    } finally {
      setActiveDownload(null)
    }
  }

  const statusDataset = status.datasetKey ? getExportDataset(status.datasetKey) : null

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md mx-auto px-6 py-14">
        <Link
          href="/"
          className="text-xs tracking-widest uppercase mb-6 inline-block"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back
        </Link>
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--navy)' }}>
          UC Santa Barbara · Econ 177
        </p>
        <h1 className="serif text-4xl mb-8" style={{ color: 'var(--text)' }}>
          Download Your Experiment Data
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="netid"
              className="text-xs tracking-widest uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              Perm Number
            </label>
            <input
              id="netid"
              type="text"
              value={netid}
              onChange={e => {
                setNetid(e.target.value)
                setStatus({ kind: 'idle', datasetKey: null, message: '' })
              }}
              placeholder="e.g. 1234567"
              autoComplete="off"
              spellCheck={false}
              className="rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Choose a separate CSV export for each experiment.
          </p>

          <div className="flex flex-col gap-3">
            {EXPORT_DATASETS.map((dataset) => {
              const isLoading = activeDownload === dataset.key

              return (
                <div
                  key={dataset.key}
                  className="rounded-lg p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="mb-3">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {dataset.title}
                    </h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {dataset.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(dataset.key)}
                    disabled={activeDownload !== null || !netid.trim()}
                    className="rounded-md px-4 py-2 text-sm font-semibold tracking-wide transition-opacity disabled:opacity-40"
                    style={{ background: 'var(--navy)', color: '#fff' }}
                  >
                    {isLoading ? 'Fetching…' : 'Download CSV'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {status.kind === 'empty' && statusDataset && (
          <p className="mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
            No {statusDataset.title.toLowerCase()} data found for perm number{' '}
            <span style={{ color: 'var(--text)' }}>{netid.trim().toLowerCase()}</span>.
          </p>
        )}

        {status.kind === 'error' && (
          <p className="mt-5 text-sm" style={{ color: '#c0392b' }}>
            {status.message}
          </p>
        )}
      </div>
    </main>
  )
}
