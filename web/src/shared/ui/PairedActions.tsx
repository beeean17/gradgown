import { Button, type ButtonVariant } from '@astryxdesign/core/Button'
import { HStack, StackItem } from '@astryxdesign/core/Stack'

export interface PairedAction {
  label: string
  variant: ButtonVariant
  onClick: () => void
  isDisabled?: boolean
  isLoading?: boolean
  /**
   * Red text on a quiet button: an action that undoes something (예약 취소)
   * but is not the one the screen leads with. Use with variant 'ghost'.
   */
  tone?: 'danger'
}

const DANGER_TEXT = '!text-[var(--color-text-red)]'

/** The shared two-action treatment used by dialogs and reservation forms. */
export function PairedActions({
  leading,
  trailing,
}: {
  leading: PairedAction
  trailing: PairedAction
}) {
  return (
    <HStack gap={2} width="100%">
      <StackItem size="fill" className="basis-0">
        <Button
          label={leading.label}
          variant={leading.variant}
          size="lg"
          width="100%"
          isDisabled={leading.isDisabled}
          isLoading={leading.isLoading}
          onClick={leading.onClick}
          className={leading.tone === 'danger' ? DANGER_TEXT : undefined}
        />
      </StackItem>
      <StackItem size="fill" className="basis-0">
        <Button
          label={trailing.label}
          variant={trailing.variant}
          size="lg"
          width="100%"
          isDisabled={trailing.isDisabled}
          isLoading={trailing.isLoading}
          onClick={trailing.onClick}
          className={trailing.tone === 'danger' ? DANGER_TEXT : undefined}
        />
      </StackItem>
    </HStack>
  )
}
