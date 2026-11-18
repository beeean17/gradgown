import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Divider } from '@astryxdesign/core/Divider'
import { Eyebrow } from './Eyebrow'

/**
 * A grouped surface: eyebrow + title header, a divider, then body content.
 * Replaces free-floating lists/sections with a single contained surface so the
 * page reads as composed panels (Service OS), not stacked cards. Use
 * `flush` for edge-to-edge content like divided Lists.
 */
export function Panel({
  eyebrow,
  title,
  action,
  children,
  flush = false,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  children: ReactNode
  flush?: boolean
}) {
  return (
    <Card padding={0}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <VStack gap={1}>
          {eyebrow && <Eyebrow label={eyebrow} />}
          <Heading level={3}>{title}</Heading>
        </VStack>
        {action}
      </div>
      <Divider />
      <div className={flush ? 'px-2 py-1' : 'px-5 py-4'}>{children}</div>
    </Card>
  )
}
