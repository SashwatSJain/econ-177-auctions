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

type HomeTabKey = 'exp1' | 'exp2' | 'exp3'

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
    key: 'assignment2',
    line1: 'Experiment 2',
    line2: 'Risk Aversion',
    line3: 'CRRA Elicitation',
    description:
      'Enter indifference probabilities between a lottery and certain payments to estimate class risk preferences.',
    href: '/assignment2',
  },
]

const EXP3_CARDS: CardDef[] = [
  {
    key: 'experiment3',
    line1: 'Experiment 3',
    line2: 'Seller Reserve',
    line3: 'Auction',
    description:
      'Set reserve prices as a seller across four auction blocks with simulated bidder bids.',
    href: '/experiment3',
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
    description: 'The new seller-side reserve-setting experiment with four treatment blocks.',
    cards: EXP3_CARDS,
  },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>('exp1')
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
          className={`grid gap-3 mb-10 ${
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
        </div>
      </div>
    </main>
  )
}

function AuctionCard({ card, fullWidth = false }: { card: CardDef; fullWidth?: boolean }) {
  const href = card.href ?? `/auction/${card.key}`
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
