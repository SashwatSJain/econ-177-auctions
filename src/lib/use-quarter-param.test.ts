import { describe, expect, it } from 'vitest'
import { withQuarter } from './use-quarter-param'

describe('withQuarter', () => {
  it('returns the url unchanged when quarter is null', () => {
    expect(withQuarter('/api/exp6?num_bidders=2', null)).toBe('/api/exp6?num_bidders=2')
  })

  it('appends ?quarter= when the url has no existing query string', () => {
    expect(withQuarter('/api/experiment4', 'q-1')).toBe('/api/experiment4?quarter=q-1')
  })

  it('appends &quarter= when the url already has query params', () => {
    expect(withQuarter('/api/exp6?num_bidders=2', 'q-1')).toBe('/api/exp6?num_bidders=2&quarter=q-1')
  })

  it('URL-encodes the quarter id', () => {
    expect(withQuarter('/api/quarters', 'a b&c')).toBe('/api/quarters?quarter=a%20b%26c')
  })
})
