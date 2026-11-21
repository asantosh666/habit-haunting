// Feature: habit-haunting, Property 7: Duplicate check-in is a no-op
// **Validates: Requirements 2.4**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { appData } from '../test/arbitraries'
import { applyCheckIn } from './checkin'

describe('Property 7: Duplicate check-in is a no-op', () => {
  it('returns ALREADY_CHECKED_IN and leaves the data equal to the input', () => {
    fc.assert(
      fc.property(
        appData.filter((d) => d.checkIns.length > 0),
        fc.nat(),
        (data, i) => {
          const existing = data.checkIns[i % data.checkIns.length]
          const before = structuredClone(data)
          const r = applyCheckIn(data, existing.habitId, existing.date)
          expect(r).toEqual({ ok: false, error: 'ALREADY_CHECKED_IN' })
          expect(data).toEqual(before)
          return true
        },
      ),
      { numRuns: 100 },
    )
  })
})
