import { sortRelics } from '../engine/relics'
import type { Relic } from '../engine/types'

interface Props {
  relics: readonly Relic[]
  names: Record<string, string>
}

/** Relics newest first, or an empty-state message (R6.4, R6.7). */
export function RelicList({ relics, names }: Props) {
  const sorted = sortRelics(relics)
  return (
    <section className="panel" aria-label="Relics">
      <h2>Relics</h2>
      {sorted.length === 0 ? (
        <p className="muted">No relics have been earned yet.</p>
      ) : (
        <ul className="relics">
          {sorted.map((r) => (
            <li key={`${r.habitId}-${r.milestone}`} className="row">
              <span>{names[r.habitId] ?? 'Unknown habit'}</span>
              <span>{r.milestone} days</span>
              <span className="muted">{r.awardedOn}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
