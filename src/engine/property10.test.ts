// Feature: habit-haunting, Property 10: Ghost size and opacity
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ghostOpacity, ghostSize } from './ghost'

describe('Property 10: Ghost size and opacity', () => {
  it('**Validates: Requirements 3.3, 5.6** size and opacity strictly increase with level, opacity within [0.1, 1.0]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (level) => {
        const opacity = ghostOpacity(level)
        expect(opacity).toBeGreaterThanOrEqual(0.1)
        expect(opacity).toBeLessThanOrEqual(1.0)
        if (level >= 2) {
          expect(ghostSize(level)).toBeGreaterThan(ghostSize(level - 1))
          expect(ghostOpacity(level)).toBeGreaterThan(ghostOpacity(level - 1))
        }
      }),
      { numRuns: 100 },
    )
  })

  it('level 0 produces no ghost', () => {
    expect(ghostSize(0)).toBe(0)
    expect(ghostOpacity(0)).toBe(0)
  })
})
