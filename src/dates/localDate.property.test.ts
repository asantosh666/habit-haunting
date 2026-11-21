import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { localDate } from '../test/arbitraries'
import { addDays, diffDays, weekDays } from './localDate'

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const daysInMonth = (y: number, m: number) =>
  m === 2 ? (isLeap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31
const pad = (n: number, w: number) => String(n).padStart(w, '0')

/** Independent "next calendar date" computed from calendar rules, not from epoch arithmetic. */
const nextByCalendar = (s: string): string => {
  const { y, m, d } = parse(s)
  if (d < daysInMonth(y, m)) return `${pad(y, 4)}-${pad(m, 2)}-${pad(d + 1, 2)}`
  if (m < 12) return `${pad(y, 4)}-${pad(m + 1, 2)}-01`
  return `${pad(y + 1, 4)}-01-01`
}

// Day of week (0 = Sunday) from calendar components via Zeller-style Sakamoto algorithm.
const dayOfWeek = (s: string): number => {
  const { y: y0, m, d } = parse(s)
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  const y = m < 3 ? y0 - 1 : y0
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7
}

const offset = fc.integer({ min: -100_000, max: 100_000 })

describe('date arithmetic properties', () => {
  // Feature: habit-haunting, Property 3: Date arithmetic is exact and time-zone independent
  // Validates: Requirements 10.1, 10.3, 5.3
  it('diffDays/addDays round-trip exactly', () => {
    fc.assert(
      fc.property(localDate, offset, (d, k) => {
        expect(diffDays(addDays(d, k), d)).toBe(k)
        expect(addDays(addDays(d, k), -k)).toBe(d)
      }),
      { numRuns: 200 },
    )
  })

  // Feature: habit-haunting, Property 3: Date arithmetic is exact and time-zone independent
  it('addDays(d, 1) is the next calendar date', () => {
    fc.assert(
      fc.property(localDate, (d) => {
        expect(addDays(d, 1)).toBe(nextByCalendar(d))
      }),
      { numRuns: 200 },
    )
    // Month, year and leap-day boundaries (arbitrary caps day at 28, so cover them via offsets).
    fc.assert(
      fc.property(localDate, fc.integer({ min: 0, max: 40 }), (d, k) => {
        const start = addDays(d, k)
        expect(addDays(start, 1)).toBe(nextByCalendar(start))
      }),
      { numRuns: 200 },
    )
  })

  // Feature: habit-haunting, Property 3: Date arithmetic is exact and time-zone independent
  it('weekDays(d) is 7 consecutive dates, Monday to Sunday, containing d', () => {
    fc.assert(
      fc.property(localDate, offset, (d0, k) => {
        const d = addDays(d0, k)
        const week = weekDays(d)
        expect(week).toHaveLength(7)
        expect(week).toContain(d)
        week.forEach((day, i) => {
          if (i > 0) expect(day).toBe(addDays(week[i - 1], 1))
          expect(dayOfWeek(day)).toBe((i + 1) % 7) // Monday = 1 ... Sunday = 0
        })
      }),
      { numRuns: 200 },
    )
  })
})
