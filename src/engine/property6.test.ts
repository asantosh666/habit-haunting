// Feature: habit-haunting, Property 6: Check-in post-conditions
// **Validates: Requirements 2.1, 2.3, 3.6, 4.3, 8.6**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { appData } from '../test/arbitraries'
import { applyCheckIn } from './checkin'
import { ghostOpacity, ghostSize } from './ghost'
import { deriveHabitState } from './streak'

const scenario = fc
  .record({
    data: appData.filter((d) => d.habits.length > 0),
    pick: fc.nat(),
    offset: fc.integer({ min: 0, max: 60 }),
  })
  .map(({ data, pick, offset }) => {
    const habit = data.habits[pick % data.habits.length]
    return { data, habit, today: addDays(habit.createdOn, offset) }
  })
  .filter(({ data, habit, today }) => !data.checkIns.some((c) => c.habitId === habit.id && c.date === today))

describe('Property 6: Check-in post-conditions', () => {
  it('adds one check-in, streak +1, no ghost, not haunted, and ghost never grows', () => {
    fc.assert(
      fc.property(scenario, ({ data, habit, today }) => {
        const r = applyCheckIn(data, habit.id, today)
        if (!r.ok) return false
        const before = deriveHabitState(habit, data.checkIns, today)
        const after = deriveHabitState(habit, r.value.checkIns, today)
        expect(r.value.checkIns).toHaveLength(data.checkIns.length + 1)
        expect(r.value.checkIns.filter((c) => c.habitId === habit.id && c.date === today)).toHaveLength(1)
        expect(after.streak).toBe(before.streak + 1)
        expect(after.missedDays).toBe(0)
        expect(after.ghostLevel).toBe(0)
        expect(after.ghostRoom).toBeNull()
        expect(after.haunted).toBe(false)
        if (before.ghostLevel > 0) {
          expect(after.ghostLevel).toBeLessThan(before.ghostLevel)
          expect(ghostSize(after.ghostLevel)).toBeLessThanOrEqual(ghostSize(before.ghostLevel))
          expect(ghostOpacity(after.ghostLevel)).toBeLessThanOrEqual(ghostOpacity(before.ghostLevel))
        }
        return true
      }),
      { numRuns: 150 },
    )
  })
})
