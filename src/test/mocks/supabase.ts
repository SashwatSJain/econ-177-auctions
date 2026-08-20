// Minimal chainable mock of the subset of the supabase-js query builder used by
// this app's routes. Not a full reimplementation — just enough to drive route
// logic and record which filters were applied, without hitting a real database.

export type QueryResult<T = unknown> = { data: T; error: { message: string } | null }

export type RecordedCall = { method: string; args: unknown[] }

const CHAIN_METHODS = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'is', 'not', 'in', 'order', 'limit', 'range',
]

export type MockQuery<T = unknown> = Promise<QueryResult<T>> & {
  calls: RecordedCall[]
  [method: string]: unknown
}

export function createQuery<T = unknown>(result: QueryResult<T>): MockQuery<T> {
  const calls: RecordedCall[] = []
  const promise = Promise.resolve(result)

  const builder = { calls } as MockQuery<T>

  for (const method of CHAIN_METHODS) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  for (const method of ['single', 'maybeSingle']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return promise
    }
  }

  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

  return builder
}

/**
 * Builds a fake admin client. `resultsByTable[table]` can be a single QueryResult
 * (returned every time that table is queried) or an array (consumed in call order —
 * useful when a route queries the same table twice for different purposes).
 */
export function createMockAdmin(resultsByTable: Record<string, QueryResult<unknown> | QueryResult<unknown>[]>) {
  const fromCalls: string[] = []
  const consumedIndex: Record<string, number> = {}
  const queries: Record<string, MockQuery[]> = {}
  const rpcResults: Record<string, QueryResult<unknown>> = {}
  const rpcCalls: RecordedCall[] = []

  const admin = {
    from(table: string) {
      fromCalls.push(table)
      const entry = resultsByTable[table] ?? { data: null, error: null }
      const idx = consumedIndex[table] ?? 0
      const result = Array.isArray(entry) ? entry[Math.min(idx, entry.length - 1)] : entry
      consumedIndex[table] = idx + 1
      const q = createQuery(result)
      queries[table] = queries[table] ?? []
      queries[table].push(q)
      return q
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ method: name, args: [args] })
      const result = rpcResults[name] ?? { data: null, error: null }
      const q = createQuery(result)
      queries[`rpc:${name}`] = queries[`rpc:${name}`] ?? []
      queries[`rpc:${name}`].push(q)
      return q
    },
    __setRpcResult(name: string, result: QueryResult<unknown>) {
      rpcResults[name] = result
    },
  }

  return { admin, fromCalls, queries, rpcCalls }
}

export function findCall(calls: RecordedCall[], method: string) {
  return calls.filter((c) => c.method === method)
}
