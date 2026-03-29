import Link from 'next/link'
import { AUCTION_CONFIGS } from '@/lib/auction-config'

export default function HomePage() {
  const firstPrice = AUCTION_CONFIGS.filter((a) => a.key.startsWith('first'))
  const secondPrice = AUCTION_CONFIGS.filter((a) => a.key.startsWith('second'))

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-14">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--gold)' }}>
            Econ 177
          </p>
          <h1 className="serif text-5xl mb-4" style={{ color: 'var(--text)' }}>
            Auction Lab
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Select your auction experiment below. You will be assigned a private value and
            complete 10 bidding rounds.
          </p>
        </div>

        {/* First Price */}
        <section className="mb-10">
          <h2
            className="text-xs tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            First Price Sealed Bid
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {firstPrice.map((a) => (
              <AuctionCard key={a.key} config={a} />
            ))}
          </div>
        </section>

        {/* Second Price */}
        <section className="mb-14">
          <h2
            className="text-xs tracking-widest uppercase mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Second Price Sealed Bid
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {secondPrice.map((a) => (
              <AuctionCard key={a.key} config={a} />
            ))}
          </div>
        </section>

        {/* Instructor link */}
        <div
          className="border-t pt-8 flex justify-end"
          style={{ borderColor: 'var(--border)' }}
        >
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

function AuctionCard({ config }: { config: (typeof AUCTION_CONFIGS)[number] }) {
  const tags: string[] = []
  if (config.entryFee) tags.push(`$${config.entryFee} entry fee`)
  if (config.reservePrice) tags.push(`$${config.reservePrice} reserve`)

  return (
    <Link href={`/auction/${config.key}`} className="block group">
      <div
        className="rounded-lg p-5 transition-all duration-200 group-hover:border-[#c9a84c]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {config.shortTitle}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}
          >
            {config.bidders} bidder{config.bidders > 1 ? 's' : ''}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {config.nashDescription}
        </p>
      </div>
    </Link>
  )
}
