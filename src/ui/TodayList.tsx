import { useState } from 'react'
import type { DashboardViewModel } from '../engine/types'
import type { DispatchOutcome } from '../store/store'

interface Props {
  items: DashboardViewModel['todayList']
  onCheckIn(habitId: string): Promise<DispatchOutcome>
}

export function TodayList({ items, onCheckIn }: Props) {
  const [messages, setMessages] = useState<Record<string, string>>({})

  async function check(habitId: string) {
    const outcome = await onCheckIn(habitId)
    // A failed save is reported by the banner. Other errors show here, next to the habit.
    const text = outcome.ok || outcome.error === 'SAVE_FAILED' ? '' : outcome.message
    setMessages((m) => ({ ...m, [habitId]: text }))
  }

  return (
    <section className="panel" aria-label="Today">
      <h2>Today</h2>
      {items.length === 0 ? (
        <p className="muted">No habits to check in.</p>
      ) : (
        <ul className="today-list">
          {items.map((item) => (
            <li key={item.habitId} className="row" data-checked-in={item.checkedIn}>
              <span>
                {item.name} <span className="muted">{item.checkedIn ? '(checked in)' : '(not checked in)'}</span>
              </span>
              <span className="actions">
                <button
                  type="button"
                  className="primary"
                  aria-label={`Check in ${item.name}`}
                  onClick={() => void check(item.habitId)}
                >
                  Check in
                </button>
              </span>
              {messages[item.habitId] && (
                <p role="status" className="field-error">
                  {messages[item.habitId]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
