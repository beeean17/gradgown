/**
 * One choice in a grid of a few: a gown size, a time slot, a grade, a mentor.
 * A pressed button rather than a radio so the whole tile is the target and
 * the selected state reads at a glance. `isDisabled` keeps the tile visible —
 * the student should see what they can no longer pick and why (`note`).
 */
export function ChoiceTile({
  isSelected,
  isDisabled = false,
  onSelect,
  title,
  note,
  align = 'center',
}: {
  isSelected: boolean
  isDisabled?: boolean
  onSelect: () => void
  title: string
  note?: string
  align?: 'center' | 'start'
}) {
  // One low row, the same selection language as the reservation's size and time
  // boxes: soft corners, an accent border and tint when chosen. A note sits at
  // the end of the line rather than under the title.
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isDisabled}
      aria-pressed={isSelected}
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-inner)] border px-3.5 py-2 transition-colors disabled:cursor-not-allowed ${
        align === 'start' ? 'justify-between text-left' : 'justify-center text-center'
      } ${
        isDisabled
          ? 'border-dashed border-[var(--color-border)] opacity-45'
          : isSelected
            ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]'
            : 'border-[var(--color-border)] bg-[var(--color-background-muted)] hover:border-[var(--color-border-emphasized)]'
      }`}
    >
      <span
        className={`min-w-0 text-[0.95rem] font-semibold text-pretty ${
          isDisabled ? 'text-[var(--color-text-disabled)]' : isSelected ? 'text-[var(--color-text-accent)]' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {title}
      </span>
      {note && (
        <span className={`shrink-0 text-xs ${isDisabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-secondary)]'}`}>
          {note}
        </span>
      )}
    </button>
  )
}
