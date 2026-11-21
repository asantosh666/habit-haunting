// Feature: habit-haunting, Property 18: Relic list ordering
// **Validates: Requirements 6.4**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { localDate } from '../test/arbitraries'
import { sortRelics } from './relics'
import type { Milestone, Relic } from './types'

const relic: fc.Arbitrary<Relic> = fc.record({
  habitId: fc.constantFrom('a', 'b', 'c'),
  milestone: fc.constantFrom<Milestone>(7, 30),
  awardedOn: localDate,
})

describe('Property 18: Relic list ordering', () => {
  it('returns the same elements ordered by awardedOn descending', () => {
    fc.assert(
      fc.property(fc.array(relic, { maxLength: 30 }), (relics) => {
        const before = structuredClone(relics)
        const sorted = sortRelics(relics)
        expect(relics).toEqual(before)
        expect(sorted).toHaveLength(relics.length)
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1].awardedOn >= sorted[i].awardedOn).toBe(true)
        }
        const key = (r: Relic) => `${r.habitId}|${r.milestone}|${r.awardedOn}`
        expect(sorted.map(key).sort()).toEqual(relics.map(key).sort())
        return true
      }),
      { numRuns: 100 },
    )
  })
})
