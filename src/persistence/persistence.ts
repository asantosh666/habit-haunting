import { isRecord, validateCore } from '../engine/validate'
import type { AppData, Result } from '../engine/types'
import type { StorageAdapter } from './storage'

export const STORAGE_KEY = 'habit-haunting:v1'
export const DEMO_OFFSET_KEY = 'habit-haunting:demo-offset'

export type LoadResult = { kind: 'empty' } | { kind: 'ok'; data: AppData } | { kind: 'corrupt'; raw: string }

/**
 * JSON with a fixed key order. Array order is kept as stored, so that a save then
 * load returns data deeply equal to the original (R9.2). Export is the canonically
 * sorted form.
 */
export function serialize(data: AppData): string {
  return JSON.stringify({
    schemaVersion: 1,
    habits: data.habits.map((h) => ({
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      createdOn: h.createdOn,
      homeRoom: h.homeRoom,
    })),
    checkIns: data.checkIns.map((c) => ({ habitId: c.habitId, date: c.date })),
    relics: data.relics.map((r) => ({ habitId: r.habitId, milestone: r.milestone, awardedOn: r.awardedOn })),
    nextRoomSeq: data.nextRoomSeq,
  })
}

/** Parses stored JSON. An unknown `schemaVersion` is BAD_STRUCTURE, which `load` treats as corrupt. */
export function parseAppData(json: string): Result<AppData, 'NOT_JSON' | 'BAD_STRUCTURE'> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'NOT_JSON' }
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== 1) return { ok: false, error: 'BAD_STRUCTURE' }
  const core = validateCore(parsed)
  if (!core) return { ok: false, error: 'BAD_STRUCTURE' }
  return { ok: true, value: { schemaVersion: 1, ...core } }
}

/** Reads the app data. Never writes. A read that throws counts as corrupt, with an empty raw value. */
export function load(adapter: StorageAdapter): LoadResult {
  let raw: string | null
  try {
    raw = adapter.get(STORAGE_KEY)
  } catch {
    return { kind: 'corrupt', raw: '' }
  }
  if (raw === null) return { kind: 'empty' }
  const parsed = parseAppData(raw)
  return parsed.ok ? { kind: 'ok', data: parsed.value } : { kind: 'corrupt', raw }
}

/** Writes the app data. A throwing adapter becomes WRITE_FAILED. */
export function save(adapter: StorageAdapter, data: AppData): Result<void, 'WRITE_FAILED'> {
  try {
    adapter.set(STORAGE_KEY, serialize(data))
    return { ok: true, value: undefined }
  } catch {
    return { ok: false, error: 'WRITE_FAILED' }
  }
}
