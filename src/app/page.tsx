import Link from 'next/link'

interface CardDef {
  key: string
  line1: string
  line2: string
  line3: string
  description: string
  comingSoon?: boolean
}

const CARDS: CardDef[] = [
  {
    key: 'first-2',
    line1: 'First Price',
    line2: 'Sealed Bid',
    line3: '2-Bidder',
    description:
      'Students receive a random private value (0–100) and submit a sealed bid.',
  },
  {
    key: 'first-5',
    line1: 'First Price',
    line2: 'Sealed Bid',
    line3: '5-Bidder',
    description:
      'Same as the 2-bidder version but with 5 competing bidders.',
  },
  {
    key: 'second-2',
    line1: 'Second Price',
    line2: 'Sealed Bid',
    line3: '2-Bidder',
    description:
      'Vickrey-style auction with 2 bidders.',
  },
  {
    key: 'second-5',
    line1: 'Second Price',
    line2: 'Sealed Bid',
    line3: '5-Bidder',
    description:
      'Vickrey-style auction with 5 bidders.',
  },
  {
    key: 'first-2-entry25',
    line1: 'First Price',
    line2: '2-Bidder',
    line3: '$25 Entry Fee',
    description:
      'First-price sealed bid with a $25 entry fee.',
  },
  {
    key: 'second-2-entry25',
    line1: 'Second Price',
    line2: '2-Bidder',
    line3: '$25 Entry Fee',
    description:
      'Second-price sealed bid with a $25 entry fee.',
  },
  {
    key: 'first-2-reserve50',
    line1: 'First Price',
    line2: '2-Bidder',
    line3: '$50 Reserve',
    description:
      'First-price sealed bid with a $50 reserve price.',
  },
  {
    key: 'second-2-reserve50',
    line1: 'Second Price',
    line2: '2-Bidder',
    line3: '$50 Reserve',
    description:
      'Second-price sealed bid with a $50 reserve price.',
  },
  {
    key: 'common-value',
    line1: 'Common Value',
    line2: "Winner's",
    line3: 'Curse',
    description:
      "All bidders receive noisy signals of a common value. Explore overbidding and the winner's curse.",
    comingSoon: true,
  },
]


export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--navy)' }}>
            UC Santa Barbara · Econ 177
          </p>
          <h1 className="serif text-5xl" style={{ color: 'var(--text)' }}>
            Auction Experiments
          </h1>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {CARDS.map((card) =>
            card.comingSoon ? (
              <ComingSoonCard key={card.key} card={card} />
            ) : (
              <AuctionCard key={card.key} card={card} />
            )
          )}
        </div>

        {/* Footer links */}
        <div
          className="border-t pt-5 grid gap-3 sm:grid-cols-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <Link
            href="/results"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            View My Results →
          </Link>
          <Link
            href="/export"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Export My Data →
          </Link>
          <Link
            href="/instructor"
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Instructor Dashboard →
          </Link>
        </div>
      </div>
    </main>
  )
}

function AuctionCard({ card }: { card: CardDef }) {
  return (
    <Link href={`/auction/${card.key}`} className="block group">
      <div
        className="rounded-lg p-5 h-full flex flex-col transition-colors duration-150 group-hover:border-[#003660]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Title row with inline arrow */}
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

function ComingSoonCard({ card }: { card: CardDef }) {
  return (
    <div
      className="rounded-lg p-5 flex items-center justify-between sm:col-span-2 opacity-50"
      style={{ border: '1px dashed var(--border)' }}
    >
      <div>
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
          {card.line1} · {card.line2} {card.line3}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {card.description}
        </p>
      </div>
      <span
        className="text-xs px-2 py-0.5 rounded ml-6 shrink-0"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        Coming Soon
      </span>
    </div>
  )
}
