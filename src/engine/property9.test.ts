// Feature: habit-haunting, Property 9: Ghost level mapping
// For any integer n >= 0, ghostLevel(n) is an integer in 0 to 10,
// ghostLevel(n + 1) >= ghostLevel(n), and ghostLevel(n) = 10 for every n >= 10.
// **Validates: Requirements 3.2, 10.5**
import fc from 'fast-check'
import { describe, it } from 'vitest'
import { ghostLevel } from './ghost'

describe('Property 9: Ghost level mapping', () => {
  it('is an integer in 0..10, monotonic, and saturates at 10 for n >= 10', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (n) => {
        const level = ghostLevel(n)
        if (!Number.isInteger(level) || level < 0 || level > 10) return false
        if (ghostLevel(n + 1) < level) return false
        if (n >= 10 && level !== 10) return false
        return true
      }),
      { numRuns: 200 },
    )
  })
})
