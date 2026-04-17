'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ExportPage() {
  const [netid, setNetid] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = netid.trim()
    if (!trimmed) return

    setStatus('loading')
    setErrorMsg('')

    const res = await fetch(`/api/export?netid=${encodeURIComponent(trimmed)}`)

    if (res.status === 404) {
      setStatus('empty')
      return
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error ?? 'Something went wrong.')
      setStatus('error')
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${trimmed.toLowerCase()}-experiment-data.csv`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('idle')
  }

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
          Download Your Data
        </h1>

        <form onSubmit={handleDownload} className="flex flex-col gap-4">
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
              onChange={e => { setNetid(e.target.value); setStatus('idle') }}
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

          <button
            type="submit"
            disabled={status === 'loading' || !netid.trim()}
            className="rounded-md px-4 py-2 text-sm font-semibold tracking-wide transition-opacity disabled:opacity-40"
            style={{ background: 'var(--navy)', color: '#fff' }}
          >
            {status === 'loading' ? 'Fetching…' : 'Download CSV'}
          </button>
        </form>

        {status === 'empty' && (
          <p className="mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
            No experiment data found for perm number <span style={{ color: 'var(--text)' }}>{netid.trim().toLowerCase()}</span>.
          </p>
        )}

        {status === 'error' && (
          <p className="mt-5 text-sm" style={{ color: '#c0392b' }}>
            {errorMsg}
          </p>
        )}
      </div>
    </main>
  )
}
