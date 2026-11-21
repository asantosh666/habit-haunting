import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { BASE_DATE } from '../test/fixtures'
import { deriveHabitState, hasFlame, missedDays, streak, validCheckIns } from './streak'
import type { CheckIn, Habit } from './types'

const today = BASE_DATE
const habit: Habit = {
  id: 'h',
  name: 'Read',
  frequency: 'daily',
  createdOn: addDays(today, -30),
  homeRoom: 'library',
}
const on = (...offsets: number[]): CheckIn[] => offsets.map((k) => ({ habitId: 'h', date: addDays(today, k) }))

describe('streak and missed days', () => {
  it('counts a streak ending today', () => {
    expect(streak(habit, on(0, -1, -2), today)).toBe(3)
    expect(missedDays(habit, on(0, -1, -2), today)).toBe(0)
  })

  it('keeps a streak ending yesterday and does not count today as missed', () => {
    expect(streak(habit, on(-1, -2), today)).toBe(2)
    expect(missedDays(habit, on(-1, -2), today)).toBe(0)
  })

  it('resets the streak after a gap and counts missed days back from yesterday', () => {
    expect(streak(habit, on(-4, -5), today)).toBe(0)
    expect(missedDays(habit, on(-4, -5), today)).toBe(3)
  })

  it('counts missed days from creation when never checked in', () => {
    expect(missedDays(habit, [], today)).toBe(30)
    expect(hasFlame(habit, [], today)).toBe(false)
    expect(deriveHabitState(habit, [], today).lit).toBe(false)
  })

  it('ignores check-ins before creation, after today, and for other habits', () => {
    const noise: CheckIn[] = [
      ...on(-31, -40, 1, 5),
      { habitId: 'other', date: today },
      { habitId: 'h', date: 'not-a-date' },
    ]
    expect(validCheckIns(habit, noise, today)).toEqual([])
    expect(deriveHabitState(habit, [...on(0), ...noise], today)).toEqual(deriveHabitState(habit, on(0), today))
  })

  it('derives the full habit state', () => {
    const state = deriveHabitState(habit, on(-6, -7), today)
    expect(state).toMatchObject({
      streak: 0,
      missedDays: 5,
      ghostLevel: 5,
      ghostRoom: 'hallway',
      haunted: true,
      lit: true,
    })
  })
})
