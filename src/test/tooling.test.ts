import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { appData, corruptedExport, exportFile, habitName, localDate } from './arbitraries'
import { DST_TRANSITIONS } from './fixtures'

describe('test tooling', () => {
  it('runs under the TZ configured by the Vitest project', () => {
    expect(process.env.TZ).toBeTruthy()
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ)
  })

  it('has a DST fixture for every supported zone', () => {
    const zones = new Set(DST_TRANSITIONS.map((t) => t.zone))
    expect(zones.has(process.env.TZ ?? '')).toBe(true)
  })

  it('localDate generates real calendar dates', () => {
    fc.assert(
      fc.property(localDate, (d) => {
        expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        const [, m, day] = d.split('-').map(Number)
        expect(m).toBeGreaterThanOrEqual(1)
        expect(m).toBeLessThanOrEqual(12)
        expect(day).toBeGreaterThanOrEqual(1)
        expect(day).toBeLessThanOrEqual(28)
      }),
    )
  })

  it('habitName generates trimmed names of 1 to 100 characters', () => {
    fc.assert(
      fc.property(habitName, (n) => {
        expect(n).toBe(n.trim())
        expect(n.length).toBeGreaterThanOrEqual(1)
        expect(n.length).toBeLessThanOrEqual(100)
      }),
    )
  })

  it('appData and exportFile are internally consistent', () => {
    fc.assert(
      fc.property(appData, exportFile, (a, f) => {
        for (const d of [a, f]) {
          const ids = new Set(d.habits.map((h) => h.id))
          expect(ids.size).toBe(d.habits.length)
          expect(d.checkIns.every((c) => ids.has(c.habitId))).toBe(true)
          expect(d.relics.every((r) => ids.has(r.habitId))).toBe(true)
        }
        expect(f.ghosts).toHaveLength(f.habits.length)
      }),
    )
  })

  it('corruptedExport never produces a valid-looking export', () => {
    fc.assert(
      fc.property(corruptedExport, (c) => {
        if (c.expected === 'NOT_JSON') {
          expect(() => JSON.parse(c.text)).toThrow()
        } else {
          expect(() => JSON.parse(c.text)).not.toThrow()
        }
      }),
    )
  })
})
