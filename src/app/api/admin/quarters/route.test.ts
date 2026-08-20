import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockAdmin } from '@/test/mocks/supabase'

const { adminRef } = vi.hoisted(() => ({
  adminRef: { current: null as ReturnType<typeof createMockAdmin>['admin'] | null },
}))
vi.mock('@/lib/supabase-admin', () => ({
  createAdminSupabaseClient: () => adminRef.current,
}))

const { POST } = await import('./route')

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/quarters', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/admin/quarters', () => {
  it('creates the new quarter via the atomic create_quarter RPC (regression: was a two-step deactivate+insert)', async () => {
    const { admin, rpcCalls } = createMockAdmin({})
    admin.__setRpcResult('create_quarter', {
      data: { id: 'q-new', name: 'Fall 2026', is_active: true, class_schedule: null, created_at: '2026-09-01' },
      error: null,
    })
    adminRef.current = admin

    const res = await POST(jsonRequest({ name: 'Fall 2026' }))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.name).toBe('Fall 2026')
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].method).toBe('create_quarter')
    expect(rpcCalls[0].args[0]).toEqual({ p_name: 'Fall 2026', p_class_schedule: null })
  })

  it('passes a validated class_schedule through to the RPC', async () => {
    const { admin, rpcCalls } = createMockAdmin({})
    admin.__setRpcResult('create_quarter', {
      data: { id: 'q-new', name: 'Fall 2026', is_active: true, class_schedule: null, created_at: '2026-09-01' },
      error: null,
    })
    adminRef.current = admin

    const schedule = { days: [1, 3], start: '10:00', end: '10:50' }
    await POST(jsonRequest({ name: 'Fall 2026', class_schedule: schedule }))

    expect(rpcCalls[0].args[0]).toEqual({ p_name: 'Fall 2026', p_class_schedule: schedule })
  })

  it('rejects a missing name without calling the database', async () => {
    const { admin, rpcCalls } = createMockAdmin({})
    adminRef.current = admin

    const res = await POST(jsonRequest({}))
    expect(res.status).toBe(400)
    expect(rpcCalls).toHaveLength(0)
  })

  it('rejects a malformed class_schedule without calling the database', async () => {
    const { admin, rpcCalls } = createMockAdmin({})
    adminRef.current = admin

    const res = await POST(jsonRequest({ name: 'Fall 2026', class_schedule: { days: ['not-a-number'] } }))
    expect(res.status).toBe(400)
    expect(rpcCalls).toHaveLength(0)
  })

  it('surfaces a database error as a 500 instead of throwing', async () => {
    const { admin } = createMockAdmin({})
    admin.__setRpcResult('create_quarter', { data: null, error: { message: 'boom' } })
    adminRef.current = admin

    const res = await POST(jsonRequest({ name: 'Fall 2026' }))
    expect(res.status).toBe(500)
  })
})
