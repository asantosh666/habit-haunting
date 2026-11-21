// Feature: habit-haunting, Property 23: Demo date control
// **Validates: Requirements 8.7, 8.8**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { deriveHabitState } from '../engine/streak'
import { MemoryStorageAdapter } from '../persistence/storage'
import { appData, localDate } from '../test/arbitraries'
import { DemoClock } from './clock'

describe('Property 23: Demo date control', () => {
  it('after k single-step advances the clock returns addDays(base, k) and derived state matches a direct computation', () => {
    fc.assert(
      fc.property(localDate, fc.integer({ min: 0, max: 30 }), appData, (base, k, data) => {
        const storage = new MemoryStorageAdapter()
        const clock = new DemoClock({ today: () => base }, storage)
        for (let i = 0; i <= k; i++) {
          expect(clock.today()).toBe(addDays(base, i))
          expect(clock.offsetDays).toBe(i)
          for (const h of data.habits) {
            expect(deriveHabitState(h, data.checkIns, clock.today()!)).toEqual(
              deriveHabitState(h, data.checkIns, addDays(base, i)),
            )
          }
          if (i < k) clock.advanceOneDay()
        }
        // The offset survives a reload through its own storage key.
        expect(new DemoClock({ today: () => base }, storage).today()).toBe(addDays(base, k))
        return true
      }),
      { numRuns: 100 },
    )
  })
})
