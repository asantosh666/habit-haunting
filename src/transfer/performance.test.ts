import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import type { AppData, CheckIn, Habit } from '../engine/types'
import { BASE_DATE } from '../test/fixtures'
import { buildExport, importToAppData, parseExport, serializeExport } from './transfer'

const HABITS = 100
const CHECK_INS_PER_HABIT = 100

function bigData(): AppData {
  const habits: Habit[] = []
  const checkIns: CheckIn[] = []
  for (let i = 0; i < HABITS; i++) {
    const id = `habit-${i}`
    habits.push({ id, name: `Habit ${i}`, frequency: 'daily', createdOn: addDays(BASE_DATE, -300), homeRoom: 'parlor' })
    for (let d = 0; d < CHECK_INS_PER_HABIT; d++) checkIns.push({ habitId: id, date: addDays(BASE_DATE, -d) })
  }
  return { schemaVersion: 1, habits, checkIns, relics: [], nextRoomSeq: HABITS }
}

describe('export and import performance (R7.1, R7.2)', () => {
  const data = bigData()

  it('has the size under test', () => {
    expect(data.habits).toHaveLength(100)
    expect(data.checkIns).toHaveLength(10_000)
  })

  it('exports 100 habits and 10,000 check-ins in under 2 seconds', () => {
    const start = performance.now()
    const text = serializeExport(buildExport(data, BASE_DATE, 'stamp'))
    expect(performance.now() - start).toBeLessThan(2000)
    expect(text.length).toBeGreaterThan(0)
  })

  it('imports them in under 5 seconds', () => {
    const text = serializeExport(buildExport(data, BASE_DATE, 'stamp'))
    const start = performance.now()
    const parsed = parseExport(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(importToAppData(parsed.value).checkIns).toHaveLength(10_000)
    expect(performance.now() - start).toBeLessThan(5000)
  })
})
