import { addDays, isLocalDate, type LocalDate } from '../dates/localDate'
import { DEMO_OFFSET_KEY } from '../persistence/persistence'
import type { StorageAdapter } from '../persistence/storage'

/** `today()` returns null when the date is unavailable (R3.8). */
export interface Clock {
  today(): LocalDate | null
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0')

/**
 * The only function that reads local time fields (R10.1). Returns null for an invalid Date.
 * It takes the Date as a parameter so tests can drive it.
 */
export function localDateFromSystem(now: Date): LocalDate | null {
  const y = now.getFullYear()
  if (Number.isNaN(y)) return null
  const date = `${pad(y, 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`
  return isLocalDate(date) ? date : null
}

export const systemClock: Clock = {
  today: () => localDateFromSystem(new Date()),
}

/**
 * Wraps a clock with a whole-day offset. Each `advanceOneDay` adds exactly one day (R8.7).
 * The offset is saved under its own key, so it never enters the export file.
 */
export class DemoClock implements Clock {
  offsetDays = 0

  constructor(
    private readonly base: Clock,
    private readonly storage?: StorageAdapter,
  ) {
    try {
      const raw = storage?.get(DEMO_OFFSET_KEY)
      const n = raw == null ? 0 : Number(raw)
      if (Number.isInteger(n) && n >= 0) this.offsetDays = n
    } catch {
      // Unreadable storage: start at offset 0.
    }
  }

  today(): LocalDate | null {
    const base = this.base.today()
    return base === null ? null : addDays(base, this.offsetDays)
  }

  /** Sets the offset back to 0, for when a new demo house is loaded. */
  reset(): void {
    this.offsetDays = 0
    try {
      this.storage?.set(DEMO_OFFSET_KEY, '0')
    } catch {
      // The offset stays in session state when it cannot be saved.
    }
  }

  advanceOneDay(): void {
    this.offsetDays += 1
    try {
      this.storage?.set(DEMO_OFFSET_KEY, String(this.offsetDays))
    } catch {
      // The offset stays in session state when it cannot be saved.
    }
  }
}
