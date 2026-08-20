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

const { DELETE } = await import('./route')

beforeEach(() => {
  resolveQuarterIdMock.mockReset()
  getActiveQuarterIdMock.mockReset()
})

describe('DELETE /api/beta/cv-auction (reset by variant)', () => {
  it('scopes the bulk reset to the active quarter (regression: previously wiped every quarter)', async () => {
    getActiveQuarterIdMock.mockResolvedValue('q-active')
    const { admin, queries } = createMockAdmin({
      beta_cv_auction: { data: null, error: null },
    })
    adminRef.current = admin

    const req = new NextRequest('http://localhost/api/beta/cv-auction?variant=integer')
    const res = await DELETE(req)

    expect(res.status).toBe(200)
    const calls = queries.beta_cv_auction[0].calls
    expect(findCall(calls, 'delete')).toHaveLength(1)
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['quarter_id', 'q-active'] })
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['variant', 'integer'] })
    expect(findCall(calls, 'eq')).toContainEqual({ method: 'eq', args: ['session_key', 'default'] })
  })

  it('still resets even when there is no active quarter (defensive: no quarter_id filter applied)', async () => {
    getActiveQuarterIdMock.mockResolvedValue(null)
    const { admin, queries } = createMockAdmin({
      beta_cv_auction: { data: null, error: null },
    })
    adminRef.current = admin

    const req = new NextRequest('http://localhost/api/beta/cv-auction')
    await DELETE(req)

    const calls = queries.beta_cv_auction[0].calls
    expect(findCall(calls, 'eq').some((c) => c.args[0] === 'quarter_id')).toBe(false)
  })
})
