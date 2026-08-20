import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockAdmin, findCall } from '@/test/mocks/supabase'

const { adminRef, resolveQuarterIdMock } = vi.hoisted(() => ({
  adminRef: { current: null as ReturnType<typeof createMockAdmin>['admin'] | null },
  resolveQuarterIdMock: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  createAdminSupabaseClient: () => adminRef.current,
}))
vi.mock('@/lib/get-quarter-id', () => ({
  resolveQuarterId: resolveQuarterIdMock,
  getActiveQuarterId: vi.fn(),
}))

const { GET } = await import('./route')

beforeEach(() => {
  resolveQuarterIdMock.mockReset()
})

// A student in the currently-viewed quarter (Q1) was assigned two samples:
// one referencing another Q1 response ('rb', legitimate), and one left over
// from a stale assignment made back when the ref row still belonged to Q1
// but has since been re-parented to Q0 in this fixture to simulate a prior
// quarter's leftover ref. The route should drop the Q0 one.
describe('GET /api/experiment4 (regression: cross-quarter sample leakage)', () => {
  it('excludes samples whose referenced response belongs to a different quarter', async () => {
    resolveQuarterIdMock.mockResolvedValue('Q1')

    const mainRows = [{ id: 'ra', student_id: 's1', quarter_id: 'Q1' }]
    const rawSamples = [
      { student_id: 's1', ref_id: 'rb', created_at: '2026-01-02', experiment4_responses: [{ quarter_id: 'Q1' }] },
      { student_id: 's1', ref_id: 'rc', created_at: '2026-01-01', experiment4_responses: [{ quarter_id: 'Q0' }] },
    ]
    const refRows = [{ id: 'rb', student_id: 's2', estimate: 42, bid_10: 7 }]

    const { admin, queries } = createMockAdmin({
      experiment4_responses: [
        { data: mainRows, error: null },
        { data: refRows, error: null },
      ],
      experiment4_samples: { data: rawSamples, error: null },
    })
    adminRef.current = admin

    const res = await GET(new NextRequest('http://localhost/api/experiment4?quarter=Q1'))
    const body = await res.json()

    // The stale ref ('rc', Q0) must never reach the second query.
    const refRowsCall = queries.experiment4_responses[1].calls
    const inCall = findCall(refRowsCall, 'in')[0]
    expect(inCall.args).toEqual(['id', ['rb']])

    const s1 = body.find((r: { student_id: string }) => r.student_id === 's1')
    expect(s1.sample).toEqual([{ student_id: 's2', estimate: 42, bid_10: 7 }])
    // download timestamp should come from the legitimate (Q1) sample, not either indiscriminately
    expect(s1.downloaded_at).toBe('2026-01-02')
  })

  it('does not filter samples when no quarter can be resolved', async () => {
    resolveQuarterIdMock.mockResolvedValue(null)

    const rawSamples = [
      { student_id: 's1', ref_id: 'rb', created_at: '2026-01-02', experiment4_responses: [{ quarter_id: 'Q1' }] },
    ]
    const { admin, queries } = createMockAdmin({
      experiment4_responses: [
        { data: [], error: null },
        { data: [{ id: 'rb', student_id: 's2', estimate: 1, bid_10: 1 }], error: null },
      ],
      experiment4_samples: { data: rawSamples, error: null },
    })
    adminRef.current = admin

    await GET(new NextRequest('http://localhost/api/experiment4'))

    const inCall = findCall(queries.experiment4_responses[1].calls, 'in')[0]
    expect(inCall.args).toEqual(['id', ['rb']])
  })
})
