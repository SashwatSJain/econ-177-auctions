import { describe, expect, it, vi } from 'vitest'
import { createMockAdmin, type RecordedCall } from '@/test/mocks/supabase'

const { adminRef } = vi.hoisted(() => ({
  adminRef: { current: null as ReturnType<typeof createMockAdmin>['admin'] | null },
}))
vi.mock('@/lib/supabase-admin', () => ({
  createAdminSupabaseClient: () => adminRef.current,
}))

const { GET } = await import('./route')

describe('GET /api/quarters (public)', () => {
  it('returns the minimal public quarter fields', async () => {
    const rows = [
      { id: 'q1', name: 'Spring 2026', is_active: true },
      { id: 'q0', name: 'Winter 2026', is_active: false },
    ]
    const { admin } = createMockAdmin({ quarters: { data: rows, error: null } })
    adminRef.current = admin

    const res = await GET()
    const body = await res.json()
    expect(body).toEqual(rows)
  })

  it('never exposes class_schedule or other admin-only fields', async () => {
    const { admin, queries } = createMockAdmin({ quarters: { data: [], error: null } })
    adminRef.current = admin

    await GET()
    const selectCall = queries.quarters[0].calls.find((c: RecordedCall) => c.method === 'select')
    expect(selectCall?.args[0]).not.toContain('class_schedule')
  })

  it('degrades to an empty list on error instead of throwing (pre-migration safety)', async () => {
    const { admin } = createMockAdmin({ quarters: { data: null, error: { message: 'relation does not exist' } } })
    adminRef.current = admin

    const res = await GET()
    const body = await res.json()
    expect(body).toEqual([])
  })
})
