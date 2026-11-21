// The single place literal calendar dates live in tests.
// Tests import these instead of writing date strings.

export type DstTransition = {
  zone: string
  kind: 'spring-forward' | 'fall-back'
  /** The local calendar day that is 23 or 25 hours long, as YYYY-MM-DD. */
  date: string
}

export const DST_TRANSITIONS: readonly DstTransition[] = [
  { zone: 'America/New_York', kind: 'spring-forward', date: '2025-03-09' },
  { zone: 'America/New_York', kind: 'fall-back', date: '2025-11-02' },
  { zone: 'Europe/London', kind: 'spring-forward', date: '2025-03-30' },
  { zone: 'Europe/London', kind: 'fall-back', date: '2025-10-26' },
  { zone: 'Pacific/Auckland', kind: 'spring-forward', date: '2025-09-28' },
  { zone: 'Pacific/Auckland', kind: 'fall-back', date: '2025-04-06' },
]

/** A fixed base date for tests that need one concrete "today". Prefer arbitraries. */
export const BASE_DATE = '2025-06-15'
