// Feature: habit-haunting, Property 2: Delete removes all traces of a habit
// **Validates: Requirements 1.7**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { appData } from '../test/arbitraries'
import { deleteHabit } from './habits'

describe('Property 2: Delete removes all traces of a habit', () => {
  it('removes the habit, its check-ins, and its relics, and leaves everything else unchanged', () => {
    fc.assert(
      fc.property(
        appData.filter((d) => d.habits.length > 0),
        fc.nat(),
        (data, i) => {
          const target = data.habits[i % data.habits.length]
          const r = deleteHabit(data, target.id)
          if (!r.ok) return false
          expect(r.value.habits).toEqual(data.habits.filter((h) => h.id !== target.id))
          expect(r.value.checkIns).toEqual(data.checkIns.filter((c) => c.habitId !== target.id))
          expect(r.value.relics).toEqual(data.relics.filter((x) => x.habitId !== target.id))
          expect(r.value.nextRoomSeq).toBe(data.nextRoomSeq)
          return true
        },
      ),
      { numRuns: 100 },
    )
  })
})
