import { useState } from 'react'
import type { DispatchOutcome } from '../store/store'
import { HabitForm } from './HabitForm'

interface Props {
  habits: { habitId: string; name: string }[]
  onAdd(name: string): Promise<DispatchOutcome>
  onRename(habitId: string, name: string): Promise<DispatchOutcome>
  onDelete(habitId: string): Promise<DispatchOutcome>
}

/** Add, rename, and delete (with confirmation) (R1.1, R1.5, R1.7). */
export function HabitManager({ habits, onAdd, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <section className="panel" aria-label="Habits">
      <h2>Habits</h2>
      <HabitForm label="New habit name" submitLabel="Add habit" onSubmit={onAdd} />
      <ul className="manage-list" style={{ marginTop: '0.75rem' }}>
        {habits.map((h) => (
          <li key={h.habitId} className="row">
            {editing === h.habitId ? (
              <HabitForm
                label={`New name for ${h.name}`}
                submitLabel="Save name"
                initialName={h.name}
                onSubmit={(name) => onRename(h.habitId, name)}
                onDone={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : deleting === h.habitId ? (
              <div role="alertdialog" aria-label={`Delete ${h.name}`}>
                <p>Delete “{h.name}” with its check-ins and ghost?</p>
                <span className="actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setDeleting(null)
                      void onDelete(h.habitId)
                    }}
                  >
                    Confirm delete
                  </button>
                  <button type="button" onClick={() => setDeleting(null)}>
                    Cancel
                  </button>
                </span>
              </div>
            ) : (
              <>
                <span>{h.name}</span>
                <span className="actions">
                  <button type="button" aria-label={`Rename ${h.name}`} onClick={() => setEditing(h.habitId)}>
                    Rename
                  </button>
                  <button type="button" aria-label={`Delete ${h.name}`} onClick={() => setDeleting(h.habitId)}>
                    Delete
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
