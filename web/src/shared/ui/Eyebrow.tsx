/**
 * Small section label with a short yellow "point" bar — the recurring Service
 * OS section marker. Sits above a heading to give sections a consistent,
 * branded rhythm instead of bare H3s. `onAccent` variant is for use on the
 * filled-blue primary panel.
 */
export function Eyebrow({ label, tone = 'default' }: { label: string; tone?: 'default' | 'onAccent' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-[0.1875rem] w-6 rounded-full bg-[var(--color-point)]" aria-hidden />
      <span
        className={`text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${
          tone === 'onAccent' ? 'text-white/85' : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {label}
      </span>
    </span>
  )
}
