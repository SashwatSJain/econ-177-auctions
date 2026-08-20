import { describe, expect, it } from 'vitest'
import { getActiveQuarterId, resolveQuarterId } from './get-quarter-id'
import { createMockAdmin } from '@/test/mocks/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('getActiveQuarterId', () => {
  it('returns the id of the active quarter', async () => {
    const { admin } = createMockAdmin({
      quarters: { data: { id: 'q-active' }, error: null },
    })
    const id = await getActiveQuarterId(admin as unknown as SupabaseClient)
    expect(id).toBe('q-active')
  })

  it('returns null when there is no active quarter', async () => {
    const { admin } = createMockAdmin({
      quarters: { data: null, error: null },
    })
    const id = await getActiveQuarterId(admin as unknown as SupabaseClient)
    expect(id).toBeNull()
  })

  it('filters on is_active = true', async () => {
    const { admin, queries } = createMockAdmin({
      quarters: { data: { id: 'q-active' }, error: null },
    })
    await getActiveQuarterId(admin as unknown as SupabaseClient)
    const calls = queries.quarters[0].calls
    expect(calls).toContainEqual({ method: 'eq', args: ['is_active', true] })
  })
})

describe('resolveQuarterId', () => {
  it('returns the given quarter param without touching the database', async () => {
    const { admin, fromCalls } = createMockAdmin({})
    const id = await resolveQuarterId(admin as unknown as SupabaseClient, 'q-archived')
    expect(id).toBe('q-archived')
    expect(fromCalls).toHaveLength(0)
  })

  it('falls back to the active quarter when no param is given', async () => {
    const { admin } = createMockAdmin({
      quarters: { data: { id: 'q-active' }, error: null },
    })
    const id = await resolveQuarterId(admin as unknown as SupabaseClient, null)
    expect(id).toBe('q-active')
  })

  it('falls back to the active quarter for an empty string param', async () => {
    const { admin } = createMockAdmin({
      quarters: { data: { id: 'q-active' }, error: null },
    })
    const id = await resolveQuarterId(admin as unknown as SupabaseClient, '')
    expect(id).toBe('q-active')
  })
})
