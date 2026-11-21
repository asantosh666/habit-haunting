// Component tests run in jsdom through a `// @vitest-environment jsdom` docblock.
// Vitest globals are off, so Testing Library cannot register its own cleanup.
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
