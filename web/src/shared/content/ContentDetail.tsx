import type { ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { List, ListItem } from '@astryxdesign/core/List'
import { Divider } from '@astryxdesign/core/Divider'
import type { Attachment } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Shared detail layout for announcements, lectures, and FAQ answers
 * (shared-ui.md "공통 상세 패턴"): title, a metadata row, body text, optional
 * attachments, and a CTA area. Knows no domain schema.
 */
export function ContentDetail({
  title,
  meta,
  body,
  attachments = [],
  actions,
}: {
  title: string
  meta?: ReactNode
  body: string
  attachments?: Attachment[]
  actions?: ReactNode
}) {
  const paragraphs = body.split('\n').filter((line) => line.trim().length > 0)

  return (
    <VStack gap={4}>
      <VStack gap={2}>
        <Heading level={1}>{title}</Heading>
        {meta}
      </VStack>

      <Divider />

      <VStack gap={3}>
        {paragraphs.map((p, i) => (
          <Text key={i} type="body">
            {p}
          </Text>
        ))}
      </VStack>

      {attachments.length > 0 && (
        <VStack gap={2}>
          <Heading level={4}>첨부 파일</Heading>
          <List hasDividers>
            {attachments.map((f) => (
              <ListItem
                key={f.fileId}
                label={f.name}
                href={f.url}
                description={formatSize(f.size)}
              />
            ))}
          </List>
        </VStack>
      )}

      {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
    </VStack>
  )
}
