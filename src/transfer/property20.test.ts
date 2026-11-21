// Feature: habit-haunting, Property 20: Invalid import is rejected without side effects
// **Validates: Requirements 7.5**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { save, STORAGE_KEY } from '../persistence/persistence'
import { MemoryStorageAdapter } from '../persistence/storage'
import { appData, corruptedExport } from '../test/arbitraries'
import { parseExport } from './transfer'

describe('Property 20: Invalid import is rejected without side effects', () => {
  it('returns the matching error code and leaves stored data unchanged', () => {
    fc.assert(
      fc.property(corruptedExport, appData, ({ text, expected }, stored) => {
        const adapter = new MemoryStorageAdapter()
        save(adapter, stored)
        const before = adapter.get(STORAGE_KEY)
        expect(parseExport(text)).toEqual({ ok: false, error: expected })
        expect(adapter.get(STORAGE_KEY)).toBe(before)
        return true
      }),
      { numRuns: 200 },
    )
  })
})
