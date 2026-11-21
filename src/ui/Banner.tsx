import type { Banner as BannerState, BannerId } from '../store/store'

interface Props {
  banners: readonly BannerState[]
  onDismiss(id: BannerId): void
}

/** Persistent messages. The text label carries the meaning, not only the color. */
export function Banners({ banners, onDismiss }: Props) {
  if (banners.length === 0) return null
  return (
    <div className="banners">
      {banners.map((b) => (
        <div key={b.id} className={`banner ${b.kind}`} role={b.kind === 'error' ? 'alert' : 'status'}>
          <span>
            <strong>{b.kind === 'error' ? '⚠ Error:' : 'ℹ Notice:'}</strong> {b.message}
          </span>
          <button type="button" aria-label={`Dismiss: ${b.message}`} onClick={() => onDismiss(b.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
