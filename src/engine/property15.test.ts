// Feature: habit-haunting, Property 15: Today list and week view
// **Validates: Requirements 5.2, 5.3**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays, diffDays } from '../dates/localDate'
import { appData, localDate } from '../test/arbitraries'
import { buildDashboardViewModel } from './dashboard'
import { validCheckIns } from './streak'

describe('Property 15: Today list and week view', () => {
  it('lists every habit once with correct checkedIn, and shows a Monday to Sunday week containing today', () => {
    fc.assert(
      fc.property(appData, localDate, fc.integer({ min: -5, max: 40 }), (data, base, shift) => {
        const today = addDays(base, shift)
        const vm = buildDashboardViewModel(data, today)
        expect(vm.todayList.map((e) => e.habitId)).toEqual(data.habits.map((h) => h.id))
        for (const entry of vm.todayList) {
          const habit = data.habits.find((h) => h.id === entry.habitId)!
          expect(entry.checkedIn).toBe(validCheckIns(habit, data.checkIns, today).includes(today))
        }
        const { days } = vm.week
        expect(days).toHaveLength(7)
        expect(days).toContain(today)
        days.forEach((d, i) => expect(diffDays(d, days[0])).toBe(i))
        // Monday: the day before the first day of the next week is a Sunday, so the first day is 6 days before the last.
        expect(diffDays(days[6], days[0])).toBe(6)
        return true
      }),
      { numRuns: 100 },
    )
  })
})
