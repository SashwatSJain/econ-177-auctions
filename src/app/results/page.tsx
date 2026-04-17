import type { Metadata } from 'next'
import Link from 'next/link'

import ResultsDashboard from '@/components/ResultsDashboard'
import { buildExperiment3StudentResultsDashboard } from '@/lib/experiment3-results'
import { AUCTION_CONFIGS } from '@/lib/auction-config'
import { buildStudentResultsDashboard } from '@/lib/results'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { Bid, Experiment3Round } from '@/lib/types'

const auctionKeys = AUCTION_CONFIGS.map((config) => config.key)

// Module-level in-memory cache. unstable_cache has a 2 MB ceiling; class bids
// exceed that. Storing the promise itself means concurrent empty-cache requests
// share the same fetch rather than stampeding the database.
const CLASS_BIDS_TTL_MS = 60_000
let classBidsCache: { promise: Promise<Bid[]>; expiresAt: number } | null = null

function getClassBids(): Promise<Bid[]> {
  if (classBidsCache && Date.now() < classBidsCache.expiresAt) {
    return classBidsCache.promise
  }
  const supabase = createAdminSupabaseClient()
  const promise = fetchAllClassBids(supabase, auctionKeys).catch((err) => {
    // Don't cache failures — next request should retry immediately.
    classBidsCache = null
    throw err
  })
  classBidsCache = { promise, expiresAt: Date.now() + CLASS_BIDS_TTL_MS }
  return promise
}

export const metadata: Metadata = {
  title: 'Auction Results Feedback — UCSB Econ 177',
  description: 'Retro feedback for auction experiments, including Nash and class comparisons.',
}

interface ResultsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const resolvedSearchParams = await searchParams
  const rawPerm = firstValue(resolvedSearchParams.perm)
  const trimmedPerm = rawPerm?.trim() ?? ''
  const normalizedPerm = trimmedPerm.toLowerCase()

  let dashboard = null
  let experiment3Dashboard = null
  let message: string | null = null
  let messageTone: 'empty' | 'error' | null = null

  // Kick off the class bids fetch unconditionally so the empty page load warms
  // the cache. Swallow failures here — they'll surface properly if perm is submitted.
  void getClassBids().catch(() => {})

  if (normalizedPerm) {
    try {
      const supabase = createAdminSupabaseClient()

      const [
        { data: studentRows, error: studentError },
        { data: experiment3Rows, error: experiment3Error },
        classRows,
      ] = await Promise.all([
        supabase
          .from('bids')
          .select('*')
          .eq('student_id', normalizedPerm)
          .in('auction_type', auctionKeys)
          .order('auction_type', { ascending: true })
          .order('round', { ascending: true })
          .limit(200),
        supabase
          .from('experiment3_rounds')
          .select('*')
          .eq('student_id', normalizedPerm)
          .order('global_round', { ascending: true }),
        getClassBids(),
      ])

      if (studentError) throw studentError
      if (experiment3Error) throw experiment3Error

      if ((!studentRows || studentRows.length === 0) && (!experiment3Rows || experiment3Rows.length === 0)) {
        message = `No experiment records were found for perm ${trimmedPerm}.`
        messageTone = 'empty'
      } else {
        if (studentRows && studentRows.length > 0) {
          dashboard = buildStudentResultsDashboard(
            normalizedPerm,
            studentRows as Bid[],
            classRows as Bid[]
          )
        }

        if (experiment3Rows && experiment3Rows.length > 0) {
          experiment3Dashboard = buildExperiment3StudentResultsDashboard(
            experiment3Rows as Experiment3Round[]
          )
        }
      }
    } catch (error) {
      message = error instanceof Error ? error.message : 'Something went wrong while loading results.'
      messageTone = 'error'
    }
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Link
          href="/"
          className="text-xs tracking-widest uppercase mb-6 inline-block"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back
        </Link>

        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--navy)' }}>
            UC Santa Barbara · Econ 177
          </p>
          <h1 className="serif text-5xl" style={{ color: 'var(--text)' }}>
            Results &amp; Feedback
          </h1>
        </div>

        <div className="max-w-sm mb-10">
          <form action="/results" method="get" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="perm"
                className="text-xs tracking-widest uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Perm Number
              </label>
              <input
                id="perm"
                name="perm"
                type="text"
                defaultValue={trimmedPerm}
                placeholder="e.g. 1234567"
                autoComplete="off"
                spellCheck={false}
                className="rounded-md px-3 py-2 text-sm outline-none"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <button type="submit" className="btn-gold rounded-md px-4 py-2 text-sm">
              Load My Feedback
            </button>
          </form>

          {message ? (
            <p
              className="mt-4 text-sm"
              style={{
                color: messageTone === 'error' ? '#c0392b' : 'var(--text-muted)',
              }}
            >
              {message}
            </p>
          ) : null}
        </div>

        {dashboard || experiment3Dashboard ? (
          <ResultsDashboard
            dashboard={dashboard}
            experiment3Dashboard={experiment3Dashboard}
          />
        ) : null}
      </div>
    </main>
  )
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function fetchAllClassBids(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  auctionKeys: string[]
) {
  const pageSize = 1000
  const allRows: Bid[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .in('auction_type', auctionKeys)
      .order('auction_type', { ascending: true })
      .order('round', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allRows.push(...(data as Bid[]))

    if (data.length < pageSize) break
    from += pageSize
  }

  return allRows
}
