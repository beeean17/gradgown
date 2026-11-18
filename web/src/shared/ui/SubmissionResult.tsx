import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'

/**
 * Completion card shown after a reservation/registration is saved AND
 * confirmed (design-direction.md prefers a result card over a toast). Only
 * render this once the confirmation read has succeeded.
 */
export function SubmissionResult({
  tone = 'success',
  title,
  description,
  items = [],
  actions,
}: {
  tone?: 'success' | 'error' | 'warning'
  title: string
  description?: string
  items?: { label: string; value: ReactNode }[]
  actions?: ReactNode
}) {
  return (
    <Card padding={5} elevation="low" className="gx-pop">
      <VStack gap={4}>
        <VStack gap={2}>
          <div className="flex items-center gap-2">
            <StatusDot variant={tone} label={title} />
            <Heading level={2}>{title}</Heading>
          </div>
          {description && (
            <Text type="body" color="secondary">
              {description}
            </Text>
          )}
        </VStack>

        {items.length > 0 && (
          <MetadataList label={{ position: 'start', width: 96 }}>
            {items.map((it) => (
              <MetadataListItem key={it.label} label={it.label}>
                {it.value}
              </MetadataListItem>
            ))}
          </MetadataList>
        )}

        {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
      </VStack>
    </Card>
  )
}
