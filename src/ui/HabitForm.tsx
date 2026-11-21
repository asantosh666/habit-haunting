import { useId, useState, type FormEvent } from 'react'
import type { DispatchOutcome } from '../store/store'

interface Props {
  label: string
  submitLabel: string
  initialName?: string
  onSubmit(name: string): Promise<DispatchOutcome>
  /** Called after a successful submit. */
  onDone?(): void
  onCancel?(): void
}

/** Add or edit form with inline name validation (R1.3, R1.4, R1.6). */
export function HabitForm({ label, submitLabel, initialName = '', onSubmit, onDone, onCancel }: Props) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const errorId = useId()

  async function submit(e: FormEvent) {
    e.preventDefault()
    const outcome = await onSubmit(name)
    if (outcome.ok) {
      setName('')
      setError('')
      onDone?.()
    } else {
      // A failed save is reported by the banner. Name errors show next to the field.
      setError(outcome.error === 'SAVE_FAILED' ? '' : outcome.message)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} aria-label={label}>
      <label>
        <span className="sr-only">{label}</span>
        <input
          type="text"
          value={name}
          placeholder={label}
          aria-invalid={error !== ''}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => setName(e.target.value)}
        />
      </label>{' '}
      <button type="submit" className="primary">
        {submitLabel}
      </button>
      {onCancel && (
        <>
          {' '}
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </>
      )}
      {error && (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      )}
    </form>
  )
}
