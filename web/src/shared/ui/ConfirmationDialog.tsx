import { useId } from 'react'
import type { ButtonVariant } from '@astryxdesign/core/Button'
import { Dialog, type DialogPurpose } from '@astryxdesign/core/Dialog'
import { Heading } from '@astryxdesign/core/Heading'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { PairedActions } from './PairedActions'

export function ConfirmationDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel = '취소',
  actionVariant = 'primary',
  purpose = 'form',
  isActionLoading,
  onCancel,
  onAction,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description: string
  actionLabel: string
  cancelLabel?: string
  actionVariant?: ButtonVariant
  purpose?: DialogPurpose
  isActionLoading?: boolean
  onCancel?: () => void
  onAction: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose={purpose}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <VStack gap={5} padding={5}>
        <VStack gap={2}>
          <Heading level={2} id={titleId}>
            {title}
          </Heading>
          <Text type="body" color="secondary" id={descriptionId}>
            {description}
          </Text>
        </VStack>

        <PairedActions
          leading={{
            label: cancelLabel,
            variant: 'secondary',
            onClick: onCancel ?? (() => onOpenChange(false)),
          }}
          trailing={{
            label: actionLabel,
            variant: actionVariant,
            isLoading: isActionLoading,
            onClick: onAction,
          }}
        />
      </VStack>
    </Dialog>
  )
}
