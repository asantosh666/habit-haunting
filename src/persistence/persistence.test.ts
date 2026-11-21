import { describe, expect, it } from 'vitest'
import type { AppData } from '../engine/types'
import { load, parseAppData, save, serialize, STORAGE_KEY } from './persistence'
import { LocalStorageAdapter, MemoryStorageAdapter, type StorageAdapter } from './storage'

const empty: AppData = { schemaVersion: 1, habits: [], checkIns: [], relics: [], nextRoomSeq: 0 }

const throwing: StorageAdapter = {
  get: () => {
    throw new Error('unavailable')
  },
  set: () => {
    throw new Error('quota')
  },
  remove: () => {
    throw new Error('unavailable')
  },
}

describe('persistence', () => {
  it('reports empty when nothing is stored', () => {
    expect(load(new MemoryStorageAdapter())).toEqual({ kind: 'empty' })
  })

  it.each([
    ['not JSON', '{oops'],
    ['wrong structure', '{"schemaVersion":1}'],
    ['unknown schema version', JSON.stringify({ ...empty, schemaVersion: 2 })],
  ])('reports corrupt for %s, keeping the raw value and not writing', (_name, raw) => {
    const adapter = new MemoryStorageAdapter()
    adapter.set(STORAGE_KEY, raw)
    expect(load(adapter)).toEqual({ kind: 'corrupt', raw })
    expect(adapter.get(STORAGE_KEY)).toBe(raw)
  })

  it('parseAppData tells NOT_JSON from BAD_STRUCTURE', () => {
    expect(parseAppData('{')).toEqual({ ok: false, error: 'NOT_JSON' })
    expect(parseAppData('[]')).toEqual({ ok: false, error: 'BAD_STRUCTURE' })
    expect(parseAppData(serialize(empty))).toEqual({ ok: true, value: empty })
  })

  it('save returns WRITE_FAILED instead of throwing', () => {
    expect(save(throwing, empty)).toEqual({ ok: false, error: 'WRITE_FAILED' })
  })

  it('load treats a throwing read as corrupt with an empty raw value', () => {
    expect(load(throwing)).toEqual({ kind: 'corrupt', raw: '' })
  })

  it('LocalStorageAdapter delegates to the given storage', () => {
    const backing = new Map<string, string>()
    const adapter = new LocalStorageAdapter({
      getItem: (k) => backing.get(k) ?? null,
      setItem: (k, v) => void backing.set(k, v),
      removeItem: (k) => void backing.delete(k),
    })
    adapter.set('k', 'v')
    expect(adapter.get('k')).toBe('v')
    adapter.remove('k')
    expect(adapter.get('k')).toBeNull()
  })
})
