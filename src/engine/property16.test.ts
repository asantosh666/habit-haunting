// Feature: habit-haunting, Property 16: Graveyard cell marking
// **Validates: Requirements 5.4**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { appData, localDate } from '../test/arbitraries'
import { buildDashboardViewModel } from './dashboard'

describe('Property 16: Graveyard cell marking', () => {
  it('marks none before creation or after today, otherwise checked or missed', () => {
    fc.assert(
      fc.property(appData, localDate, fc.integer({ min: -5, max: 40 }), (data, base, shift) => {
        const today = addDays(base, shift)
        const vm = buildDashboardViewModel(data, today)
        expect(vm.week.rows.map((r) => r.habitId)).toEqual(data.habits.map((h) => h.id))
        for (const row of vm.week.rows) {
          const habit = data.habits.find((h) => h.id === row.habitId)!
          expect(row.cells).toHaveLength(7)
          vm.week.days.forEach((d, i) => {
            const has = data.checkIns.some((c) => c.habitId === habit.id && c.date === d)
            const expected = d > today || d < habit.createdOn ? 'none' : has ? 'checked' : 'missed'
            expect(row.cells[i]).toBe(expected)
          })
        }
        return true
      }),
      { numRuns: 100 },
    )
  })
})
