import type { Clock } from '../clock/clock'
import type { LocalDate } from '../dates/localDate'

export interface VisibilitySource {
  visibilityState?: string
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export interface DateWatcherOptions {
  clock: Clock
  store: { setToday(d: LocalDate | null): void }
  /** Milliseconds until the next local midnight. */
  msUntilMidnight?: () => number
  pollMs?: number
  /** Where `visibilitychange` is observed. Defaults to `document` when it exists. */
  doc?: VisibilitySource
}

const MIDNIGHT_SLACK_MS = 50
const MAX_TIMER_MS = 2 ** 31 - 1

/** Milliseconds from now to the next local 00:00:00. */
export function defaultMsUntilMidnight(): number {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return next.getTime() - now.getTime()
}

/**
 * Re-reads the clock at the next midnight, whenever the page becomes visible, and every
 * 30 seconds (R10.2). The poll covers timers that drift while the machine sleeps.
 * Returns a function that stops all three.
 */
export function startDateWatcher(options: DateWatcherOptions): () => void {
  const { clock, store, pollMs = 30_000 } = options
  const msUntilMidnight = options.msUntilMidnight ?? defaultMsUntilMidnight
  const doc = options.doc ?? (typeof document === 'undefined' ? undefined : document)
  let midnightTimer: ReturnType<typeof setTimeout> | undefined

  const refresh = (): void => store.setToday(clock.today())

  const armMidnight = (): void => {
    clearTimeout(midnightTimer)
    const delay = Math.min(Math.max(msUntilMidnight(), 0) + MIDNIGHT_SLACK_MS, MAX_TIMER_MS)
    midnightTimer = setTimeout(() => {
      refresh()
      armMidnight()
    }, delay)
  }

  const onVisibility = (): void => {
    if (doc?.visibilityState !== 'hidden') {
      refresh()
      armMidnight()
    }
  }

  const poll = setInterval(refresh, pollMs)
  doc?.addEventListener('visibilitychange', onVisibility)
  armMidnight()

  return () => {
    clearTimeout(midnightTimer)
    clearInterval(poll)
    doc?.removeEventListener('visibilitychange', onVisibility)
  }
}
