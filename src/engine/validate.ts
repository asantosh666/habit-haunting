import { isLocalDate } from '../dates/localDate'
import { ALL_ROOMS, HOME_ROOMS, MAX_HABIT_NAME_LENGTH, MILESTONES } from './constants'
import type { CheckIn, Habit, HomeRoomId, Milestone, Relic, RoomId } from './types'

// Hand-written structural validation shared by persistence and import.
// Each function takes untrusted input and returns a rebuilt value with fixed key order, or null.

export type Json = Record<string, unknown>

export function isRecord(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export const isNonNegativeInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
const isDate = (v: unknown): v is string => typeof v === 'string' && isLocalDate(v)

export interface Core {
  habits: Habit[]
  checkIns: CheckIn[]
  relics: Relic[]
  nextRoomSeq: number
}

/** Validates habits, check-ins, relics, and nextRoomSeq of an untrusted object. */
export function validateCore(raw: Json): Core | null {
  if (!isNonNegativeInt(raw.nextRoomSeq)) return null
  if (!Array.isArray(raw.habits) || !Array.isArray(raw.checkIns) || !Array.isArray(raw.relics)) return null

  const habits: Habit[] = []
  const ids = new Set<string>()
  for (const h of raw.habits as unknown[]) {
    if (!isRecord(h)) return null
    const { id, name, frequency, createdOn, homeRoom } = h
    if (typeof id !== 'string' || ids.has(id)) return null
    if (typeof name !== 'string' || name !== name.trim()) return null
    if (name.length < 1 || name.length > MAX_HABIT_NAME_LENGTH) return null
    if (frequency !== 'daily' || !isDate(createdOn)) return null
    if (!HOME_ROOMS.includes(homeRoom as HomeRoomId)) return null
    ids.add(id)
    habits.push({ id, name, frequency, createdOn, homeRoom: homeRoom as HomeRoomId })
  }

  const checkIns: CheckIn[] = []
  for (const c of raw.checkIns as unknown[]) {
    if (!isRecord(c) || typeof c.habitId !== 'string' || !ids.has(c.habitId) || !isDate(c.date)) return null
    checkIns.push({ habitId: c.habitId, date: c.date })
  }

  const relics: Relic[] = []
  const seen = new Set<string>()
  for (const r of raw.relics as unknown[]) {
    if (!isRecord(r) || typeof r.habitId !== 'string' || !ids.has(r.habitId)) return null
    if (!MILESTONES.includes(r.milestone as Milestone) || !isDate(r.awardedOn)) return null
    const key = `${r.habitId}|${String(r.milestone)}`
    if (seen.has(key)) return null
    seen.add(key)
    relics.push({ habitId: r.habitId, milestone: r.milestone as Milestone, awardedOn: r.awardedOn })
  }

  return { habits, checkIns, relics, nextRoomSeq: raw.nextRoomSeq }
}

export interface GhostSnapshot {
  habitId: string
  missedDays: number
  ghostLevel: number
  ghostRoom: RoomId | null
  haunted: boolean
  streak: number
}

/** Checks the derived ghost snapshot is well-formed. It is not required to match the engine. */
export function validateGhosts(raw: unknown): GhostSnapshot[] | null {
  if (!Array.isArray(raw)) return null
  const out: GhostSnapshot[] = []
  for (const g of raw as unknown[]) {
    if (!isRecord(g) || typeof g.habitId !== 'string') return null
    if (!isNonNegativeInt(g.missedDays) || !isNonNegativeInt(g.ghostLevel) || g.ghostLevel > 10) return null
    if (g.ghostRoom !== null && !ALL_ROOMS.includes(g.ghostRoom as RoomId)) return null
    if (typeof g.haunted !== 'boolean' || !isNonNegativeInt(g.streak)) return null
    out.push({
      habitId: g.habitId,
      missedDays: g.missedDays,
      ghostLevel: g.ghostLevel,
      ghostRoom: g.ghostRoom as RoomId | null,
      haunted: g.haunted,
      streak: g.streak,
    })
  }
  return out
}
