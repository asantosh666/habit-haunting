import type { CandleVM } from '../engine/types'

/** Name, streak, and missed days of the selected candle, as whole numbers (R5.5). */
export function CandleDetail({ candle }: { candle: CandleVM }) {
  return (
    <section className="panel" aria-label="Candle detail">
      <h2>{candle.name}</h2>
      <p>
        Streak: <strong>{candle.streak}</strong> {candle.streak === 1 ? 'day' : 'days'}
      </p>
      <p>
        Missed days: <strong>{candle.missedDays}</strong> {candle.missedDays === 1 ? 'day' : 'days'}
      </p>
    </section>
  )
}
