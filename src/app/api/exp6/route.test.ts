import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockAdmin, findCall } from '@/test/mocks/supabase'

const { adminRef, resolveQuarterIdMock, getActiveQuarterIdMock } = vi.hoisted(() => ({
  adminRef: { current: null as ReturnType<typeof createMockAdmin>['admin'] | null },
  resolveQuarterIdMock: vi.fn(),
  getActiveQuarterIdMock: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  createAdminSupabaseClient: () => adminRef.current,
}))
vi.mock('@/lib/get-quarter-id', () => ({
  resolveQuarterId: resolveQuarterIdMock,
  getActiveQuarterId: getActiveQuarterIdMock,
}))

// Import after mocks are registered.
const { GET, DELETE } = await import('./route')

beforeEach(() => {
  resolveQuarterIdMock.mockReset()
  getActiveQuarterIdMock.mockReset()
})

describe('GET /api/exp6', () => {
  it('resolves the quarter from the request and filters rows by it (regression: was hardcoded to active quarter)', async () => {
    resolveQuarterIdMock.mockResolvedValue('q-archived')
    const { admin, queries } = createMockAdmin({
      exp6_allpay: { data: [], error: null },
    })
    adminRef.current = admin

    const req = new NextRequest('http://localhost/api/exp6?num_bidders=5&quarter=q-archived')
    await GET(req)

    expect(resolveQuarterIdMock).toHaveBeenCalledWith(admin, 'q-archived')
    const calls = queries.exp6_allpay[0].calls
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['quarter_id', 'q-archived'] })
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['num_bidders', 5] })
  })

  it('falls back to the active quarter when no ?quarter= is given', async () => {
    resolveQuarterIdMock.mockResolvedValue('q-active')
    const { admin } = createMockAdmin({
      exp6_allpay: { data: [], error: null },
    })
    adminRef.current = admin

    const req = new NextRequest('http://localhost/api/exp6?num_bidders=2')
    await GET(req)

    expect(resolveQuarterIdMock).toHaveBeenCalledWith(admin, null)
  })
})

describe('DELETE /api/exp6 (reset by num_bidders)', () => {
  it('scopes the bulk reset to the active quarter (regression: previously wiped every quarter)', async () => {
    getActiveQuarterIdMock.mockResolvedValue('q-active')
    const { admin, queries } = createMockAdmin({
      exp6_allpay: { data: null, error: null },
    })
    adminRef.current = admin

    const req = new NextRequest('http://localhost/api/exp6?num_bidders=10')
    const res = await DELETE(req)

    expect(res.status).toBe(200)
    const calls = queries.exp6_allpay[0].calls
    expect(findCall(calls, 'delete')).toHaveLength(1)
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['quarter_id', 'q-active'] })
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['num_bidders', 10] })
  })
})
