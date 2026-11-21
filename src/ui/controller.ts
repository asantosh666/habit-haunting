import { DemoClock, systemClock, type Clock } from '../clock/clock'
import type { LocalDate } from '../dates/localDate'
import { LocalStorageAdapter, MemoryStorageAdapter, type StorageAdapter } from '../persistence/storage'
import { startDateWatcher } from '../store/dateWatcher'
import { createStore, type Action, type AppStore, type DispatchOutcome } from '../store/store'
import { buildExport, serializeExport } from '../transfer/transfer'

export interface Controller {
  store: AppStore
  dispatch(a: Action): Promise<DispatchOutcome>
  /** Demo_Date_Control: moves the current date forward by exactly one day (R8.7). */
  advanceDay(): void
  /** Export_File text for the current data, or null when there is no valid date. */
  exportText(): string | null
  /** Starts the midnight timer, visibility handler, and poll. Returns a stop function. */
  start(): () => void
}

export interface ControllerOptions {
  /** `null` means storage is unavailable. Omit to probe `localStorage`. */
  storage?: StorageAdapter | null
  baseClock?: Clock
  /** The URL query string, for `?demo=1`. */
  search?: string
  now?: () => string
  makeId?: () => string
}

function probeLocalStorage(): StorageAdapter | null {
  try {
    const probe = 'habit-haunting:probe'
    globalThis.localStorage.setItem(probe, '1')
    globalThis.localStorage.removeItem(probe)
    return new LocalStorageAdapter(globalThis.localStorage)
  } catch {
    return null
  }
}

/** Connects the store, clock, persistence, and demo mode. */
export function createController(options: ControllerOptions = {}): Controller {
  const probed = options.storage === undefined ? probeLocalStorage() : options.storage
  const storageUnavailable = probed === null
  const adapter = probed ?? new MemoryStorageAdapter()
  const baseClock = options.baseClock ?? systemClock
  const now = options.now ?? (() => new Date().toISOString())
  const demoFromUrl = new URLSearchParams(options.search ?? '').get('demo') === '1'

  const demoClock = new DemoClock(baseClock, adapter)
  let demoMode = demoFromUrl
  const clock: Clock = { today: () => (demoMode ? demoClock.today() : baseClock.today()) }

  const store = createStore({
    adapter,
    initialToday: clock.today(),
    demoMode: demoFromUrl,
    makeId: options.makeId,
    storageUnavailable,
  })

  // Keep the clock choice in step with the store's demo flag.
  store.subscribe(() => {
    demoMode = store.getState().demoMode
  })

  return {
    store,
    async dispatch(a) {
      if (a.type !== 'loadDemo') return store.dispatch(a)
      // A fresh demo house starts at the real date. Undo that if the load fails.
      const previousOffset = demoClock.offsetDays
      const wasDemo = demoMode
      demoClock.reset()
      demoMode = false
      store.setToday(baseClock.today())
      const outcome = await store.dispatch(a)
      if (!outcome.ok) {
        demoClock.offsetDays = previousOffset
        demoMode = wasDemo
        store.setToday(clock.today())
      }
      return outcome
    },
    advanceDay() {
      demoClock.advanceOneDay()
      store.setToday(clock.today())
    },
    exportText() {
      const { data, today } = store.getState()
      if (today === null) return null
      return serializeExport(buildExport(data, today as LocalDate, now()))
    },
    start: () => startDateWatcher({ clock, store }),
  }
}
