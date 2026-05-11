'use client'

import { useState } from 'react'

export default function NewQuarterModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'confirm' | 'downloading' | 'deleting' | 'done'>('confirm')
  const [confirmText, setConfirmText] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState('')

  const CONFIRM_PHRASE = 'new quarter'
  const canDelete = downloaded && confirmText.toLowerCase() === CONFIRM_PHRASE

  async function handleDownload() {
    setStep('downloading')
    setError('')
    try {
      const res = await fetch('/api/admin/quarter-export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `econ177-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setDownloaded(true)
    } catch {
      setError('Download failed. Please try again.')
    } finally {
      setStep('confirm')
    }
  }

  async function handleDelete() {
    if (!canDelete) return
    setStep('deleting')
    setError('')
    try {
      const res = await fetch('/api/admin/quarter-reset', { method: 'POST' })
      if (!res.ok) throw new Error('Reset failed')
      setStep('done')
    } catch {
      setError('Deletion failed. Please try again.')
      setStep('confirm')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
      >
        {step === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#dcfce7', border: '2px solid #16a34a' }}>
              <span style={{ color: '#16a34a', fontSize: 20 }}>✓</span>
            </div>
            <h2 className="serif text-2xl mb-2" style={{ color: 'var(--text)' }}>All Clear</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              All student data has been deleted. Ready for a new quarter.
            </p>
            <button onClick={onClose} className="btn-gold rounded-lg px-5 py-2.5 text-sm">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: '#dc2626', fontSize: 18 }}>⚠</span>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Start New Quarter</h2>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  This permanently deletes all student data across every experiment and attendance.
                </p>
              </div>
              <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            {/* Step 1: Download */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: downloaded ? '#f0fdf4' : 'var(--surface)', border: `1px solid ${downloaded ? '#86efac' : 'var(--border)'}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: downloaded ? '#16a34a' : 'var(--navy)' }}>
                  Step 1 — Download Backup
                </p>
                {downloaded && <span className="text-xs font-medium" style={{ color: '#16a34a' }}>✓ Downloaded</span>}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Export all data (7 tables) to an Excel file before deleting.
              </p>
              <button
                onClick={handleDownload}
                disabled={step === 'downloading'}
                className="text-xs px-3 py-2 rounded-lg font-medium transition-all"
                style={{
                  background: downloaded ? 'transparent' : 'var(--navy)',
                  color: downloaded ? '#16a34a' : '#fff',
                  border: downloaded ? '1px solid #86efac' : '1px solid var(--navy)',
                  cursor: step === 'downloading' ? 'wait' : 'pointer',
                }}
              >
                {step === 'downloading' ? 'Downloading…' : downloaded ? '↓ Download Again' : '↓ Download Excel Backup'}
              </button>
            </div>

            {/* Step 2: Delete */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                opacity: downloaded ? 1 : 0.4,
                pointerEvents: downloaded ? 'auto' : 'none',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#dc2626' }}>
                Step 2 — Confirm Deletion
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Type <strong>new quarter</strong> to confirm you want to delete all data permanently.
              </p>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 text-sm mb-3"
                placeholder="new quarter"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                style={{ border: '1px solid var(--border)' }}
              />
              <button
                onClick={handleDelete}
                disabled={!canDelete || step === 'deleting'}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  background: canDelete ? '#dc2626' : 'var(--border)',
                  color: canDelete ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: canDelete ? 'pointer' : 'not-allowed',
                }}
              >
                {step === 'deleting' ? 'Deleting…' : 'Delete All Data'}
              </button>
            </div>

            {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
