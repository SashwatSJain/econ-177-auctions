'use client'

import Link from 'next/link'
import { useState } from 'react'

interface CardDef {
  key: string
  line1: string
  line2: string
  line3: string
  description: string
  href?: string
}

type HomeTabKey = 'exp1' | 'exp2' | 'exp3' | 'exp4' | 'exp5' | 'exp6'

const EXP1_CARDS: CardDef[] = [
  {
    key: 'second-2',
    line1: 'Second Price',
    line2: 'Sealed Bid',
    line3: '2-Bidder',
    description: 'Vickrey-style auction with 2 bidders.',
  },
  {
    key: 'second-5',
    line1: 'Second Price',
    line2: 'Sealed Bid',
    line3: '5-Bidder',
    description: 'Vickrey-style auction with 5 bidders.',
  },
  {
    key: 'second-2-reserve50',
    line1: 'Second Price',
    line2: '2-Bidder',
    line3: '$50 Reserve',
    description: 'Second-price sealed bid with a $50 reserve price.',
  },
  {
    key: 'second-2-entry25',
    line1: 'Second Price',
    line2: '2-Bidder',
    line3: '$25 Entry Fee',
    description: 'Second-price sealed bid with a $25 entry fee.',
  },
  {
    key: 'first-2',
    line1: 'First Price',
    line2: 'Sealed Bid',
    line3: '2-Bidder',
    description: 'Students receive a random private value (0–100) and submit a sealed bid.',
  },
  {
    key: 'first-5',
    line1: 'First Price',
    line2: 'Sealed Bid',
    line3: '5-Bidder',
    description: 'Same as the 2-bidder version but with 5 competing bidders.',
  },
  {
    key: 'first-2-reserve50',
    line1: 'First Price',
    line2: '2-Bidder',
    line3: '$50 Reserve',
    description: 'First-price sealed bid with a $50 reserve price.',
  },
  {
    key: 'first-2-entry25',
    line1: 'First Price',
    line2: '2-Bidder',
    line3: '$25 Entry Fee',
    description: 'First-price sealed bid with a $25 entry fee.',
  },
]

const EXP2_CARDS: CardDef[] = [
  {
    key: 'exp2',
    line1: 'Experiment 2',
    line2: 'Risk Aversion',
    line3: 'CRRA Elicitation',
    description:
      'Enter indifference probabilities between a lottery and certain payments to estimate class risk preferences.',
    href: '/exp2',
  },
]

const EXP3_CARDS: CardDef[] = [
  {
    key: 'exp3',
    line1: 'Experiment 3',
    line2: 'Seller Reserve',
    line3: 'Auction',
    description:
      'Set reserve prices as a seller across four treatment blocks (2 or 5 bidders × seller value $0 or $30). The experiment picks up wherever you left off.',
    href: '/exp3',
  },
]

const EXP4_CARDS: CardDef[] = [
  {
    key: 'exp4',
    line1: 'Experiment 4',
    line2: 'Jar of Kernels',
    line3: 'Common Value Auction',
    description:
      'Estimate the number of kernels in a jar and submit first-price bids against 1, 9, or 99 other bidders.',
    href: '/exp4',
  },
]

const EXP5_CARDS: CardDef[] = [
  {
    key: 'oil-well-integer',
    line1: 'Experiment 5a',
    line2: 'Oil Well Auction',
    line3: 'Integer Bids',
    description:
      'Sealed-bid common-value auction. Each firm receives a private half-value ($0 or $3). Bids are whole numbers $0–$6.',
    href: '/exp5/integer',
  },
  {
    key: 'oil-well-continuous',
    line1: 'Experiment 5b',
    line2: 'Oil Well Auction',
    line3: 'Continuous Bids',
    description:
      'Same structure as 5a, but half-values are drawn from a continuous uniform distribution. Any bid $0–$6 is allowed.',
    href: '/exp5/continuous',
  },
]

const EXP6_CARDS: CardDef[] = [
  {
    key: 'allpay-2',
    line1: 'Experiment 6a',
    line2: 'All-Pay Auction',
    line3: '2 Bidders',
    description:
      'Sealed-bid all-pay auction of a $100 bill. Both bidders pay their bid; the higher bidder wins the $100.',
    href: '/exp6/2',
  },
  {
    key: 'allpay-5',
    line1: 'Experiment 6b',
    line2: 'All-Pay Auction',
    line3: '5 Bidders',
    description:
      'Same all-pay structure with 5 competing bidders. Everyone pays; only the highest bidder receives the $100.',
    href: '/exp6/5',
  },
  {
    key: 'allpay-10',
    line1: 'Experiment 6c',
    line2: 'All-Pay Auction',
    line3: '10 Bidders',
    description:
      'All-pay auction with 10 bidders. More competition drives equilibrium bids down — but overbidding risk remains.',
    href: '/exp6/10',
  },
]

const HOME_TABS: {
  key: HomeTabKey
  label: string
  title: string
  description: string
  cards: CardDef[]
}[] = [
  {
    key: 'exp1',
    label: 'Exp 1',
    title: 'Auction Experiments',
    description: 'Eight bidder-side auction treatments grouped under the original experiment.',
    cards: EXP1_CARDS,
  },
  {
    key: 'exp2',
    label: 'Exp 2',
    title: 'Risk Aversion / CRRA',
    description: 'The risk-preference elicitation assignment and CRRA-style class summary input.',
    cards: EXP2_CARDS,
  },
  {
    key: 'exp3',
    label: 'Exp 3',
    title: 'Seller Reserve Auction',
    description: 'Set reserve prices as a seller. Four treatment blocks — the experiment picks up where you left off.',
    cards: EXP3_CARDS,
  },
  {
    key: 'exp4',
    label: 'Exp 4',
    title: 'Jar of Kernels',
    description: 'Common-value auction: estimate the jar, then bid in first-price auctions with increasing competition.',
    cards: EXP4_CARDS,
  },
  {
    key: 'exp5',
    label: 'Exp 5',
    title: 'Oil Well Auction',
    description: 'Common-value auction with private signals. Two variants: integer half-values vs. continuous uniform draws.',
    cards: EXP5_CARDS,
  },
  {
    key: 'exp6',
    label: 'Exp 6',
    title: 'All-Pay Auction',
    description: 'Sealed-bid all-pay auction of a $100 bill. Everyone pays their bid; only the highest bidder wins the prize. Three group sizes: 2, 5, and 10 bidders.',
    cards: EXP6_CARDS,
  },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>('exp1')
  const [showNewQuarter, setShowNewQuarter] = useState(false)
  const activeSection = HOME_TABS.find((tab) => tab.key === activeTab) ?? HOME_TABS[0]

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-14 min-h-screen flex flex-col">
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--navy)' }}>
            UC Santa Barbara · Econ 177
          </p>
          <h1 className="serif text-5xl" style={{ color: 'var(--text)' }}>
            Auction Experiments
          </h1>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {HOME_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="text-xs tracking-widest uppercase px-4 py-2.5 rounded-md transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--navy)' : 'var(--surface)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${activeTab === tab.key ? 'var(--navy)' : 'var(--border)'}`,
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section
          className="rounded-xl p-5 mb-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--navy)' }}>
            {activeSection.label}
          </p>
          <h2 className="serif text-3xl mb-3" style={{ color: 'var(--text)' }}>
            {activeSection.title}
          </h2>
          <p className="text-sm max-w-2xl" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {activeSection.description}
          </p>
        </section>

        <div
          key={activeTab}
          className={`grid gap-3 mb-10 page-enter ${
            activeSection.cards.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {activeSection.cards.map((card) => (
            <AuctionCard key={card.key} card={card} fullWidth={activeSection.cards.length === 1} />
          ))}
        </div>

        <div
          className="mt-auto border-t pt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <Link
            href="/results"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            View My Results
          </Link>
          <Link
            href="/export"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Export My Data
          </Link>
          <Link
            href="/instructor"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Instructor Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setShowNewQuarter(true)}
            className="text-xs tracking-widest uppercase"
            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            New Quarter
          </button>
        </div>
      </div>

      {showNewQuarter && <NewQuarterModal onClose={() => setShowNewQuarter(false)} />}
    </main>
  )
}

// ── New Quarter Modal ────────────────────────────────────────────────────────

function NewQuarterModal({ onClose }: { onClose: () => void }) {
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

// ── Auction card ─────────────────────────────────────────────────────────────

function AuctionCard({ card, fullWidth = false }: { card: CardDef; fullWidth?: boolean }) {
  const href = card.href ?? `/exp1/${card.key}`
  return (
    <Link href={href} className={`block group ${fullWidth ? 'max-w-xl' : ''}`}>
      <div
        className="rounded-lg p-5 h-full flex flex-col transition-colors duration-150 group-hover:border-[#003660]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              {card.line1}
            </p>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              {card.line2}
            </p>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              {card.line3}
            </p>
          </div>
          <span
            className="text-sm mt-0.5 transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: 'var(--navy)' }}
          >
            →
          </span>
        </div>

        <p className="text-xs flex-1" style={{ color: 'var(--text-muted)', lineHeight: 1.65 }}>
          {card.description}
        </p>
      </div>
    </Link>
  )
}
