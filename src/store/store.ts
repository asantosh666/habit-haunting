import { isLocalDate } from '../dates/localDate'
import { applyCheckIn } from '../engine/checkin'
import { addHabit, deleteHabit, renameHabit } from '../engine/habits'
import { evaluateRelics } from '../engine/relics'
import { buildDemoHouse, buildSeedHabits } from '../engine/seed'
import type { AppData, LocalDate } from '../engine/types'
import { load, save, serialize, STORAGE_KEY, type LoadResult } from '../persistence/persistence'
import { MemoryStorageAdapter, type StorageAdapter } from '../persistence/storage'

export type Action =
  | { type: 'addHabit'; name: string }
  | { type: 'renameHabit'; habitId: string; name: string }
  | { type: 'deleteHabit'; habitId: string }
  | { type: 'checkIn'; habitId: string }
  | { type: 'importData'; data: AppData }
  | { type: 'loadDemo' }
  | { type: 'completeOnboarding' }

export type ErrorCode =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'UNKNOWN_HABIT'
  | 'ALREADY_CHECKED_IN'
  | 'INVALID_DATE'
  | 'NOT_READY'
  | 'SAVE_FAILED'

export type DispatchOutcome = { ok: true } | { ok: false; error: ErrorCode; message: string }

export type BannerId =
  | 'save-failed'
  | 'relic-save-failed'
  | 'invalid-date'
  | 'corrupt'
  | 'import-failed'
  | 'import-succeeded'
  | 'demo-failed'

export interface Banner {
  id: BannerId
  kind: 'error' | 'info'
  message: string
}

export interface SessionState {
  status: 'loading' | 'ready' | 'error'
  /** Set when status is `error`. */
  loadError: string | null
  data: AppData
  /** Last valid date. It is kept when the clock later reports an invalid date. */
  today: LocalDate | null
  banners: Banner[]
  demoMode: boolean
  /** True when the store was empty at load, until the user starts, imports, or loads the demo. */
  onboardingPending: boolean
}

export interface AppStore {
  getState(): SessionState
  subscribe(listener: () => void): () => void
  dispatch(a: Action): Promise<DispatchOutcome>
  setToday(d: LocalDate | null): void
  retryLoad(): void
  dismissBanner(id: BannerId): void
}

export interface StoreOptions {
  adapter: StorageAdapter
  /** Today when the store is created. Null when the clock has no valid date. */
  initialToday: LocalDate | null
  demoMode?: boolean
  makeId?: () => string
  /** Defaults to a synchronous read through `load(adapter)`. */
  loader?: () => LoadResult | Promise<LoadResult>
  loadTimeoutMs?: number
  /** The app fell back to in-memory storage. Shows the "could not be saved" banner (R9.5). */
  storageUnavailable?: boolean
}

export const MESSAGES = {
  NAME_REQUIRED: 'A name is required',
  NAME_TOO_LONG: 'Names can be at most 100 characters',
  UNKNOWN_HABIT: 'That habit no longer exists',
  ALREADY_CHECKED_IN: 'Already checked in today',
  INVALID_DATE: 'The date is invalid',
  NOT_READY: 'The data is not loaded yet',
  CHANGE_NOT_SAVED: 'The change could not be saved',
  CHECK_IN_NOT_SAVED: 'Check-in was not saved',
  RELIC_NOT_SAVED: 'Relic could not be saved',
  IMPORT_FAILED: 'The import failed and your previous data was kept',
  IMPORT_SUCCEEDED: 'Import succeeded',
  DEMO_FAILED: 'The Demo House could not be loaded',
  DATA_NOT_SAVED: 'Data could not be saved',
  CORRUPT: 'Stored data could not be loaded',
  LOAD_FAILED: 'The data could not be loaded',
} as const

const EMPTY: AppData = { schemaVersion: 1, habits: [], checkIns: [], relics: [], nextRoomSeq: 0 }

const isPromiseLike = <T>(v: T | Promise<T>): v is Promise<T> => typeof (v as Promise<T>)?.then === 'function'

export function createStore(options: StoreOptions): AppStore {
  const { loadTimeoutMs = 5000 } = options
  const makeId = options.makeId ?? (() => globalThis.crypto.randomUUID())
  let adapter = options.adapter
  const loader = options.loader ?? (() => load(adapter))
  const listeners = new Set<() => void>()
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  let state: SessionState = {
    status: 'loading',
    loadError: null,
    data: EMPTY,
    today: options.initialToday !== null && isLocalDate(options.initialToday) ? options.initialToday : null,
    banners: [],
    demoMode: options.demoMode ?? false,
    onboardingPending: false,
  }
  if (state.today === null) state = withBanner(state, 'invalid-date', 'error', MESSAGES.INVALID_DATE)
  if (options.storageUnavailable) state = withBanner(state, 'save-failed', 'error', MESSAGES.DATA_NOT_SAVED)

  function set(next: SessionState): void {
    state = next
    for (const l of [...listeners]) l()
  }

  function withBanner(s: SessionState, id: BannerId, kind: Banner['kind'], message: string): SessionState {
    return { ...s, banners: [...s.banners.filter((b) => b.id !== id), { id, kind, message }] }
  }

  function withoutBanners(s: SessionState, ...ids: BannerId[]): SessionState {
    return { ...s, banners: s.banners.filter((b) => !ids.includes(b.id)) }
  }

  // --- Loading (R5.8, R9.6) ---

  function applyLoad(result: LoadResult): void {
    clearTimeout(timer)
    const base: SessionState = { ...state, status: 'ready', loadError: null }
    if (result.kind === 'ok') set({ ...base, data: result.data })
    else if (result.kind === 'empty') set({ ...base, data: EMPTY, onboardingPending: true })
    // The raw value stays in storage until the first change overwrites it (R9.6).
    else set(withBanner({ ...base, data: EMPTY }, 'corrupt', 'error', MESSAGES.CORRUPT))
  }

  function startLoad(): void {
    const mine = ++attempt
    clearTimeout(timer)
    set({ ...state, status: 'loading', loadError: null })
    let result: LoadResult | Promise<LoadResult>
    try {
      result = loader()
    } catch {
      set({ ...state, status: 'error', loadError: MESSAGES.LOAD_FAILED })
      return
    }
    if (!isPromiseLike(result)) {
      applyLoad(result)
      return
    }
    timer = setTimeout(() => {
      if (mine === attempt) set({ ...state, status: 'error', loadError: MESSAGES.LOAD_FAILED })
    }, loadTimeoutMs)
    result.then(
      (r) => {
        if (mine === attempt && state.status === 'loading') applyLoad(r)
      },
      () => {
        if (mine !== attempt) return
        clearTimeout(timer)
        set({ ...state, status: 'error', loadError: MESSAGES.LOAD_FAILED })
      },
    )
  }

  // --- Writing ---

  /** Raw stored value before a write, or undefined when it cannot be read. */
  function readRaw(): string | null | undefined {
    try {
      return adapter.get(STORAGE_KEY)
    } catch {
      return undefined
    }
  }

  /** Writes `next`. On failure it puts the previous raw value back, so a partial write cannot survive. */
  function commit(next: AppData): boolean {
    const previous = readRaw()
    if (save(adapter, next).ok) return true
    try {
      if (previous === null) adapter.remove(STORAGE_KEY)
      else if (previous !== undefined) adapter.set(STORAGE_KEY, previous)
    } catch {
      // The in-memory state stays at the previous data. The caller shows the banner.
    }
    return false
  }

  const saved = (next: AppData, extra: Partial<SessionState> = {}): void =>
    set({ ...withoutBanners(state, 'corrupt', 'save-failed'), ...extra, data: next })

  const fail = (error: ErrorCode, message: string): DispatchOutcome => ({ ok: false, error, message })

  const saveFailed = (id: BannerId, message: string): DispatchOutcome => {
    set(withBanner(state, id, 'error', message))
    return fail('SAVE_FAILED', message)
  }

  /** Awards due relics in a second write, so a relic failure never undoes the check-in (R6.6). */
  function awardRelics(): void {
    if (state.today === null) return
    const { awarded } = evaluateRelics(state.data, state.today)
    if (awarded.length === 0) {
      if (state.banners.some((b) => b.id === 'relic-save-failed')) set(withoutBanners(state, 'relic-save-failed'))
      return
    }
    const next = { ...state.data, relics: [...state.data.relics, ...awarded] }
    if (commit(next)) set({ ...withoutBanners(state, 'relic-save-failed'), data: next })
    else set(withBanner(state, 'relic-save-failed', 'error', MESSAGES.RELIC_NOT_SAVED))
  }

  // --- Actions ---

  function run(a: Action): DispatchOutcome {
    if (state.status !== 'ready') return fail('NOT_READY', MESSAGES.NOT_READY)
    const needsDate = a.type === 'addHabit' || a.type === 'checkIn' || a.type === 'loadDemo' || a.type === 'completeOnboarding'
    const today = state.today
    // The date guard: engine functions are never called with an invalid date (R3.8).
    if (needsDate && (today === null || !isLocalDate(today) || state.banners.some((b) => b.id === 'invalid-date'))) {
      return fail('INVALID_DATE', MESSAGES.INVALID_DATE)
    }

    switch (a.type) {
      case 'addHabit': {
        const r = addHabit(state.data, a.name, today as LocalDate, makeId())
        if (!r.ok) return fail(r.error, MESSAGES[r.error])
        if (!commit(r.value)) return saveFailed('save-failed', MESSAGES.CHANGE_NOT_SAVED)
        saved(r.value, { onboardingPending: false })
        return { ok: true }
      }
      case 'renameHabit': {
        const r = renameHabit(state.data, a.habitId, a.name)
        if (!r.ok) return fail(r.error, MESSAGES[r.error])
        if (!commit(r.value)) return saveFailed('save-failed', MESSAGES.CHANGE_NOT_SAVED)
        saved(r.value)
        return { ok: true }
      }
      case 'deleteHabit': {
        const r = deleteHabit(state.data, a.habitId)
        if (!r.ok) return fail(r.error, MESSAGES[r.error])
        if (!commit(r.value)) return saveFailed('save-failed', MESSAGES.CHANGE_NOT_SAVED)
        saved(r.value)
        return { ok: true }
      }
      case 'checkIn': {
        const r = applyCheckIn(state.data, a.habitId, today as LocalDate)
        if (!r.ok) return fail(r.error, MESSAGES[r.error])
        if (!commit(r.value)) return saveFailed('save-failed', MESSAGES.CHECK_IN_NOT_SAVED)
        saved(r.value)
        awardRelics()
        return { ok: true }
      }
      case 'importData': {
        if (!commit(a.data)) return saveFailed('import-failed', MESSAGES.IMPORT_FAILED)
        saved(a.data, { onboardingPending: false })
        set(withBanner(withoutBanners(state, 'import-failed'), 'import-succeeded', 'info', MESSAGES.IMPORT_SUCCEEDED))
        return { ok: true }
      }
      case 'loadDemo': {
        const demo = buildDemoHouse(today as LocalDate)
        if (!commit(demo)) return saveFailed('demo-failed', MESSAGES.DEMO_FAILED)
        saved(demo, { onboardingPending: false, demoMode: true })
        return { ok: true }
      }
      case 'completeOnboarding': {
        const seeded = state.data.habits.length === 0 ? buildSeedHabits(today as LocalDate) : state.data
        if (!commit(seeded)) {
          // No rollback rule (R9.5): keep the habits in memory and keep the app usable.
          adapter = new MemoryStorageAdapter()
          adapter.set(STORAGE_KEY, serialize(seeded))
          set(withBanner({ ...state, data: seeded, onboardingPending: false }, 'save-failed', 'error', MESSAGES.DATA_NOT_SAVED))
          return { ok: true }
        }
        saved(seeded, { onboardingPending: false })
        return { ok: true }
      }
    }
  }

  startLoad()

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    // The state change happens before the promise is returned, so the UI sees it in the same tick.
    dispatch: (a) => Promise.resolve(run(a)),
    setToday(d) {
      if (d === null || !isLocalDate(d)) {
        // Keep the last good date and view, and show the error (R3.8).
        set(withBanner(state, 'invalid-date', 'error', MESSAGES.INVALID_DATE))
        return
      }
      const recovered = state.banners.some((b) => b.id === 'invalid-date')
      if (d === state.today && !recovered) return
      set({ ...withoutBanners(state, 'invalid-date'), today: d })
      // A date change is an evaluation, so a relic that failed to save is retried (R6.6).
      if (state.status === 'ready') awardRelics()
    },
    retryLoad() {
      if (state.status === 'error') startLoad()
    },
    dismissBanner(id) {
      set(withoutBanners(state, id))
    },
  }
}
