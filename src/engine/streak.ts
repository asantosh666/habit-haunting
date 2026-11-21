import { addDays, diffDays, isLocalDate } from '../dates/localDate'
import { displayFlameHeight, flameHeight, ghostLevel, ghostRoom, isHaunted } from './ghost'
import type { CheckIn, Habit, HabitState, LocalDate } from './types'

/**
 * Dates of this habit's check-ins that count: valid calendar dates within
 * [createdOn, today], de-duplicated, sorted ascending. Others are ignored silently.
 */
export function validCheckIns(habit: Habit, checkIns: readonly CheckIn[], today: LocalDate): LocalDate[] {
  const seen = new Set<LocalDate>()
  for (const c of checkIns) {
    if (c.habitId !== habit.id || !isLocalDate(c.date)) continue
    if (c.date < habit.createdOn || c.date > today) continue
    seen.add(c.date)
  }
  return [...seen].sort()
}

/** Consecutive checked days ending today, or ending yesterday if today is not yet checked. */
export function streak(habit: Habit, checkIns: readonly CheckIn[], today: LocalDate): number {
  const valid = new Set(validCheckIns(habit, checkIns, today))
  let day = today
  if (!valid.has(day)) day = addDays(today, -1)
  let count = 0
  while (valid.has(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

/** Completed days without a check-in since the last check-in (or creation). Today is never counted. */
export function missedDays(habit: Habit, checkIns: readonly CheckIn[], today: LocalDate): number {
  const valid = validCheckIns(habit, checkIns, today)
  if (valid.length === 0) return Math.max(0, diffDays(today, habit.createdOn))
  return Math.max(0, diffDays(today, valid[valid.length - 1]) - 1)
}

/** False only when the habit has no valid check-in (Unlit_Candle). */
export function hasFlame(habit: Habit, checkIns: readonly CheckIn[], today: LocalDate): boolean {
  return validCheckIns(habit, checkIns, today).length > 0
}

export function deriveHabitState(habit: Habit, checkIns: readonly CheckIn[], today: LocalDate): HabitState {
  const s = streak(habit, checkIns, today)
  const missed = missedDays(habit, checkIns, today)
  const level = ghostLevel(missed)
  return {
    streak: s,
    missedDays: missed,
    ghostLevel: level,
    ghostRoom: ghostRoom(level, habit.homeRoom),
    haunted: isHaunted(missed),
    flameComputed: flameHeight(s),
    flameDisplayed: displayFlameHeight(s),
    lit: hasFlame(habit, checkIns, today),
  }
}
