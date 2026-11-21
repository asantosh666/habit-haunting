import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The suite runs once per time zone so DST and offset bugs surface (R10.1, R10.3).
const zones = ['America/New_York', 'Europe/London', 'Pacific/Auckland']

export default defineConfig({
  plugins: [react()],
  test: {
    projects: zones.map((tz) => ({
      extends: true,
      test: {
        name: tz,
        include: ['src/**/*.test.{ts,tsx}'],
        pool: 'forks',
        env: { TZ: tz },
        setupFiles: ['src/test/setup.ts'],
      },
    })),
  },
})
