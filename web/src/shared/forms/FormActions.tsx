import { Button } from '@astryxdesign/core/Button'

/**
 * Form action row. On mobile the primary action is full-width and the row is
 * sticky to the bottom of the viewport (per mobile UX guidance); on desktop it
 * right-aligns. Keep the primary action's position predictable.
 */
export function FormActions({
  primaryLabel,
  onPrimary,
  isPrimaryLoading,
  isPrimaryDisabled,
  secondaryLabel,
  onSecondary,
  sticky = false,
}: {
  primaryLabel: string
  onPrimary: () => void | Promise<void>
  isPrimaryLoading?: boolean
  isPrimaryDisabled?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
  sticky?: boolean
}) {
  return (
    <div
      className={[
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        sticky
          ? 'sticky bottom-0 -mx-4 border-t border-[var(--color-border)] bg-[var(--color-background-body)] px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0'
          : '',
      ].join(' ')}
    >
      {secondaryLabel && (
        <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
          <Button label={secondaryLabel} variant="secondary" onClick={onSecondary} />
        </div>
      )}
      <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
        <Button
          label={primaryLabel}
          variant="primary"
          clickAction={onPrimary}
          isLoading={isPrimaryLoading}
          isDisabled={isPrimaryDisabled}
        />
      </div>
    </div>
  )
}
