import type { ReactNode } from 'react'
import { Table } from '@astryxdesign/core/Table'
import { VStack } from '@astryxdesign/core/Stack'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { useIsDesktop } from '../hooks/useMediaQuery'

export interface DataColumn<T> {
  key: string
  header: string
  align?: 'start' | 'center' | 'end'
  renderCell: (item: T) => ReactNode
}

/**
 * Responsive admin data view: a Table on desktop, a stack of cards on mobile
 * (per shared-ui.md — DataTable.desktop / DataCards.mobile). Feature code
 * supplies the columns and the mobile card renderer; the switch is here.
 */
export function DataView<T>({
  data,
  columns,
  idKey,
  renderCard,
  emptyTitle = '항목이 없어요',
  emptyDescription,
}: {
  data: T[]
  columns: DataColumn<T>[]
  idKey: (item: T) => string
  renderCard: (item: T) => ReactNode
  emptyTitle?: string
  emptyDescription?: string
}) {
  const isDesktop = useIsDesktop()

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  if (!isDesktop) {
    return (
      <VStack gap={3}>
        {data.map((item) => (
          <div key={idKey(item)}>{renderCard(item)}</div>
        ))}
      </VStack>
    )
  }

  // Table constrains its row type to Record<string, unknown>; domain models
  // don't carry an index signature, so bridge it with a local cast here rather
  // than forcing every entity type to add one.
  type Row = Record<string, unknown>
  return (
    <Table
      data={data as unknown as Row[]}
      idKey={idKey as unknown as (item: Row) => string}
      hasHover
      columns={columns.map((c) => ({
        key: c.key,
        header: c.header,
        align: c.align,
        renderCell: (item: Row) => c.renderCell(item as unknown as T),
      }))}
    />
  )
}
