// Feature: habit-haunting, Property 17: Relic award
// **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { localDate } from '../test/arbitraries'
import { applyCheckIn } from './checkin'
import { MILESTONES } from './constants'
import { evaluateRelics } from './relics'
import { streak } from './streak'
import type { AppData, Habit, Relic } from './types'

type Op = { kind: 'checkIn' } | { kind: 'advance'; days: number }
const ops = fc.array(
  fc.oneof(
    { weight: 6, arbitrary: fc.constant<Op>({ kind: 'checkIn' }) },
    { weight: 1, arbitrary: fc.integer({ min: 1, max: 3 }).map<Op>((days) => ({ kind: 'advance', days })) },
  ),
  { minLength: 1, maxLength: 120 },
)

describe('Property 17: Relic award', () => {
  it('awards at most one relic per habit and milestone, never loses one, and is idempotent', () => {
    fc.assert(
      fc.property(localDate, ops, (start, sequence) => {
        const habit: Habit = { id: 'h1', name: 'Habit', frequency: 'daily', createdOn: start, homeRoom: 'parlor' }
        let data: AppData = { schemaVersion: 1, habits: [habit], checkIns: [], relics: [], nextRoomSeq: 1 }
        let today = start
        let maxStreak = 0
        for (const op of sequence) {
          const previous: Relic[] = data.relics
          if (op.kind === 'advance') today = addDays(today, op.days)
          else {
            const r = applyCheckIn(data, habit.id, today)
            if (r.ok) data = r.value
          }
          const { awarded } = evaluateRelics(data, today)
          data = { ...data, relics: [...data.relics, ...awarded] }
          maxStreak = Math.max(maxStreak, streak(habit, data.checkIns, today))

          for (const m of MILESTONES) {
            const count = data.relics.filter((x) => x.habitId === habit.id && x.milestone === m).length
            expect(count).toBe(maxStreak >= m ? 1 : 0)
          }
          // Existing relics keep milestone and award date.
          expect(data.relics.slice(0, previous.length)).toEqual(previous)
          // Evaluating again awards nothing new.
          expect(evaluateRelics(data, today).awarded).toEqual([])
        }
        return true
      }),
      { numRuns: 100 },
    )
  })
})
