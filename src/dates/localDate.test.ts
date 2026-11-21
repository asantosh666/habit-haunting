import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DST_TRANSITIONS } from '../test/fixtures'
import { localDate } from '../test/arbitraries'
import {
  addDays,
  diffDays,
  fromDayNumber,
  isLocalDate,
  toDayNumber,
  weekDays,
  weekStartMonday,
} from './localDate'

// Independent weekday: 0 = Sunday .. 6 = Saturday.
const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay()

describe('isLocalDate', () => {
  it('accepts generated dates and DST fixture dates', () => {
    fc.assert(fc.property(localDate, (d) => isLocalDate(d)))
    for (const t of DST_TRANSITIONS) expect(isLocalDate(t.date)).toBe(true)
  })

  it('rejects malformed strings', () => {
    for (const s of ['', 'abc']) expect(isLocalDate(s)).toBe(false)
    fc.assert(
      fc.property(localDate, (d) => {
        const [y, m, day] = d.split('-')
        expect(isLocalDate(`${y}-${Number(m)}-${day}`)).toBe(Number(m) >= 10)
        expect(isLocalDate(`${y}${m}${day}`)).toBe(false)
        expect(isLocalDate(`${d}T00:00`)).toBe(false)
      }),
    )
  })
  it('rejects impossible calendar dates built from a valid one', () => {
    fc.assert(
      fc.property(localDate, (d) => {
        const [y, m] = d.split('-')
        expect(isLocalDate(`${y}-${m}-00`)).toBe(false)
        expect(isLocalDate(`${y}-${m}-32`)).toBe(false)
        expect(isLocalDate(`${y}-13-01`)).toBe(false)
        expect(isLocalDate(`${y}-00-10`)).toBe(false)
      }),
    )
  })

  it('rejects Feb 30 and accepts Feb 29 only in leap years', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999 }), (year) => {
        const y = String(year).padStart(4, '0')
        const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
        expect(isLocalDate(`${y}-02-30`)).toBe(false)
        expect(isLocalDate(`${y}-02-29`)).toBe(leap)
      }),
    )
  })
})

describe('day numbers', () => {
  it('round-trips and is consecutive', () => {
    fc.assert(
      fc.property(localDate, (d) => {
        expect(fromDayNumber(toDayNumber(d))).toBe(d)
        expect(fromDayNumber(toDayNumber(d) + 1)).toBe(addDays(d, 1))
      }),
    )
  })
})

describe('addDays and diffDays', () => {
  it('are inverse operations', () => {
    fc.assert(
      fc.property(localDate, fc.integer({ min: -100_000, max: 100_000 }), (d, k) => {
        const shifted = addDays(d, k)
        expect(isLocalDate(shifted)).toBe(true)
        expect(diffDays(shifted, d)).toBe(k)
        expect(addDays(shifted, -k)).toBe(d)
      }),
    )
  })

  it('advances exactly one day across every DST transition day', () => {
    for (const t of DST_TRANSITIONS) {
      expect(diffDays(addDays(t.date, 1), t.date)).toBe(1)
      expect(diffDays(t.date, addDays(t.date, -1))).toBe(1)
      expect(addDays(addDays(t.date, 1), -1)).toBe(t.date)
    }
  })
})

describe('weekStartMonday and weekDays', () => {
  it('returns a Monday on or within 6 days before d', () => {
    fc.assert(
      fc.property(localDate, (d) => {
        const start = weekStartMonday(d)
        expect(weekday(start)).toBe(1)
        const gap = diffDays(d, start)
        expect(gap).toBeGreaterThanOrEqual(0)
        expect(gap).toBeLessThanOrEqual(6)
      }),
    )
  })

  it('returns 7 consecutive days Monday to Sunday containing d', () => {
    fc.assert(
      fc.property(localDate, (d) => {
        const days = weekDays(d)
        expect(days).toHaveLength(7)
        expect(days).toContain(d)
        expect(weekday(days[0])).toBe(1)
        expect(weekday(days[6])).toBe(0)
        for (let i = 1; i < 7; i++) expect(diffDays(days[i], days[i - 1])).toBe(1)
      }),
    )
  })
})
