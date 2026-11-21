import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DEMO_OFFSET_KEY } from '../persistence/persistence'
import { MemoryStorageAdapter } from '../persistence/storage'
import { DemoClock, localDateFromSystem, systemClock } from './clock'

const pad = (n: number, w: number) => String(n).padStart(w, '0')

describe('clock', () => {
  it('localDateFromSystem uses the local year, month, and day at any local time', () => {
    fc.assert(
      fc.property(
        fc.record({
          y: fc.integer({ min: 1970, max: 2100 }),
          m: fc.integer({ min: 0, max: 11 }),
          d: fc.integer({ min: 1, max: 28 }),
          h: fc.integer({ min: 0, max: 23 }),
          mi: fc.integer({ min: 0, max: 59 }),
        }),
        ({ y, m, d, h, mi }) => {
          expect(localDateFromSystem(new Date(y, m, d, h, mi, 30))).toBe(`${pad(y, 4)}-${pad(m + 1, 2)}-${pad(d, 2)}`)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('returns null for an invalid system date', () => {
    expect(localDateFromSystem(new Date(Number.NaN))).toBeNull()
  })

  it('systemClock returns a valid date', () => {
    expect(systemClock.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('DemoClock passes through a null base and ignores a bad stored offset', () => {
    const storage = new MemoryStorageAdapter()
    storage.set(DEMO_OFFSET_KEY, 'abc')
    const clock = new DemoClock({ today: () => null }, storage)
    expect(clock.today()).toBeNull()
    expect(clock.offsetDays).toBe(0)
  })
})
