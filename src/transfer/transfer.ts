import { isLocalDate } from '../dates/localDate'
import { deriveHabitState } from '../engine/streak'
import type { AppData, LocalDate, Result } from '../engine/types'
import { isRecord, validateCore, validateGhosts } from '../engine/validate'
import type { ExportFile } from './types'

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const pad3 = (n: number): string => String(n).padStart(3, '0')

/** Rebuilds the file with fixed key order and canonically sorted arrays. */
function canonicalize(f: ExportFile): ExportFile {
  return {
    format: 'habit-haunting-export',
    version: 1,
    exportedAt: f.exportedAt,
    asOfDate: f.asOfDate,
    nextRoomSeq: f.nextRoomSeq,
    habits: f.habits
      .map((h) => ({ id: h.id, name: h.name, frequency: h.frequency, createdOn: h.createdOn, homeRoom: h.homeRoom }))
      .sort((a, b) => cmp(`${a.createdOn}|${a.id}`, `${b.createdOn}|${b.id}`)),
    checkIns: f.checkIns
      .map((c) => ({ habitId: c.habitId, date: c.date }))
      .sort((a, b) => cmp(`${a.habitId}|${a.date}`, `${b.habitId}|${b.date}`)),
    relics: f.relics
      .map((r) => ({ habitId: r.habitId, milestone: r.milestone, awardedOn: r.awardedOn }))
      .sort((a, b) => cmp(`${a.habitId}|${pad3(a.milestone)}`, `${b.habitId}|${pad3(b.milestone)}`)),
    ghosts: f.ghosts
      .map((g) => ({
        habitId: g.habitId,
        missedDays: g.missedDays,
        ghostLevel: g.ghostLevel,
        ghostRoom: g.ghostRoom,
        haunted: g.haunted,
        streak: g.streak,
      }))
      .sort((a, b) => cmp(a.habitId, b.habitId)),
  }
}

/** Snapshot of all data plus one derived ghost entry per habit, computed for `today`. `exportedAt` is passed in to keep this pure. */
export function buildExport(data: AppData, today: LocalDate, exportedAt: string): ExportFile {
  return canonicalize({
    format: 'habit-haunting-export',
    version: 1,
    exportedAt,
    asOfDate: today,
    nextRoomSeq: data.nextRoomSeq,
    habits: data.habits,
    checkIns: data.checkIns,
    relics: data.relics,
    ghosts: data.habits.map((h) => {
      const s = deriveHabitState(h, data.checkIns, today)
      return {
        habitId: h.id,
        missedDays: s.missedDays,
        ghostLevel: s.ghostLevel,
        ghostRoom: s.ghostRoom,
        haunted: s.haunted,
        streak: s.streak,
      }
    }),
  })
}

export function serializeExport(file: ExportFile): string {
  return JSON.stringify(canonicalize(file), null, 2)
}

export type ExportError = 'NOT_JSON' | 'BAD_STRUCTURE'

export function parseExport(text: string): Result<ExportFile, ExportError> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'NOT_JSON' }
  }
  const bad: Result<ExportFile, ExportError> = { ok: false, error: 'BAD_STRUCTURE' }
  if (!isRecord(parsed)) return bad
  if (parsed.format !== 'habit-haunting-export' || parsed.version !== 1) return bad
  if (typeof parsed.exportedAt !== 'string') return bad
  if (typeof parsed.asOfDate !== 'string' || !isLocalDate(parsed.asOfDate)) return bad
  const core = validateCore(parsed)
  const ghosts = validateGhosts(parsed.ghosts)
  if (!core || !ghosts) return bad
  return {
    ok: true,
    value: canonicalize({
      format: 'habit-haunting-export',
      version: 1,
      exportedAt: parsed.exportedAt,
      asOfDate: parsed.asOfDate,
      ...core,
      ghosts,
    }),
  }
}

/**
 * Takes habits, check-ins, and relics as given, including out-of-range check-ins (R10.6).
 * The ghost snapshot is ignored. Derived state is recomputed from the current date.
 */
export function importToAppData(file: ExportFile): AppData {
  return {
    schemaVersion: 1,
    habits: file.habits.map((h) => ({ ...h })),
    checkIns: file.checkIns.map((c) => ({ ...c })),
    relics: file.relics.map((r) => ({ ...r })),
    nextRoomSeq: file.nextRoomSeq,
  }
}
