import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Clock } from '../clock/clock'
import { addDays } from '../dates/localDate'
import { deriveHabitState } from '../engine/streak'
import type { AppData } from '../engine/types'
import { load, save, STORAGE_KEY } from '../persistence/persistence'
import { MemoryStorageAdapter, type StorageAdapter } from '../persistence/storage'
import { BASE_DATE } from '../test/fixtures'
import { buildExport, importToAppData, parseExport, serializeExport } from '../transfer/transfer'
import { startDateWatcher } from './dateWatcher'
import { createStore, MESSAGES, type AppStore } from './store'

/** Memory adapter whose writes can be made to fail. */
class FlakyAdapter extends MemoryStorageAdapter implements StorageAdapter {
  failSets = false
  /** Number of successful `set` calls before every later one fails. Infinity means never. */
  okSetsLeft = Infinity
  override set(key: string, value: string): void {
    if (this.failSets || this.okSetsLeft <= 0) {
      throw new Error('write failed')
    }
    this.okSetsLeft--
    super.set(key, value)
  }
}

let counter = 0
const makeId = () => `id-${++counter}`

function setup(opts: { data?: AppData; raw?: string; today?: string } = {}) {
  const adapter = new FlakyAdapter()
  if (opts.data) save(adapter, opts.data)
  if (opts.raw !== undefined) adapter.set(STORAGE_KEY, opts.raw)
  const store = createStore({ adapter, initialToday: opts.today ?? BASE_DATE, makeId })
  return { adapter, store }
}

const banner = (store: AppStore, id: string) => store.getState().banners.find((b) => b.id === id)

const habitData = (): AppData => ({
  schemaVersion: 1,
  habits: [{ id: 'h1', name: 'Read', frequency: 'daily', createdOn: addDays(BASE_DATE, -20), homeRoom: 'parlor' }],
  checkIns: [],
  relics: [],
  nextRoomSeq: 1,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('store: loading and onboarding', () => {
  it('starts in onboarding when storage is empty, and creates the three seed habits in one action (R8.1, R8.2)', async () => {
    const { store, adapter } = setup()
    expect(store.getState().status).toBe('ready')
    expect(store.getState().onboardingPending).toBe(true)
    expect(await store.dispatch({ type: 'completeOnboarding' })).toEqual({ ok: true })
    expect(store.getState().data.habits.map((h) => h.name)).toEqual(['Drink water', 'Move for 10 minutes', 'Read 10 pages'])
    expect(store.getState().onboardingPending).toBe(false)
    expect(load(adapter).kind).toBe('ok')
  })

  it('adds a habit that has no check-in, so it is an unlit candle (R1.2)', async () => {
    const { store } = setup()
    await store.dispatch({ type: 'addHabit', name: '  Stretch  ' })
    const [habit] = store.getState().data.habits
    expect(habit.name).toBe('Stretch')
    expect(deriveHabitState(habit, store.getState().data.checkIns, BASE_DATE).lit).toBe(false)
  })

  it('updates the state in the same tick as the dispatch', () => {
    const { store } = setup()
    void store.dispatch({ type: 'addHabit', name: 'Stretch' })
    expect(store.getState().data.habits).toHaveLength(1)
  })

  it('notifies subscribers and stops after unsubscribe', async () => {
    const { store } = setup()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    await store.dispatch({ type: 'addHabit', name: 'A' })
    expect(listener).toHaveBeenCalled()
    off()
    listener.mockClear()
    await store.dispatch({ type: 'addHabit', name: 'B' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('returns inline validation errors without changing data (R1.3, R1.4)', async () => {
    const { store, adapter } = setup({ data: habitData() })
    const before = adapter.get(STORAGE_KEY)
    expect(await store.dispatch({ type: 'addHabit', name: '   ' })).toMatchObject({ ok: false, error: 'NAME_REQUIRED' })
    expect(await store.dispatch({ type: 'addHabit', name: 'x'.repeat(101) })).toMatchObject({
      ok: false,
      error: 'NAME_TOO_LONG',
      message: MESSAGES.NAME_TOO_LONG,
    })
    expect(adapter.get(STORAGE_KEY)).toBe(before)
  })

  it('reports "already checked in" and leaves data unchanged (R2.4)', async () => {
    const { store } = setup({ data: habitData() })
    await store.dispatch({ type: 'checkIn', habitId: 'h1' })
    const before = store.getState().data
    const r = await store.dispatch({ type: 'checkIn', habitId: 'h1' })
    expect(r).toEqual({ ok: false, error: 'ALREADY_CHECKED_IN', message: MESSAGES.ALREADY_CHECKED_IN })
    expect(store.getState().data).toBe(before)
  })
})

describe('store: save failures roll back (R1.8, R2.6, R4.5)', () => {
  it.each([
    ['add', { type: 'addHabit', name: 'New' }],
    ['rename', { type: 'renameHabit', habitId: 'h1', name: 'Renamed' }],
    ['delete', { type: 'deleteHabit', habitId: 'h1' }],
  ] as const)('%s restores the previous data and shows an error (R1.8)', async (_n, action) => {
    const { store, adapter } = setup({ data: habitData() })
    const before = store.getState().data
    const raw = adapter.get(STORAGE_KEY)
    adapter.failSets = true
    const r = await store.dispatch(action)
    expect(r).toMatchObject({ ok: false, error: 'SAVE_FAILED', message: MESSAGES.CHANGE_NOT_SAVED })
    expect(store.getState().data).toBe(before)
    expect(banner(store, 'save-failed')?.message).toBe(MESSAGES.CHANGE_NOT_SAVED)
    expect(adapter.get(STORAGE_KEY)).toBe(raw)
  })

  it('a failed check-in on a haunted habit keeps it haunted with the same missed days (R2.6, R4.5)', async () => {
    const { store, adapter } = setup({ today: BASE_DATE })
    await store.dispatch({ type: 'loadDemo' })
    const haunted = store.getState().data.habits[0]
    const before = deriveHabitState(haunted, store.getState().data.checkIns, BASE_DATE)
    expect(before.haunted).toBe(true)
    const dataBefore = store.getState().data
    adapter.failSets = true
    const r = await store.dispatch({ type: 'checkIn', habitId: haunted.id })
    expect(r).toMatchObject({ ok: false, error: 'SAVE_FAILED', message: MESSAGES.CHECK_IN_NOT_SAVED })
    expect(store.getState().data).toBe(dataBefore)
    const after = deriveHabitState(haunted, store.getState().data.checkIns, BASE_DATE)
    expect(after).toEqual(before)
    expect(banner(store, 'save-failed')?.message).toBe(MESSAGES.CHECK_IN_NOT_SAVED)
  })

  it('checking in a haunted habit revives it when the save works (R4.3, R8.6)', async () => {
    const { store } = setup()
    await store.dispatch({ type: 'loadDemo' })
    const haunted = store.getState().data.habits[0]
    await store.dispatch({ type: 'checkIn', habitId: haunted.id })
    const after = deriveHabitState(haunted, store.getState().data.checkIns, BASE_DATE)
    expect(after.haunted).toBe(false)
    expect(after.missedDays).toBe(0)
  })
})

describe('store: relics (R6.6)', () => {
  const sixDayRun = (): AppData => ({
    ...habitData(),
    checkIns: [1, 2, 3, 4, 5, 6].map((n) => ({ habitId: 'h1', date: addDays(BASE_DATE, -n) })),
  })

  it('awards the 7-day relic with the check-in', async () => {
    const { store } = setup({ data: sixDayRun() })
    await store.dispatch({ type: 'checkIn', habitId: 'h1' })
    expect(store.getState().data.relics).toEqual([{ habitId: 'h1', milestone: 7, awardedOn: BASE_DATE }])
  })

  it('keeps the check-in, hides the relic, shows an error, and retries on the next evaluation', async () => {
    const { store, adapter } = setup({ data: sixDayRun() })
    adapter.okSetsLeft = 1 // the check-in write succeeds, the relic write fails
    const r = await store.dispatch({ type: 'checkIn', habitId: 'h1' })
    expect(r).toEqual({ ok: true })
    expect(store.getState().data.checkIns).toHaveLength(7)
    expect(store.getState().data.relics).toEqual([])
    expect(banner(store, 'relic-save-failed')?.message).toBe(MESSAGES.RELIC_NOT_SAVED)
    expect(load(adapter)).toMatchObject({ kind: 'ok', data: { relics: [] } })

    adapter.okSetsLeft = Infinity
    const tomorrow = addDays(BASE_DATE, 1)
    store.setToday(tomorrow) // the streak is still 7, so the award is retried
    expect(store.getState().data.relics).toEqual([{ habitId: 'h1', milestone: 7, awardedOn: tomorrow }])
    expect(banner(store, 'relic-save-failed')).toBeUndefined()
  })
})

describe('store: import and demo (R7.6 to R7.8, R8.5)', () => {
  it('leaves data untouched until the user confirms, and cancel discards the file (R7.6, R7.7)', async () => {
    const { store, adapter } = setup({ data: habitData() })
    const original = store.getState().data
    const raw = adapter.get(STORAGE_KEY)
    const source: AppData = { ...habitData(), habits: [{ ...habitData().habits[0], id: 'other', name: 'Other' }] }
    const parsed = parseExport(serializeExport(buildExport(source, BASE_DATE, 'stamp')))
    if (!parsed.ok) throw new Error('export should parse')
    const imported = importToAppData(parsed.value)

    // Cancel: the UI drops the file and never dispatches.
    expect(store.getState().data).toBe(original)
    expect(adapter.get(STORAGE_KEY)).toBe(raw)

    // Confirm.
    expect(await store.dispatch({ type: 'importData', data: imported })).toEqual({ ok: true })
    expect(store.getState().data).toEqual(imported)
    expect(load(adapter)).toEqual({ kind: 'ok', data: imported })
    expect(banner(store, 'import-succeeded')?.message).toBe(MESSAGES.IMPORT_SUCCEEDED)
  })

  it('keeps the previous in-memory state when the import write and the restore both fail (R7.8)', async () => {
    const { store, adapter } = setup({ data: habitData() })
    const before = store.getState().data
    adapter.failSets = true
    const r = await store.dispatch({ type: 'importData', data: { ...habitData(), habits: [] } })
    expect(r).toMatchObject({ ok: false, error: 'SAVE_FAILED', message: MESSAGES.IMPORT_FAILED })
    expect(store.getState().data).toBe(before)
    expect(banner(store, 'import-failed')).toBeDefined()
    // The restore write fails as well, so the in-memory state is the previous state.
  })

  it('writes the previous raw value back after a partial import write (R7.8)', async () => {
    const { store, adapter } = setup({ data: habitData() })
    const raw = adapter.get(STORAGE_KEY)
    // The first write is partial and throws. The restore is the second write and succeeds.
    let calls = 0
    const originalSet = adapter.set.bind(adapter)
    adapter.set = (k, v) => {
      calls++
      if (calls === 1) {
        originalSet(k, 'partial')
        throw new Error('write failed')
      }
      originalSet(k, v)
    }
    await store.dispatch({ type: 'importData', data: { ...habitData(), habits: [] } })
    expect(adapter.get(STORAGE_KEY)).toBe(raw)
  })

  it('keeps the previous data when the demo house cannot be saved (R8.5)', async () => {
    const { store, adapter } = setup({ data: habitData() })
    const raw = adapter.get(STORAGE_KEY)
    const before = store.getState().data
    adapter.failSets = true
    const r = await store.dispatch({ type: 'loadDemo' })
    expect(r).toMatchObject({ ok: false, error: 'SAVE_FAILED', message: MESSAGES.DEMO_FAILED })
    expect(store.getState().data).toBe(before)
    expect(store.getState().demoMode).toBe(false)
    expect(adapter.get(STORAGE_KEY)).toBe(raw)
    expect(banner(store, 'demo-failed')).toBeDefined()
  })

  it('loading the demo house replaces data and turns demo mode on (R8.4)', async () => {
    const { store } = setup({ data: habitData() })
    await store.dispatch({ type: 'loadDemo' })
    expect(store.getState().demoMode).toBe(true)
    expect(store.getState().data.habits).toHaveLength(5)
  })
})

describe('store: storage problems (R9.5, R9.6)', () => {
  it('keeps seed habits in memory and stays usable when onboarding cannot be saved (R9.5)', async () => {
    const { store, adapter } = setup()
    adapter.failSets = true
    expect(await store.dispatch({ type: 'completeOnboarding' })).toEqual({ ok: true })
    expect(store.getState().data.habits).toHaveLength(3)
    expect(banner(store, 'save-failed')?.message).toBe(MESSAGES.DATA_NOT_SAVED)
    // Later changes work against the in-memory fallback.
    expect(await store.dispatch({ type: 'checkIn', habitId: store.getState().data.habits[0].id })).toEqual({ ok: true })
    expect(store.getState().data.checkIns).toHaveLength(1)
  })

  it('starts empty on corrupt data and leaves the raw value until the first change (R9.6)', async () => {
    const { store, adapter } = setup({ raw: '{not json' })
    expect(store.getState().status).toBe('ready')
    expect(store.getState().data.habits).toEqual([])
    expect(banner(store, 'corrupt')?.message).toBe(MESSAGES.CORRUPT)
    expect(adapter.get(STORAGE_KEY)).toBe('{not json')
    await store.dispatch({ type: 'addHabit', name: 'Fresh' })
    expect(load(adapter).kind).toBe('ok')
    expect(banner(store, 'corrupt')).toBeUndefined()
  })
})

describe('store: date handling (R3.8, R10.2)', () => {
  it('keeps the last good date and data when the date is invalid, and blocks date-based actions (R3.8)', async () => {
    const { store, adapter } = setup({ data: habitData() })
    const before = store.getState().data
    const raw = adapter.get(STORAGE_KEY)
    store.setToday(null)
    expect(store.getState().today).toBe(BASE_DATE)
    expect(banner(store, 'invalid-date')?.message).toBe(MESSAGES.INVALID_DATE)
    expect(await store.dispatch({ type: 'checkIn', habitId: 'h1' })).toMatchObject({ ok: false, error: 'INVALID_DATE' })
    store.setToday('2025-02-30')
    expect(store.getState().today).toBe(BASE_DATE)
    expect(store.getState().data).toBe(before)
    expect(adapter.get(STORAGE_KEY)).toBe(raw)
    store.setToday(BASE_DATE)
    expect(banner(store, 'invalid-date')).toBeUndefined()
    expect(await store.dispatch({ type: 'checkIn', habitId: 'h1' })).toEqual({ ok: true })
  })

  it('starts with an invalid-date error when the clock has no date', async () => {
    const adapter = new FlakyAdapter()
    const store = createStore({ adapter, initialToday: null, makeId })
    expect(banner(store, 'invalid-date')).toBeDefined()
    expect(await store.dispatch({ type: 'addHabit', name: 'x' })).toMatchObject({ ok: false, error: 'INVALID_DATE' })
  })

  it('rolls over at midnight through the watcher timer (R10.2)', () => {
    vi.useFakeTimers()
    const { store } = setup({ data: habitData() })
    let today = BASE_DATE
    const clock: Clock = { today: () => today }
    const stop = startDateWatcher({ clock, store, msUntilMidnight: () => 1000 })
    expect(store.getState().today).toBe(BASE_DATE)
    today = addDays(BASE_DATE, 1)
    vi.advanceTimersByTime(1000 + 50)
    expect(store.getState().today).toBe(today)
    stop()
  })

  it('falls back to the 30-second poll when the midnight timer is late', () => {
    vi.useFakeTimers()
    const { store } = setup({ data: habitData() })
    let today = BASE_DATE
    const stop = startDateWatcher({ clock: { today: () => today }, store, msUntilMidnight: () => 10 * 60_000 })
    today = addDays(BASE_DATE, 1)
    vi.advanceTimersByTime(29_000)
    expect(store.getState().today).toBe(BASE_DATE)
    vi.advanceTimersByTime(1_000)
    expect(store.getState().today).toBe(today)
    stop()
  })

  it('re-reads the date when the page becomes visible, and stops after stop()', () => {
    vi.useFakeTimers()
    const { store } = setup({ data: habitData() })
    let today = BASE_DATE
    const handlers: Array<() => void> = []
    const doc = {
      visibilityState: 'visible',
      addEventListener: (_t: string, h: () => void) => void handlers.push(h),
      removeEventListener: (_t: string, h: () => void) => void handlers.splice(handlers.indexOf(h), 1),
    }
    const stop = startDateWatcher({ clock: { today: () => today }, store, msUntilMidnight: () => 10 * 60_000, doc })
    today = addDays(BASE_DATE, 1)
    handlers.forEach((h) => h())
    expect(store.getState().today).toBe(today)
    stop()
    expect(handlers).toHaveLength(0)
    today = addDays(BASE_DATE, 2)
    vi.advanceTimersByTime(60_000)
    expect(store.getState().today).toBe(addDays(BASE_DATE, 1))
  })
})

describe('store: load timeout and retry (R5.8)', () => {
  it('shows an error after the timeout and recovers on retry', async () => {
    vi.useFakeTimers()
    const adapter = new FlakyAdapter()
    const data = habitData()
    let calls = 0
    let resolveFirst: (v: ReturnType<typeof load>) => void = () => {}
    const store = createStore({
      adapter,
      initialToday: BASE_DATE,
      makeId,
      loader: () => {
        calls++
        return calls === 1
          ? new Promise((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve({ kind: 'ok' as const, data })
      },
    })
    expect(store.getState().status).toBe('loading')
    vi.advanceTimersByTime(4_999)
    expect(store.getState().status).toBe('loading')
    vi.advanceTimersByTime(1)
    expect(store.getState().status).toBe('error')
    expect(store.getState().loadError).toBe(MESSAGES.LOAD_FAILED)
    expect(await store.dispatch({ type: 'addHabit', name: 'x' })).toMatchObject({ ok: false, error: 'NOT_READY' })

    store.retryLoad()
    expect(store.getState().status).toBe('loading')
    await vi.advanceTimersByTimeAsync(0)
    expect(store.getState().status).toBe('ready')
    expect(store.getState().data).toEqual(data)

    // A late answer to the first attempt is ignored.
    resolveFirst({ kind: 'empty' })
    await vi.advanceTimersByTimeAsync(0)
    expect(store.getState().data).toEqual(data)
  })

  it('shows the error when the loader rejects, and retry ignores calls when not in error', async () => {
    const adapter = new FlakyAdapter()
    const store = createStore({ adapter, initialToday: BASE_DATE, makeId, loader: () => Promise.reject(new Error('x')) })
    await Promise.resolve()
    await Promise.resolve()
    expect(store.getState().status).toBe('error')
    const ready = setup().store
    ready.retryLoad()
    expect(ready.getState().status).toBe('ready')
  })
})
