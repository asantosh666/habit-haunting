import fc from 'fast-check'

import type { ExportFile, ExportGhost } from '../transfer/types'
import type { AppData, CheckIn, Habit, HomeRoomId, LocalDate, Milestone, Relic, RoomId } from '../engine/types'

export type { ExportFile, ExportGhost }

const HOME_ROOMS: HomeRoomId[] = ['parlor', 'library', 'kitchen', 'bedroom']
const ALL_ROOMS: RoomId[] = [...HOME_ROOMS, 'hallway', 'attic', 'cellar']

const pad = (n: number, width: number) => String(n).padStart(width, '0')

/** Valid calendar date as YYYY-MM-DD. Day is capped at 28 so every month is valid. */
export const localDate: fc.Arbitrary<LocalDate> = fc
  .record({
    y: fc.integer({ min: 1970, max: 2100 }),
    m: fc.integer({ min: 1, max: 12 }),
    d: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ y, m, d }) => `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`)

/** Habit names that pass validation: trimmed length 1..100. */
export const habitName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  .map((s) => s.trim())
  .filter((s) => s.length >= 1 && s.length <= 100)

const sortBy = <T>(items: T[], key: (t: T) => string): T[] =>
  [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    return ka < kb ? -1 : ka > kb ? 1 : 0
  })

/** Consistent AppData: unique habit ids, check-ins and relics reference real habits, no duplicates. */
export const appData: fc.Arbitrary<AppData> = fc
  .record({
    habitSpecs: fc.array(
      fc.record({
        name: habitName,
        createdOn: localDate,
        homeRoom: fc.constantFrom(...HOME_ROOMS),
        checkInDates: fc.uniqueArray(localDate, { maxLength: 15 }),
        milestones: fc.uniqueArray(fc.constantFrom<Milestone>(7, 30), { maxLength: 2 }),
        awardDates: fc.array(localDate, { minLength: 2, maxLength: 2 }),
      }),
      { maxLength: 8 },
    ),
    extraSeq: fc.nat({ max: 20 }),
  })
  .map(({ habitSpecs, extraSeq }) => {
    const habits: Habit[] = habitSpecs.map((s, i) => ({
      id: `habit-${i}`,
      name: s.name,
      frequency: 'daily',
      createdOn: s.createdOn,
      homeRoom: s.homeRoom,
    }))
    const checkIns: CheckIn[] = habitSpecs.flatMap((s, i) =>
      s.checkInDates.map((date) => ({ habitId: `habit-${i}`, date })),
    )
    const relics: Relic[] = habitSpecs.flatMap((s, i) =>
      s.milestones.map((milestone, j) => ({
        habitId: `habit-${i}`,
        milestone,
        awardedOn: s.awardDates[j],
      })),
    )
    return {
      schemaVersion: 1 as const,
      habits,
      checkIns,
      relics,
      nextRoomSeq: habits.length + extraSeq,
    }
  })

/** Well-formed ExportFile in canonical order. The ghosts snapshot is well-formed but not engine-derived. */
export const exportFile: fc.Arbitrary<ExportFile> = fc
  .record({
    data: appData,
    asOfDate: localDate,
    exportedAtDate: localDate,
    exportedAtTime: fc.record({
      h: fc.integer({ min: 0, max: 23 }),
      mi: fc.integer({ min: 0, max: 59 }),
      s: fc.integer({ min: 0, max: 59 }),
    }),
    ghostSeeds: fc.array(
      fc.record({
        missedDays: fc.nat({ max: 60 }),
        ghostRoom: fc.constantFrom<RoomId | null>(null, ...ALL_ROOMS),
        streak: fc.nat({ max: 400 }),
      }),
      { minLength: 8, maxLength: 8 },
    ),
  })
  .map(({ data, asOfDate, exportedAtDate, exportedAtTime: t, ghostSeeds }) => ({
    format: 'habit-haunting-export' as const,
    version: 1 as const,
    exportedAt: `${exportedAtDate}T${pad(t.h, 2)}:${pad(t.mi, 2)}:${pad(t.s, 2)}.000Z`,
    asOfDate,
    nextRoomSeq: data.nextRoomSeq,
    habits: sortBy(data.habits, (h) => `${h.createdOn}|${h.id}`),
    checkIns: sortBy(data.checkIns, (c) => `${c.habitId}|${c.date}`),
    relics: sortBy(data.relics, (r) => `${r.habitId}|${pad(r.milestone, 3)}`),
    ghosts: sortBy(
      data.habits.map((h, i) => {
        const g = ghostSeeds[i]
        return {
          habitId: h.id,
          missedDays: g.missedDays,
          ghostLevel: Math.min(10, g.missedDays),
          ghostRoom: g.missedDays === 0 ? null : g.ghostRoom,
          haunted: g.missedDays >= 3,
          streak: g.streak,
        }
      }),
      (g) => g.habitId,
    ),
  }))

export type CorruptionKind = 'NOT_JSON' | 'BAD_STRUCTURE'
export interface CorruptedExport {
  text: string
  /** The error code parseExport must return for this text. */
  expected: CorruptionKind
}

const REQUIRED_FIELDS = [
  'format',
  'version',
  'exportedAt',
  'asOfDate',
  'nextRoomSeq',
  'habits',
  'checkIns',
  'relics',
  'ghosts',
] as const

const ARRAY_FIELDS: readonly string[] = ['habits', 'checkIns', 'relics', 'ghosts']
type Json = Record<string, unknown>

/** An export that must be rejected: non-JSON text, or JSON that breaks the structure rules. */
export const corruptedExport: fc.Arbitrary<CorruptedExport> = fc.oneof(
  // Text that is not JSON: one `{` and no `}` is always an unclosed object.
  fc
    .string({ maxLength: 40 })
    .map((s) => ({ text: `{${s.replace(/[{}]/g, '')}`, expected: 'NOT_JSON' as const })),
  // Truncated real export.
  exportFile.map((f) => {
    const full = JSON.stringify(f)
    return { text: full.slice(0, Math.max(1, full.length - 1)), expected: 'NOT_JSON' as const }
  }),
  // A required field removed.
  fc.tuple(exportFile, fc.constantFrom(...REQUIRED_FIELDS)).map(([f, field]) => {
    const copy: Json = { ...f }
    delete copy[field]
    return { text: JSON.stringify(copy), expected: 'BAD_STRUCTURE' as const }
  }),
  // A field of the wrong type.
  fc.tuple(exportFile, fc.constantFrom(...REQUIRED_FIELDS)).map(([f, field]) => {
    const copy: Json = { ...f, [field]: ARRAY_FIELDS.includes(field) ? 'x' : [] }
    return { text: JSON.stringify(copy), expected: 'BAD_STRUCTURE' as const }
  }),
  // Duplicate habit id.
  exportFile
    .filter((f) => f.habits.length >= 1)
    .map((f) => ({
      text: JSON.stringify({ ...f, habits: [...f.habits, { ...f.habits[0] }] }),
      expected: 'BAD_STRUCTURE' as const,
    })),
  // Check-in for an unknown habit.
  fc.tuple(exportFile, localDate).map(([f, date]) => ({
    text: JSON.stringify({ ...f, checkIns: [...f.checkIns, { habitId: 'no-such-habit', date }] }),
    expected: 'BAD_STRUCTURE' as const,
  })),
  // Valid JSON that is not an object.
  fc.constantFrom('null', '[]', '42', '"x"').map((text) => ({ text, expected: 'BAD_STRUCTURE' as const })),
)
