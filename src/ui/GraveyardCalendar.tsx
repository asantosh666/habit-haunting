import type { DashboardViewModel } from '../engine/types'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  week: DashboardViewModel['week']
  names: Record<string, string>
}

const MARKS = {
  checked: { symbol: '✓', label: 'checked in', className: 'cell-checked' },
  missed: { symbol: '✗', label: 'missed', className: 'cell-missed' },
  none: { symbol: '', label: 'no mark', className: '' },
} as const

/** Monday to Sunday grid with one row per habit (R5.3, R5.4). */
export function GraveyardCalendar({ week, names }: Props) {
  return (
    <section className="panel" aria-label="Graveyard calendar">
      <h2>Graveyard</h2>
      {week.rows.length === 0 ? (
        <p className="muted">No habits to show.</p>
      ) : (
        <table className="calendar">
          <thead>
            <tr>
              <th scope="col">Habit</th>
              {week.days.map((d, i) => (
                <th key={d} scope="col">
                  {DAY_NAMES[i]} <span className="muted">{d.slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {week.rows.map((row) => (
              <tr key={row.habitId}>
                <th scope="row">{names[row.habitId]}</th>
                {row.cells.map((cell, i) => {
                  const mark = MARKS[cell]
                  return (
                    <td
                      key={week.days[i]}
                      className={mark.className}
                      data-cell={cell}
                      aria-label={`${names[row.habitId]}, ${DAY_NAMES[i]}: ${mark.label}`}
                    >
                      {mark.symbol}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
