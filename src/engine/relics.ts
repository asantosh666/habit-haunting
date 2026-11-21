import { MILESTONES } from './constants'
import { streak } from './streak'
import type { AppData, LocalDate, Relic } from './types'

/**
 * Relics to award now: for each habit and milestone with streak >= milestone and no
 * stored relic. Because the test is "no stored relic", an award that failed to save
 * is retried on the next evaluation (R6.6), and a milestone is never awarded twice (R6.3).
 */
export function evaluateRelics(data: AppData, today: LocalDate): { awarded: Relic[] } {
  const awarded: Relic[] = []
  for (const habit of data.habits) {
    const s = streak(habit, data.checkIns, today)
    for (const milestone of MILESTONES) {
      if (s < milestone) continue
      if (data.relics.some((r) => r.habitId === habit.id && r.milestone === milestone)) continue
      awarded.push({ habitId: habit.id, milestone, awardedOn: today })
    }
  }
  return { awarded }
}

/** Most recent award first; ties by habitId, then milestone. Returns a new array. */
export function sortRelics(relics: readonly Relic[]): Relic[] {
  return [...relics].sort((a, b) => {
    if (a.awardedOn !== b.awardedOn) return a.awardedOn < b.awardedOn ? 1 : -1
    if (a.habitId !== b.habitId) return a.habitId < b.habitId ? -1 : 1
    return a.milestone - b.milestone
  })
}
