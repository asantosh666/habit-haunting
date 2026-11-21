// Feature: habit-haunting, Property 19: Export and import round trip
// **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { deriveHabitState } from '../engine/streak'
import { appData, exportFile, localDate } from '../test/arbitraries'
import { buildExport, importToAppData, parseExport, serializeExport } from './transfer'

const stamp = fc.constantFrom('2000-01-01T00:00:00.000Z', '2030-06-30T12:34:56.000Z')

describe('Property 19: Export and import round trip', () => {
  it('export, import, export gives an equal file apart from exportedAt', () => {
    fc.assert(
      fc.property(appData, localDate, stamp, stamp, (data, today, t1, t2) => {
        const first = buildExport(data, today, t1)
        const text = serializeExport(first)
        const parsed = parseExport(text)
        if (!parsed.ok) return false
        const imported = importToAppData(parsed.value)
        const second = buildExport(imported, today, t2)
        expect({ ...second, exportedAt: '' }).toEqual({ ...first, exportedAt: '' })
        expect(serializeExport({ ...second, exportedAt: t1 })).toBe(text)
        return true
      }),
      { numRuns: 100 },
    )
  })

  it('the import has the same streaks, ghost levels, and relics, and the export has every record', () => {
    fc.assert(
      fc.property(appData, localDate, (data, today) => {
        const file = buildExport(data, today, 'x')
        expect(file.habits).toHaveLength(data.habits.length)
        expect(file.checkIns).toHaveLength(data.checkIns.length)
        expect(file.relics).toHaveLength(data.relics.length)
        expect(file.ghosts.map((g) => g.habitId).sort()).toEqual(data.habits.map((h) => h.id).sort())
        const parsed = parseExport(serializeExport(file))
        if (!parsed.ok) return false
        const imported = importToAppData(parsed.value)
        for (const habit of data.habits) {
          const original = deriveHabitState(habit, data.checkIns, today)
          const restored = deriveHabitState(
            imported.habits.find((h) => h.id === habit.id)!,
            imported.checkIns,
            today,
          )
          expect(restored.streak).toBe(original.streak)
          expect(restored.ghostLevel).toBe(original.ghostLevel)
        }
        const key = (r: { habitId: string; milestone: number }) => `${r.habitId}|${r.milestone}`
        expect([...imported.relics].sort((a, b) => key(a).localeCompare(key(b)))).toEqual(
          [...data.relics].sort((a, b) => key(a).localeCompare(key(b))),
        )
        return true
      }),
      { numRuns: 100 },
    )
  })

  it('accepts every well-formed export file', () => {
    fc.assert(
      fc.property(exportFile, (file) => {
        const parsed = parseExport(JSON.stringify(file))
        expect(parsed.ok).toBe(true)
        if (parsed.ok) expect(parsed.value).toEqual(file)
        return true
      }),
      { numRuns: 100 },
    )
  })
})
