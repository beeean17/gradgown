import type { ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'

/** A titled group of fields within a form. */
export function FormSection({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <VStack gap={3} as="section">
      {(title || description) && (
        <VStack gap={0.5}>
          {title && <Heading level={3}>{title}</Heading>}
          {description && (
            <Text type="supporting" color="secondary">
              {description}
            </Text>
          )}
        </VStack>
      )}
      <VStack gap={4}>{children}</VStack>
    </VStack>
  )
}
