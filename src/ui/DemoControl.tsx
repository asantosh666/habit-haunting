interface Props {
  today: string | null
  onAdvance(): void
}

/** Shown in demo mode. Each press moves the date forward by one day (R8.7). */
export function DemoControl({ today, onAdvance }: Props) {
  return (
    <section className="panel" aria-label="Demo date control">
      <span>Demo date: {today ?? 'unavailable'} </span>
      <button type="button" onClick={onAdvance}>
        Next day
      </button>
    </section>
  )
}
