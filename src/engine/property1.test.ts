// Feature: habit-haunting, Property 1: Habit name validation and edit semantics
// **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { appData, habitName, localDate } from '../test/arbitraries'
import { addHabit, renameHabit, validateHabitName } from './habits'

const padding = fc.stringMatching(/^[ \t\n]{0,5}$/)
const anyName = fc.oneof(fc.string({ maxLength: 130 }), fc.tuple(padding, habitName, padding).map((p) => p.join('')))
const validRaw = fc.tuple(padding, habitName, padding).map((p) => p.join(''))
const invalidRaw = fc.oneof(
  padding,
  fc.tuple(padding, fc.string({ minLength: 101, maxLength: 130 }), padding).map((p) => p.join('')).filter((s) => s.trim().length > 100),
)

describe('Property 1: Habit name validation and edit semantics', () => {
  it('validateHabitName succeeds iff the trimmed name has 1..100 characters, returning the trimmed name', () => {
    fc.assert(
      fc.property(anyName, (s) => {
        const r = validateHabitName(s)
        const t = s.trim()
        if (t.length >= 1 && t.length <= 100) return r.ok && r.value === t
        return !r.ok && r.error === (t.length === 0 ? 'NAME_REQUIRED' : 'NAME_TOO_LONG')
      }),
      { numRuns: 200 },
    )
  })

  it('addHabit with a valid name stores the trimmed name, daily frequency, and creation date', () => {
    fc.assert(
      fc.property(appData, validRaw, localDate, (data, raw, today) => {
        const r = addHabit(data, raw, today, 'new-habit')
        if (!r.ok) return false
        const added = r.value.habits[r.value.habits.length - 1]
        return (
          r.value.habits.length === data.habits.length + 1 &&
          added.name === raw.trim() &&
          added.frequency === 'daily' &&
          added.createdOn === today
        )
      }),
      { numRuns: 100 },
    )
  })

  it('renameHabit with a valid name changes only that habit name', () => {
    fc.assert(
      fc.property(
        appData.filter((d) => d.habits.length > 0),
        fc.nat(),
        validRaw,
        (data, i, raw) => {
          const target = data.habits[i % data.habits.length]
          const r = renameHabit(data, target.id, raw)
          if (!r.ok) return false
          const expected = data.habits.map((h) => (h.id === target.id ? { ...h, name: raw.trim() } : h))
          expect(r.value.habits).toEqual(expected)
          expect(r.value.checkIns).toEqual(data.checkIns)
          expect(r.value.relics).toEqual(data.relics)
          return true
        },
      ),
      { numRuns: 100 },
    )
  })

  it('add and rename with an invalid name return an error and leave the data equal to the input', () => {
    fc.assert(
      fc.property(
        appData.filter((d) => d.habits.length > 0),
        invalidRaw,
        localDate,
        (data, raw, today) => {
          const before = structuredClone(data)
          const a = addHabit(data, raw, today, 'new-habit')
          const r = renameHabit(data, data.habits[0].id, raw)
          expect(a.ok).toBe(false)
          expect(r.ok).toBe(false)
          expect(data).toEqual(before)
          return true
        },
      ),
      { numRuns: 100 },
    )
  })
})
