import { isLocalDate } from '../dates/localDate'
import type { AppData, LocalDate, Result } from './types'

export type CheckInError = 'ALREADY_CHECKED_IN' | 'UNKNOWN_HABIT' | 'INVALID_DATE'

/** Records one check-in for the habit on `today`. Returns a new AppData or an error, and never mutates the input. */
export function applyCheckIn(data: AppData, habitId: string, today: LocalDate): Result<AppData, CheckInError> {
  if (!isLocalDate(today)) return { ok: false, error: 'INVALID_DATE' }
  if (!data.habits.some((h) => h.id === habitId)) return { ok: false, error: 'UNKNOWN_HABIT' }
  if (data.checkIns.some((c) => c.habitId === habitId && c.date === today)) {
    return { ok: false, error: 'ALREADY_CHECKED_IN' }
  }
  return { ok: true, value: { ...data, checkIns: [...data.checkIns, { habitId, date: today }] } }
}
