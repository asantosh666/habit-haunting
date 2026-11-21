import type { DispatchOutcome } from '../store/store'

interface Props {
  onStart(): Promise<DispatchOutcome>
  onLoadDemo(): Promise<DispatchOutcome>
}

/** One action creates the three seed habits. The demo option is on the same screen (R8.1 to R8.3). */
export function Onboarding({ onStart, onLoadDemo }: Props) {
  return (
    <section className="panel" aria-label="Welcome">
      <h2>Welcome to Habit Haunting</h2>
      <p>
        Every habit is a candle. Keep it lit, or the ghost grows. Start with three habits: Drink water, Move for 10
        minutes, and Read 10 pages.
      </p>
      <p className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="primary" onClick={() => void onStart()}>
          Start
        </button>
        <button type="button" onClick={() => void onLoadDemo()}>
          Load Demo House
        </button>
      </p>
    </section>
  )
}
