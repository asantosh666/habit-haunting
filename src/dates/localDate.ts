// Calendar-date arithmetic on "YYYY-MM-DD" strings.
// Dates map to UTC day numbers, so DST never changes a result (R10.3).
// This module never reads the system clock.

/** "YYYY-MM-DD", validated by isLocalDate. */
export type LocalDate = string

const MS_PER_DAY = 86_400_000
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/

function utcMs(year: number, month: number, day: number): number {
  // Date.UTC maps years 0..99 to 1900..1999, so set the year explicitly.
  const d = new Date(0)
  d.setUTCFullYear(year, month - 1, day)
  return d.getTime()
}

/** True for a well-formed YYYY-MM-DD that is a real calendar date (rejects 2025-02-30). */
export function isLocalDate(s: string): boolean {
  if (typeof s !== 'string') return false
  const m = FORMAT.exec(s)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1) return false
  const date = new Date(utcMs(y, mo, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** Days since 1970-01-01 (UTC). Input must satisfy isLocalDate. */
export function toDayNumber(d: LocalDate): number {
  const m = FORMAT.exec(d)
  if (!m) throw new RangeError(`Invalid LocalDate: ${d}`)
  return utcMs(Number(m[1]), Number(m[2]), Number(m[3])) / MS_PER_DAY
}

export function fromDayNumber(n: number): LocalDate {
  const date = new Date(n * MS_PER_DAY)
  const y = String(date.getUTCFullYear()).padStart(4, '0')
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

export function addDays(d: LocalDate, k: number): LocalDate {
  return fromDayNumber(toDayNumber(d) + k)
}

/** a - b in whole days. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return toDayNumber(a) - toDayNumber(b)
}

/** The Monday on or before d. 1970-01-01 (day 0) was a Thursday, so day -3 is a Monday. */
export function weekStartMonday(d: LocalDate): LocalDate {
  const n = toDayNumber(d)
  const sinceMonday = (((n + 3) % 7) + 7) % 7
  return fromDayNumber(n - sinceMonday)
}

/** Seven dates, Monday to Sunday, containing d. */
export function weekDays(d: LocalDate): LocalDate[] {
  const start = toDayNumber(weekStartMonday(d))
  return Array.from({ length: 7 }, (_, i) => fromDayNumber(start + i))
}
