// Feature: habit-haunting, Property 21: Persistence round trip
// **Validates: Requirements 9.1, 9.2**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { appData } from '../test/arbitraries'
import { load, save } from './persistence'
import { MemoryStorageAdapter } from './storage'

describe('Property 21: Persistence round trip', () => {
  it('load(save(data)) deeply equals the original', () => {
    fc.assert(
      fc.property(appData, (data) => {
        const adapter = new MemoryStorageAdapter()
        expect(save(adapter, data).ok).toBe(true)
        expect(load(adapter)).toEqual({ kind: 'ok', data })
        return true
      }),
      { numRuns: 100 },
    )
  })
})
