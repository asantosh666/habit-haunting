// Feature: habit-haunting, Property 22: Demo house shape
// **Validates: Requirements 8.4**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { localDate } from '../test/arbitraries'
import { buildDashboardViewModel } from './dashboard'
import { buildDemoHouse } from './seed'
import { missedDays } from './streak'

describe('Property 22: Demo house shape', () => {
  it('has 3 to 6 habits, at least one with 3+ missed days, and is deterministic', () => {
    fc.assert(
      fc.property(localDate, (today) => {
        const house = buildDemoHouse(today)
        expect(house.habits.length).toBeGreaterThanOrEqual(3)
        expect(house.habits.length).toBeLessThanOrEqual(6)
        expect(house.habits.some((h) => missedDays(h, house.checkIns, today) >= 3)).toBe(true)
        expect(buildDemoHouse(today)).toEqual(house)
        // Every stored check-in is valid for the engine, so the data is consistent.
        const ids = new Set(house.habits.map((h) => h.id))
        expect(ids.size).toBe(house.habits.length)
        expect(house.checkIns.every((c) => ids.has(c.habitId))).toBe(true)
        expect(buildDashboardViewModel(house, today).isEmpty).toBe(false)
        return true
      }),
      { numRuns: 100 },
    )
  })
})
