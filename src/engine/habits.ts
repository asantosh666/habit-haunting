import { HOME_ROOMS, MAX_HABIT_NAME_LENGTH } from './constants'
import type { AppData, Habit, LocalDate, Result } from './types'

export type NameError = 'NAME_REQUIRED' | 'NAME_TOO_LONG'
export type HabitError = NameError | 'UNKNOWN_HABIT'

/** Trims the name and checks it is 1 to 100 characters long. */
export function validateHabitName(raw: string): Result<string, NameError> {
  const name = raw.trim()
  if (name.length === 0) return { ok: false, error: 'NAME_REQUIRED' }
  if (name.length > MAX_HABIT_NAME_LENGTH) return { ok: false, error: 'NAME_TOO_LONG' }
  return { ok: true, value: name }
}

/**
 * Adds a daily habit. The home room is HOME_ROOMS[nextRoomSeq % 4], and nextRoomSeq
 * is incremented so that deleting habits never reassigns rooms. `id` and `today`
 * are parameters to keep the engine pure.
 */
export function addHabit(data: AppData, rawName: string, today: LocalDate, id: string): Result<AppData, NameError> {
  const name = validateHabitName(rawName)
  if (!name.ok) return name
  const habit: Habit = {
    id,
    name: name.value,
    frequency: 'daily',
    createdOn: today,
    homeRoom: HOME_ROOMS[data.nextRoomSeq % HOME_ROOMS.length] as Habit['homeRoom'],
  }
  return { ok: true, value: { ...data, habits: [...data.habits, habit], nextRoomSeq: data.nextRoomSeq + 1 } }
}

/** Changes only the name of one habit. */
export function renameHabit(data: AppData, habitId: string, rawName: string): Result<AppData, HabitError> {
  if (!data.habits.some((h) => h.id === habitId)) return { ok: false, error: 'UNKNOWN_HABIT' }
  const name = validateHabitName(rawName)
  if (!name.ok) return name
  return {
    ok: true,
    value: { ...data, habits: data.habits.map((h) => (h.id === habitId ? { ...h, name: name.value } : h)) },
  }
}

/** Removes the habit together with its check-ins and relics. */
export function deleteHabit(data: AppData, habitId: string): Result<AppData, 'UNKNOWN_HABIT'> {
  if (!data.habits.some((h) => h.id === habitId)) return { ok: false, error: 'UNKNOWN_HABIT' }
  return {
    ok: true,
    value: {
      ...data,
      habits: data.habits.filter((h) => h.id !== habitId),
      checkIns: data.checkIns.filter((c) => c.habitId !== habitId),
      relics: data.relics.filter((r) => r.habitId !== habitId),
    },
  }
}
