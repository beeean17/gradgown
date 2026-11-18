import type { ReactNode } from 'react'
import { VStack, HStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Link } from '@astryxdesign/core/Link'
import { PointBar } from './PointBar'

/**
 * Standard page header: optional back link, title, description, and end-aligned
 * actions (e.g. primary button, export). Actions wrap below the title on narrow
 * viewports.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: string
  actions?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <VStack gap={2}>
      {back && (
        <Link href={back.href} isStandalone>
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <VStack gap={2}>
          <PointBar />
          <Heading level={1}>{title}</Heading>
          {description && (
            <Text type="body" color="secondary">
              {description}
            </Text>
          )}
        </VStack>
        {actions && <HStack gap={2}>{actions}</HStack>}
      </div>
    </VStack>
  )
}
