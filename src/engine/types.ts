import type { LocalDate } from '../dates/localDate'

export type { LocalDate }

export type HomeRoomId = 'parlor' | 'library' | 'kitchen' | 'bedroom'
export type RoomId = HomeRoomId | 'hallway' | 'attic' | 'cellar'
export type Milestone = 7 | 30

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export interface Habit {
  id: string
  name: string
  frequency: 'daily'
  createdOn: LocalDate
  /** One of the four home rooms. */
  homeRoom: HomeRoomId
}

export interface CheckIn {
  habitId: string
  date: LocalDate
}

export interface Relic {
  habitId: string
  milestone: Milestone
  awardedOn: LocalDate
}

export interface AppData {
  schemaVersion: 1
  habits: Habit[]
  checkIns: CheckIn[]
  relics: Relic[]
  /** Monotonic counter for home room assignment. */
  nextRoomSeq: number
}

/** Derived, never stored. */
export interface HabitState {
  streak: number
  missedDays: number
  ghostLevel: number
  ghostRoom: RoomId | null
  haunted: boolean
  flameComputed: number
  flameDisplayed: number
  lit: boolean
}

export interface CandleVM {
  habitId: string
  name: string
  lit: boolean
  flameHeight: number
  streak: number
  missedDays: number
  checkedInToday: boolean
}

export interface GhostVM {
  habitId: string
  name: string
  level: number
  size: number
  opacity: number
  haunted: boolean
}

export interface DashboardViewModel {
  today: LocalDate
  rooms: { id: RoomId; darkness: number; candles: CandleVM[]; ghosts: GhostVM[] }[]
  todayList: { habitId: string; name: string; checkedIn: boolean }[]
  week: { days: LocalDate[]; rows: { habitId: string; cells: ('checked' | 'missed' | 'none')[] }[] }
  isEmpty: boolean
}
