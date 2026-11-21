// Feature: habit-haunting, Property 8: Missing a day adds one missed day
// **Validates: Requirements 3.1**
import fc from 'fast-check'
import { describe, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { localDate } from '../test/arbitraries'
import { missedDays } from './streak'
import type { CheckIn, Habit } from './types'

const scenario = fc
  .record({
    createdOn: localDate,
    // today = createdOn + todayOffset, so today is on or after the creation date.
    todayOffset: fc.integer({ min: 0, max: 400 }),
    // Check-in offsets from createdOn; those on/after today are filtered out below.
    // Offsets before the creation date are included to exercise ignored check-ins.
    offsets: fc.array(fc.integer({ min: -30, max: 399 }), { maxLength: 40 }),
    homeRoom: fc.constantFrom('parlor', 'library', 'kitchen', 'bedroom'),
    otherHabit: fc.boolean(),
  })
  .map(({ createdOn, todayOffset, offsets, homeRoom, otherHabit }) => {
    const habit: Habit = { id: 'h1', name: 'Habit', frequency: 'daily', createdOn, homeRoom }
    const today = addDays(createdOn, todayOffset)
    const checkIns: CheckIn[] = offsets
      .filter((o) => o < todayOffset)
      .map((o) => ({ habitId: 'h1', date: addDays(createdOn, o) }))
    if (otherHabit) checkIns.push({ habitId: 'h2', date: today })
    return { habit, today, checkIns }
  })

describe('Property 8: Missing a day adds one missed day', () => {
  it('missedDays(today + 1) = missedDays(today) + 1 when no check-in on today or after', () => {
    fc.assert(
      fc.property(scenario, ({ habit, today, checkIns }) => {
        const tomorrow = addDays(today, 1)
        return missedDays(habit, checkIns, tomorrow) === missedDays(habit, checkIns, today) + 1
      }),
      { numRuns: 100 },
    )
  })
})
