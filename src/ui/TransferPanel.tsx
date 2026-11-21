import { useId, useState, type ChangeEvent } from 'react'
import type { AppData } from '../engine/types'
import type { DispatchOutcome } from '../store/store'
import { importToAppData, parseExport } from '../transfer/transfer'

interface Props {
  exportText(): string | null
  onImport(data: AppData): Promise<DispatchOutcome>
  /** Saves the export. The default downloads it as a file. */
  download?(filename: string, text: string): void
}

function downloadFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const IMPORT_ERRORS = {
  NOT_JSON: 'The file is not valid JSON.',
  BAD_STRUCTURE: 'The file does not match the export structure.',
} as const

/** Export, and import with a confirmation step (R7.1, R7.5 to R7.7). */
export function TransferPanel({ exportText, onImport, download = downloadFile }: Props) {
  const [pending, setPending] = useState<AppData | null>(null)
  const [error, setError] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const inputId = useId()

  function doExport() {
    const text = exportText()
    if (text === null) {
      setError('The date is invalid, so the data cannot be exported.')
      return
    }
    setError('')
    download('habit-haunting-export.json', text)
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const parsed = parseExport(await file.text())
    if (!parsed.ok) {
      setPending(null)
      setError(IMPORT_ERRORS[parsed.error])
    } else {
      setError('')
      setPending(importToAppData(parsed.value))
    }
  }

  function discard() {
    // Cancel closes the prompt and drops the selected file (R7.7).
    setPending(null)
    setInputKey((k) => k + 1)
  }

  async function confirm() {
    const data = pending
    discard()
    if (data) await onImport(data)
  }

  return (
    <section className="panel" aria-label="Export and import">
      <h2>Export and import</h2>
      <p>
        <button type="button" onClick={doExport}>
          Export data
        </button>
      </p>
      <p>
        <label htmlFor={inputId}>Import file </label>
        <input key={inputKey} id={inputId} type="file" accept="application/json,.json" onChange={(e) => void pick(e)} />
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {pending && (
        <div role="dialog" aria-label="Confirm import" className="dialog">
          <p>Importing will replace all existing data. Replace it?</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => void confirm()}>
              Replace data
            </button>
            <button type="button" onClick={discard}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
