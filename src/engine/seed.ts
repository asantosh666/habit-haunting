import { addDays } from '../dates/localDate'
import { HOME_ROOMS } from './constants'
import type { AppData, CheckIn, Habit, LocalDate } from './types'

const SEED_NAMES = ['Drink water', 'Move for 10 minutes', 'Read 10 pages'] as const

/** The three onboarding habits, created today, with no check-ins. */
export function buildSeedHabits(today: LocalDate): AppData {
  const habits: Habit[] = SEED_NAMES.map((name, i) => ({
    id: `seed-${i + 1}`,
    name,
    frequency: 'daily',
    createdOn: today,
    homeRoom: HOME_ROOMS[i % HOME_ROOMS.length],
  }))
  return { schemaVersion: 1, habits, checkIns: [], relics: [], nextRoomSeq: habits.length }
}

/** Name, days since the last check-in, and length of the check-in run ending on that day. */
const DEMO_HABITS = [
  { name: 'Meditate', lastCheckInDaysAgo: 6, run: 5 },
  { name: 'Exercise', lastCheckInDaysAgo: 11, run: 8 },
  { name: 'Journal', lastCheckInDaysAgo: 3, run: 6 },
  { name: 'Drink water', lastCheckInDaysAgo: 0, run: 12 },
  { name: 'Stretch', lastCheckInDaysAgo: 4, run: 4 },
] as const

const DEMO_AGE_DAYS = 30

/** Five habits created 30 days ago; three are haunted. The output depends only on `today`. */
export function buildDemoHouse(today: LocalDate): AppData {
  const createdOn = addDays(today, -DEMO_AGE_DAYS)
  const habits: Habit[] = []
  const checkIns: CheckIn[] = []
  DEMO_HABITS.forEach((spec, i) => {
    const id = `demo-${i + 1}`
    habits.push({ id, name: spec.name, frequency: 'daily', createdOn, homeRoom: HOME_ROOMS[i % HOME_ROOMS.length] })
    const last = addDays(today, -spec.lastCheckInDaysAgo)
    for (let k = spec.run - 1; k >= 0; k--) checkIns.push({ habitId: id, date: addDays(last, -k) })
  })
  return { schemaVersion: 1, habits, checkIns, relics: [], nextRoomSeq: habits.length }
}
